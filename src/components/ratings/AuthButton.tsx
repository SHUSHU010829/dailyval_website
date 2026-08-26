"use client";

import { useTranslations } from "next-intl";
import { useCloudKitSession } from "@/components/ratings/CloudKitProvider";
import { SKIN_WRITES_ENABLED } from "@/lib/ratings/flags";

// 評分區的登入狀態列：未登入顯示 Apple 登入鈕，已登入顯示
// Riot 名稱（App 裡連結過才有）與登出。

export default function AuthButton() {
  const t = useTranslations("ratings.auth");
  const session = useCloudKitSession();

  // CloudKit 登入只服務造型的寫入；寫入未開放時不顯示
  if (!SKIN_WRITES_ENABLED) return null;

  if (session.status === "loading" || session.status === "unavailable") {
    // 設定缺漏（本機開發沒 token）或還在初始化：不佔版面
    return null;
  }

  if (session.status === "signedOut") {
    return (
      <button
        type="button"
        onClick={session.signIn}
        className="cut-sm border border-border-bright bg-bg-elevated px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red"
      >
        {t("signIn")}
      </button>
    );
  }

  const displayName = session.profile?.gameName
    ? `${session.profile.gameName}${session.profile.tagLine ? `#${session.profile.tagLine}` : ""}`
    : t("signedIn");

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[12rem] truncate font-ui text-xs font-bold tracking-wide text-text-2">
        {displayName}
      </span>
      <button
        type="button"
        onClick={session.signOut}
        className="font-ui text-xs uppercase tracking-widest text-text-3 underline-offset-4 transition-colors hover:text-text-1 hover:underline"
      >
        {t("signOut")}
      </button>
    </div>
  );
}
