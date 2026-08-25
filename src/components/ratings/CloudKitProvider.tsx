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
import {
  getCloudKitContainer,
  getPublicDatabase,
  type CKJSRecord,
} from "@/lib/ratings/cloudkit-js";
import type { UsersProfile } from "@/lib/cloudkit/types";

// CloudKit 登入狀態（評分區共用）。
// 只掛在 /ratings 區段的 layout，cloudkit.js 不進行銷頁的 bundle。
// 與 dailyval_social 的差異：不搞 DOM data bus、不做 XOR localStorage，
// session 交給 CloudKit JS 自己的 persist cookie。

export type CloudKitStatus = "loading" | "unavailable" | "signedOut" | "signedIn";

interface CloudKitSession {
  status: CloudKitStatus;
  userRecordName: string | null;
  /** Users record 的快照；沒用過 App 的帳號可能整筆不存在（null） */
  profile: UsersProfile | null;
  /** 已登入且 Riot ID 已在 App 裡連結（留言/按讚的 gate） */
  canComment: boolean;
  signIn(): void;
  signOut(): void;
}

const CloudKitContext = createContext<CloudKitSession | null>(null);

export function useCloudKitSession(): CloudKitSession {
  const session = useContext(CloudKitContext);
  if (!session) throw new Error("useCloudKitSession 必須在 CloudKitProvider 內使用");
  return session;
}

function decodeProfile(record: CKJSRecord): UsersProfile {
  const field = (name: string) => record.fields?.[name]?.value;
  const str = (name: string) => (typeof field(name) === "string" ? (field(name) as string) : "");
  const flag = (name: string) => field(name) === 1 || field(name) === true;
  return {
    riotID: str("riotID") || null,
    gameName: str("gameName"),
    tagLine: str("tagLine"),
    userImage: str("userImage"),
    rankTier: typeof field("rankTier") === "number" ? (field("rankTier") as number) : 0,
    isVerify: flag("isVerify"),
    isPremium: flag("isPremium"),
    isBanned: flag("isBanned"),
  };
}

/** 點擊代理：觸發 CloudKit JS 渲染在隱藏掛載點裡的 Apple 按鈕 */
function clickHiddenButton(mountID: string) {
  const target =
    document.querySelector(`#${mountID} button`) ??
    document.querySelector(`#${mountID} div`) ??
    document.querySelector(`#${mountID} *`);
  if (target instanceof HTMLElement) target.click();
}

export default function CloudKitProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CloudKitStatus>("loading");
  const [userRecordName, setUserRecordName] = useState<string | null>(null);
  const [profile, setProfile] = useState<UsersProfile | null>(null);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (recordName: string) => {
    try {
      const response = await getPublicDatabase().fetchRecords([recordName]);
      const record = response.records?.[0];
      // 查無 Users record（帳號沒用過 App）不是錯誤；profile 維持 null
      if (!response.hasErrors && record?.fields) {
        if (mounted.current) setProfile(decodeProfile(record));
      }
    } catch {
      // profile 抓不到就先當沒有 Riot ID；重新整理可重試
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    let cancelled = false;
    (async () => {
      try {
        const container = await getCloudKitContainer();
        if (cancelled) return;

        const applyIdentity = (identity: { userRecordName: string } | null) => {
          if (cancelled) return;
          if (identity) {
            setUserRecordName(identity.userRecordName);
            setStatus("signedIn");
            void loadProfile(identity.userRecordName);
          } else {
            setUserRecordName(null);
            setProfile(null);
            setStatus("signedOut");
          }
        };

        // 登入/登出事件要輪流 re-arm（CloudKit JS 的 promise 只解一次）
        const armSignIn = () => {
          container
            .whenUserSignsIn()
            .then((identity) => {
              applyIdentity(identity);
              armSignOut();
            })
            .catch(() => {});
        };
        const armSignOut = () => {
          container
            .whenUserSignsOut()
            .then(() => {
              applyIdentity(null);
              armSignIn();
            })
            .catch(() => {});
        };

        const initial = await container.setUpAuth();
        applyIdentity(initial);
        if (initial) armSignOut();
        else armSignIn();
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始化一次；watch 迴圈自我維護
  }, []);

  const session: CloudKitSession = {
    status,
    userRecordName,
    profile,
    canComment: status === "signedIn" && Boolean(profile?.riotID) && !profile?.isBanned,
    signIn: () => clickHiddenButton("apple-sign-in-button"),
    signOut: () => clickHiddenButton("apple-sign-out-button"),
  };

  return (
    <CloudKitContext.Provider value={session}>
      {/* CloudKit JS 的隱藏掛載點（Apple 的按鈕渲染在這裡，由上面的代理點擊） */}
      <div id="apple-sign-in-button" className="absolute h-0 w-0 overflow-hidden opacity-0" />
      <div id="apple-sign-out-button" className="absolute h-0 w-0 overflow-hidden opacity-0" />
      {children}
    </CloudKitContext.Provider>
  );
}
