"use client";

import { isAuthError, isAuthSessionMissingError, type Session } from "@supabase/supabase-js";
import { getAuthVerifier, getSupabase } from "./supabase-client";

// 所有顯式的登入、登出都走這道閘門。登出要等伺服器回應之後 SDK 才清儲存，
// 這段 await 期間不能讓新的登入落地。同一個分頁用 promise 串起來排隊，
// 跨分頁靠 Web Locks 排同樣的順序。
let mutationTail: Promise<unknown> = Promise.resolve();

export function withAuthMutation<T>(action: () => Promise<T>): Promise<T> {
  const result = mutationTail.then(async (): Promise<T> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request("dailyval-auth-session", action);
    }
    return action();
  });
  mutationTail = result.catch(() => {});
  return result;
}

/** 登出沒有把這個瀏覽器的 session 清掉。message 可以直接顯示給使用者；原因在 reason。 */
export class SignOutFailedError extends Error {
  constructor(readonly reason: unknown) {
    super("登出失敗，請確認網路後再試一次");
    this.name = "SignOutFailedError";
  }
}

async function signOutLocal(): Promise<void> {
  // 絕對不能用預設的 global scope：那會把 iOS app 的 session 一起撤銷。
  //
  // SDK 用回傳值報錯、不 throw。撤銷請求失敗（網路、5xx）時它仍會清掉本地
  // session 並發 SIGNED_OUT，畫面照樣登出；唯一的例外是 session 本身載入
  // 失敗（離線且 access token 已真正過期），那時本地什麼都沒清、事件也不會
  // 發。所以拿到錯誤後再讀一次 session：還讀得到、或根本讀不到，都代表這個
  // 瀏覽器還沒登出，必須讓畫面知道，不能安靜地當作成功。
  const auth = getSupabase().auth;
  let error: unknown;
  try {
    ({ error } = await auth.signOut({ scope: "local" }));
  } catch (thrown) {
    error = thrown;
  }
  if (!error) return;
  const cleared = await auth.getSession().then(
    ({ data, error: loadError }) => !data.session && !loadError,
    () => false
  );
  if (!cleared) throw new SignOutFailedError(error);
}

export function signOutCurrentSession(): Promise<void> {
  return withAuthMutation(signOutLocal);
}

export function signInWithPassword(email: string, password: string) {
  return withAuthMutation(() => getSupabase().auth.signInWithPassword({ email, password }));
}

function isEndedSession(error: unknown): boolean {
  if (!isAuthError(error) || (error.status && (error.status >= 500 || error.status === 429))) {
    return false;
  }
  return isAuthSessionMissingError(error) || [
    "session_not_found",
    "session_expired",
    "refresh_token_not_found",
    "refresh_token_already_used",
    "user_not_found",
  ].includes(error.code ?? "");
}

type RequestSession = Pick<Session, "access_token" | "user">;
export type RejectedSessionState = "active" | "expired" | "changed" | "unavailable";

function sameSession(current: Session, request: RequestSession): boolean {
  // 只比 uid 分不出「同一個帳號重新登入」和「刷新後的新 token 取代了被拒的
  // 那一個」，所以 access token 也要相同才算同一個 session。
  return current.user.id === request.user.id && current.access_token === request.access_token;
}

/** 診斷後台的 404：分辨 session 是真的結束了，還是 Auth 服務暫時有問題。後者不能當成登出。 */
export async function checkRejectedSession(request: RequestSession): Promise<RejectedSessionState> {
  let ended = false;
  try {
    // getUser 遇到 session_not_found 會順手清掉它那顆 client 的 session。
    // 用無狀態的 verifier 來問，就算回應來得晚也動不到共用 client 上更新的登入。
    const { data, error } = await getAuthVerifier().auth.getUser(request.access_token);
    if (!error && data.user?.id === request.user.id) return "active";
    ended = isEndedSession(error);
  } catch (error) {
    ended = isEndedSession(error);
  }
  if (!ended) return "unavailable";

  return withAuthMutation(async () => {
    try {
      const { data, error } = await getSupabase().auth.getSession();
      if (error) return isEndedSession(error) ? "expired" : "unavailable";
      if (!data.session) return "expired";
      if (!sameSession(data.session, request)) return "changed";
      // 這個 session 已經確定結束，診斷結果不因本地清不清得掉而改變。清不掉
      // （離線且 token 已過期）時畫面會停在登入狀態；那是登出按鈕要報的事。
      await signOutLocal().catch(() => {});
      return "expired";
    } catch (error) {
      return isEndedSession(error) ? "expired" : "unavailable";
    }
  });
}
