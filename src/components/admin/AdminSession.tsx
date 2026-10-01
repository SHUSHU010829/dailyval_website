"use client";

// 後台頁面共用的登入殼：目前的 uid、Apple 登入、登出、本機密碼登入。
// 這裡不判斷任何權限——誰能做什麼，由各頁面打 API 之後看伺服器怎麼回。

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/esports/supabase-client";
import { SUPABASE_URL } from "@/lib/esports/constants";
import { runAppleSignIn, AppleSignInCancelled } from "@/lib/esports/apple-signin";
import { signInWithAppleIdToken } from "@/lib/esports/rating-service";
import { button, input } from "./styles";

// 只有當網站指向本機 Supabase 時才成立。正式站是 https://api.dailyval.com，
// 所以密碼登入的分支在正式環境永遠走不到。
export const LOCAL_DEV =
  SUPABASE_URL.startsWith("http://127.0.0.1") || SUPABASE_URL.startsWith("http://localhost");

export function useAdminSession() {
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setUid(data.session?.user.id ?? null);
        setReady(true);
      });
    const { data: sub } = getSupabase().auth.onAuthStateChange((_e, session) => {
      setUid(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    try {
      const { idToken, rawNonce } = await runAppleSignIn();
      const state = await signInWithAppleIdToken(idToken, rawNonce);
      setUid(state.uid);
    } catch (err) {
      if (err instanceof AppleSignInCancelled) return;
      setNotice(err instanceof Error ? err.message : "登入失敗");
    }
  }, []);

  const signOut = useCallback(() => {
    void getSupabase().auth.signOut();
  }, []);

  return { uid, ready, notice, setNotice, signIn, signOut };
}

export function AdminSignIn({
  title,
  onSignIn,
  notice,
  onError,
}: {
  title: string;
  onSignIn: () => void;
  notice: string | null;
  onError: (m: string) => void;
}) {
  return (
    <div className="p-8 max-w-md">
      <h1 className="text-xl font-[family-name:var(--font-display)] mb-4">{title}</h1>
      <button className={button} onClick={onSignIn}>
        使用 Apple 登入
      </button>
      {/* 指到哪個後端要看得見。本機測試最容易的壞法就是 .env.local 沒生效、
          於是安靜地連上正式庫，而症狀是「登入了卻什麼都沒有」。 */}
      <p className="mt-3 text-xs opacity-50">後端：{SUPABASE_URL}</p>
      {LOCAL_DEV && <LocalSignIn onError={onError} />}
      {notice && <p className="mt-3 text-sm text-[var(--val-red)]">{notice}</p>}
    </div>
  );
}

/** 本機用的密碼登入。帳號密碼由 scripts/seed-admin-local.mjs 建立。 */
export function LocalSignIn({ onError }: { onError: (m: string) => void }) {
  const [email, setEmail] = useState("admin@example.test");
  const [password, setPassword] = useState("local-admin-pw-123");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) onError(`本機登入失敗：${error.message}`);
  }

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border-dim)] space-y-2">
      <p className="text-xs opacity-60">本機環境。帳密由 seed-admin-local.mjs 建立。</p>
      <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className={input}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className={button} disabled={busy} onClick={() => void go()}>
        本機登入
      </button>
    </div>
  );
}
