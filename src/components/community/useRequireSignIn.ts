"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";

/**
 * 需要登入才能做的動作（按讚、留言、發文、檢舉…）的共用入口。
 * 回傳目前的 uid；沒登入時提示請先登入並回傳 null，呼叫端直接中止。
 * uid 要在「互動當下」抓住，之後換人由伺服器以 uid_mismatch 擋下。
 */
export function useRequireSignIn(): () => string | null {
  const t = useTranslations("communityBoard.errors");
  const { uid } = useCommunitySession();
  const { notify } = useCommunityNotice();

  return useCallback(() => {
    if (uid) return uid;
    notify("error", t("notSignedIn"));
    return null;
  }, [uid, notify, t]);
}
