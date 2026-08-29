"use client";

import { useTranslations } from "next-intl";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";

// 評分區的登入狀態列：未登入顯示 Apple 登入鈕，已登入顯示
// 顯示名稱（可在電競區編輯）與登出。

export default function AuthButton() {
  const t = useTranslations("ratings.auth");
  const session = useEsportsSession();

  if (session.status === "loading") {
    // 還在初始化：不佔版面
    return null;
  }

  if (session.status === "signedOut") {
    return (
      <button
        type="button"
        onClick={() => void session.signInWithApple()}
        className="cut-sm border border-border-bright bg-bg-elevated px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red"
      >
        {t("signIn")}
      </button>
    );
  }

  const displayName = session.profile?.display_name || t("signedIn");

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[12rem] truncate font-ui text-xs font-bold tracking-wide text-text-2">
        {displayName}
      </span>
      <button
        type="button"
        onClick={() => void session.signOut()}
        className="font-ui text-xs uppercase tracking-widest text-text-3 underline-offset-4 transition-colors hover:text-text-1 hover:underline"
      >
        {t("signOut")}
      </button>
    </div>
  );
}
