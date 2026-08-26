"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import HudModal from "@/components/esports/HudModal";
import ProfileEditor from "@/components/esports/ProfileEditor";
import BlockedUsersList from "@/components/esports/BlockedUsersList";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import { playerCardSmallArtURL } from "@/lib/esports/constants";

// 電競區的登入入口／帳號選單。
// 未登入：pitch dialog + Continue with Apple；已登入：顯示名稱＋頭像，
// 點開帳號面板（個人資料編輯、封鎖名單、登出）。

export default function AccountControls() {
  const t = useTranslations("esports.auth");
  const session = useEsportsSession();
  const [dialog, setDialog] = useState<"none" | "signIn" | "account">("none");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);

  if (session.status === "loading") return null;

  async function handleSignIn() {
    setSigningIn(true);
    setSignInError(false);
    try {
      const completed = await session.signInWithApple();
      if (completed) setDialog("none");
    } catch {
      setSignInError(true);
    } finally {
      setSigningIn(false);
    }
  }

  if (session.status === "signedOut") {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialog("signIn")}
          className="cut-sm border border-border-bright bg-bg-elevated px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red"
        >
          {t("signIn")}
        </button>

        <HudModal
          open={dialog === "signIn"}
          onClose={() => setDialog("none")}
          title={t("pitchTitle")}
        >
          <p className="font-body text-sm text-text-2">{t("pitchBody")}</p>
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleSignIn()}
            className="cut-sm mt-5 w-full bg-text-1 px-5 py-3 font-ui text-sm font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-90 disabled:opacity-60"
          >
            {signingIn ? t("signingIn") : t("continueWithApple")}
          </button>
          {signInError && (
            <p role="alert" className="mt-3 font-ui text-xs text-val-red">
              {t("failed")}
            </p>
          )}
          <p className="mt-4 font-ui text-xs text-text-3">{t("privacyNote")}</p>
        </HudModal>
      </>
    );
  }

  const displayName = session.profile?.display_name ?? t("account");
  const avatarURL = session.profile?.avatar_card_id
    ? playerCardSmallArtURL(session.profile.avatar_card_id)
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog("account")}
        className="flex items-center gap-2 rounded-none border border-border-med bg-bg-elevated px-3 py-1.5 transition-colors hover:border-border-bright"
      >
        <span className="h-6 w-6 overflow-hidden rounded-sm bg-bg-panel">
          {avatarURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarURL} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="max-w-[9rem] truncate font-ui text-xs font-bold tracking-wide text-text-1">
          {displayName}
        </span>
      </button>

      <HudModal
        open={dialog === "account"}
        onClose={() => setDialog("none")}
        title={t("account")}
      >
        <div className="space-y-8">
          <ProfileEditor />
          <BlockedUsersList />
          <button
            type="button"
            onClick={() => {
              void session.signOut();
              setDialog("none");
            }}
            className="font-ui text-xs uppercase tracking-widest text-text-3 underline-offset-4 transition-colors hover:text-val-red hover:underline"
          >
            {t("signOut")}
          </button>
        </div>
      </HudModal>
    </>
  );
}
