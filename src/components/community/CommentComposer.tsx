"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import LinkRiotIdDialog from "@/components/community/LinkRiotIdDialog";
import { useCommunityNotice } from "@/components/community/CommunityNoticeProvider";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import { useErrorMessage } from "@/components/community/useErrorMessage";
import { COMMENT_CHAR_LIMIT } from "@/lib/community/constants";
import { createComment } from "@/lib/community/service";
import type { SocialComment } from "@/lib/community/types";

// 留言輸入框。三道關卡：未登入 → 登入提示；已登入但沒有署名 → 去 App 綁定
// Riot ID；其餘才是輸入框。

interface CommentComposerProps {
  postId: string;
  onCommentAdded?: (comment: SocialComment) => void;
}

export default function CommentComposer({
  postId,
  onCommentAdded,
}: CommentComposerProps) {
  const t = useTranslations("communityBoard.comments");
  const describe = useErrorMessage();
  const { notify } = useCommunityNotice();
  const { status, uid, profile, canPost, generation, signInWithApple } =
    useCommunitySession();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // 這則草稿的留言 id，綁著送出時的內容與帳號：同樣的內容重送就是同一則（伺服器
  // 對同一個 id 冪等，回應掉包後重按不會變成兩則）；內容改了或換了帳號就是新的
  // 一則——伺服器對已存在的 id 不會比對內文，沿用舊 id 會讓畫面顯示改過的字、
  // 資料庫卻是原來那一句
  const draftRef = useRef<{ id: string; body: string; uid: string } | null>(
    null,
  );
  // 帳號世代的鏡像：送出後帳號換了，回來的成功不能以新帳號的身分放進畫面
  const generationRef = useRef(generation);
  useEffect(() => {
    generationRef.current = generation;
  }, [generation]);

  if (status === "loading") return null;

  if (status === "signedOut") {
    return (
      <button
        type="button"
        onClick={() => void signInWithApple()}
        className="cut-sm w-full border border-border-med bg-bg-elevated px-4 py-3 text-left font-ui text-sm text-text-3 transition-colors hover:border-border-bright hover:text-text-1"
      >
        {t("loginToComment")}
      </button>
    );
  }

  const submit = async () => {
    if (submitting) return;
    // 帳號在互動當下抓住
    const expectedUid = uid;
    if (!expectedUid) return;
    if (!canPost || !profile) {
      notify("error", t("riotIdRequired"));
      setShowLinkDialog(true);
      return;
    }
    const body = text.trim();
    if (!body) {
      notify("error", t("emptyComment"));
      return;
    }

    setSubmitting(true);
    if (
      !draftRef.current ||
      draftRef.current.body !== body ||
      draftRef.current.uid !== expectedUid
    ) {
      draftRef.current = { id: crypto.randomUUID(), body, uid: expectedUid };
    }
    const id = draftRef.current.id;
    const forGeneration = generation;
    try {
      await createComment({
        id,
        postId,
        body,
        ticketId: null,
        expectedUid,
      });
      draftRef.current = null;
      setText("");
      // 送出後帳號換了：留言是以前一個帳號寫的，不放進現在這位觀看者的討論串
      if (generationRef.current !== forGeneration) return;
      onCommentAdded?.({
        id,
        postId,
        body,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        author: {
          id: expectedUid,
          name: profile.displayName ?? "",
          tagLine: profile.tagLine,
          rankTier: profile.rankTier,
          isVerified: profile.isVerified,
          isPremium: profile.isPremium,
          avatarURL: profile.avatarURL,
        },
        imageURL: null,
        thumbURL: null,
        myReaction: null,
        didReport: false,
      });
      notify("success", t("commentSuccess"));
    } catch (error) {
      notify("error", describe(error));
    } finally {
      setSubmitting(false);
    }
  };

  const nearLimit = text.length >= COMMENT_CHAR_LIMIT * 0.85;

  return (
    <div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={COMMENT_CHAR_LIMIT}
        rows={3}
        disabled={submitting}
        placeholder={t("enterComment")}
        className="cut-sm w-full resize-y border border-border-med bg-bg-elevated px-3 py-2.5 font-body text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          className={`font-ui text-[11px] tabular-nums ${nearLimit ? "text-gold" : "text-text-3"}`}
        >
          {t("charCount", { current: text.length, max: COMMENT_CHAR_LIMIT })}
        </span>
        <button
          type="button"
          disabled={submitting || text.trim().length === 0}
          onClick={() => void submit()}
          className="cut-sm bg-val-red px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-[filter] hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? t("posting") : t("postComment")}
        </button>
      </div>
      <LinkRiotIdDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
      />
    </div>
  );
}
