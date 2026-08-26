"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/esports/supabase-client";
import {
  myBlockedIDs,
  myProfile,
  signInWithAppleIdToken,
  signOut as serviceSignOut,
} from "@/lib/esports/rating-service";
import { runAppleSignIn, AppleSignInCancelled } from "@/lib/esports/apple-signin";
import type { ProfileRow } from "@/lib/esports/types";

// 電競評分的登入狀態（Supabase session）。
// - uid 轉換（登入/登出/換帳號）以 generation 柵欄：每個非同步發佈前
//   都要再確認世代沒變，舊帳號的回應絕不能滲進新帳號的畫面
// - 帳號資料（profile、封鎖清單）跟著 uid 生命周期載入與清空
// - 多分頁：supabase-js 透過 storage 事件廣播 auth 變化，同一條轉換
//   路徑處理
// - 憑證撤銷：網頁沒有 iOS 的 getCredentialState；Supabase session 的
//   有效性就是事實來源（帳號被刪 → 下次刷新失敗 → 自動登出）

interface EsportsSession {
  status: "loading" | "signedOut" | "signedIn";
  uid: string | null;
  /** uid 轉換的世代（非同步發佈的柵欄） */
  generation: number;
  profile: ProfileRow | null;
  blockedIDs: Set<string>;
  signInWithApple(): Promise<boolean>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  /**
   * 樂觀維護封鎖清單（真正的寫入在 rating-service；這裡只同步 context）。
   * forUID＝發起動作時捕捉的 uid：await 回來時帳號已換人就靜默丟棄，
   * 舊帳號的解除封鎖絕不能關掉新帳號的安全過濾。
   */
  setBlockedLocally(targetID: string, blocked: boolean, forUID: string): void;
}

const EsportsAuthContext = createContext<EsportsSession | null>(null);

export function useEsportsSession(): EsportsSession {
  const session = useContext(EsportsAuthContext);
  if (!session) throw new Error("useEsportsSession 必須在 EsportsAuthProvider 內使用");
  return session;
}

export default function EsportsAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "signedOut" | "signedIn">("loading");
  const [uid, setUID] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [blockedIDs, setBlockedIDs] = useState<Set<string>>(new Set());
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);
  // 目前 uid 的 ref 鏡像（給 setBlockedLocally 的所有權檢查用）
  const uidRef = useRef<string | null>(null);

  /** uid 轉換的唯一入口：清空帳號資料、換世代、重載 */
  const applyUID = useCallback((nextUID: string | null) => {
    generationRef.current += 1;
    const myGeneration = generationRef.current;
    uidRef.current = nextUID;
    setGeneration(myGeneration);
    setUID(nextUID);
    setProfile(null);
    setBlockedIDs(new Set());
    setStatus(nextUID ? "signedIn" : "signedOut");

    if (!nextUID) return;
    void (async () => {
      try {
        const [profileRow, blocked] = await Promise.all([
          myProfile(nextUID),
          myBlockedIDs(),
        ]);
        if (generationRef.current !== myGeneration) return;
        setProfile(profileRow);
        setBlockedIDs(new Set(blocked));
      } catch {
        // 讀取失敗不清空（可能只是網路）；下一次互動會再試
      }
    })();
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let lastUID: string | null | undefined;

    void supabase.auth.getSession().then(({ data }) => {
      lastUID = data.session?.user.id ?? null;
      applyUID(lastUID);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUID = session?.user.id ?? null;
      // 只在 uid 真的變了才轉換（token 刷新等事件不動狀態）
      if (nextUID !== lastUID) {
        lastUID = nextUID;
        applyUID(nextUID);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [applyUID]);

  const signInWithApple = useCallback(async (): Promise<boolean> => {
    try {
      const { idToken, rawNonce } = await runAppleSignIn();
      await signInWithAppleIdToken(idToken, rawNonce);
      // onAuthStateChange 會接手 applyUID
      return true;
    } catch (error) {
      if (error instanceof AppleSignInCancelled) return false;
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await serviceSignOut();
    // onAuthStateChange 會清空；保險起見本地也轉換
    applyUID(null);
  }, [applyUID]);

  const refreshProfile = useCallback(async () => {
    if (!uid) return;
    const myGeneration = generationRef.current;
    try {
      const profileRow = await myProfile(uid);
      if (generationRef.current === myGeneration) setProfile(profileRow);
    } catch {
      // 保留現值
    }
  }, [uid]);

  const setBlockedLocally = useCallback(
    (targetID: string, blocked: boolean, forUID: string) => {
      // 所有權檢查：發起動作的帳號已不是目前帳號 → 靜默丟棄
      if (uidRef.current !== forUID) return;
      setBlockedIDs((previous) => {
        const next = new Set(previous);
        if (blocked) next.add(targetID);
        else next.delete(targetID);
        return next;
      });
    },
    []
  );

  return (
    <EsportsAuthContext.Provider
      value={{
        status,
        uid,
        generation,
        profile,
        blockedIDs,
        signInWithApple,
        signOut,
        refreshProfile,
        setBlockedLocally,
      }}
    >
      {children}
    </EsportsAuthContext.Provider>
  );
}
