"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import { authorProfile } from "@/lib/community/service";
import type { AuthorProfile } from "@/lib/community/types";

// 社群板的登入狀態。登入本身（Supabase session、Apple 登入、世代柵欄）完全
// 沿用官網的 EsportsAuthProvider——社群板與電競評分、造型評分是同一個登入。
// 這裡只多載入 social.author_profile(uid)：名字、tag、段位、徽章。
//
// 沒有列（從未用過 App 的 Apple 帳號）或沒有名字時 canPost 為 false：伺服器
// 接受這種帳號發文，但署名會是空的，所以畫面要求先在 App 綁定 Riot ID。

export type ProfileStatus = "idle" | "loading" | "ready" | "error";

interface CommunitySession {
  status: "loading" | "signedOut" | "signedIn";
  uid: string | null;
  /** uid 轉換的世代（非同步發佈的柵欄） */
  generation: number;
  profile: AuthorProfile | null;
  /** error：讀取失敗，不代表沒有帳號；畫面給重試而不是叫人去綁定 */
  profileStatus: ProfileStatus;
  /** 已登入而且有可用的署名 */
  canPost: boolean;
  /** 回傳 false 代表使用者自己關掉 popup */
  signInWithApple(): Promise<boolean>;
  signOut(): Promise<void>;
  refreshProfile(): void;
}

const CommunitySessionContext = createContext<CommunitySession | null>(null);

export function useCommunitySession(): CommunitySession {
  const session = useContext(CommunitySessionContext);
  if (!session) {
    throw new Error(
      "useCommunitySession 必須在 CommunitySessionProvider 內使用",
    );
  }
  return session;
}

interface LoadedProfile {
  generation: number;
  profile: AuthorProfile | null;
  failed: boolean;
}

export default function CommunitySessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { status, uid, generation, signInWithApple, signOut } =
    useEsportsSession();
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // 載入結果記著它屬於哪一個世代；世代一換，舊結果自然不算數，不需要在
  // effect 裡同步清空
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    authorProfile(uid)
      .then((profile) => {
        if (!cancelled) setLoaded({ generation, profile, failed: false });
      })
      .catch(() => {
        // 讀取失敗不當成「沒有帳號」：那會讓人被叫去 App 綁定一個其實已經綁好的帳號
        if (!cancelled) setLoaded({ generation, profile: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, generation, reloadTick]);

  const refreshProfile = useCallback(() => {
    setLoaded(null);
    setReloadTick((tick) => tick + 1);
  }, []);

  const current = loaded && loaded.generation === generation ? loaded : null;
  const profile = uid ? (current?.profile ?? null) : null;
  const profileStatus: ProfileStatus = !uid
    ? "idle"
    : !current
      ? "loading"
      : current.failed
        ? "error"
        : "ready";

  const value = useMemo<CommunitySession>(
    () => ({
      status,
      uid,
      generation,
      profile,
      profileStatus,
      canPost:
        status === "signedIn" &&
        profileStatus === "ready" &&
        Boolean(profile?.displayName),
      signInWithApple,
      signOut,
      refreshProfile,
    }),
    [
      status,
      uid,
      generation,
      profile,
      profileStatus,
      signInWithApple,
      signOut,
      refreshProfile,
    ],
  );

  return (
    <CommunitySessionContext.Provider value={value}>
      {children}
    </CommunitySessionContext.Provider>
  );
}
