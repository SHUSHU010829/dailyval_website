"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import { EsportsServiceError } from "@/lib/esports/rating-service";
import {
  COMMENT_COOLDOWN_SECONDS,
  COMMENT_TEXT_LIMIT,
  postSkinComment,
} from "@/lib/ratings/skin-service";

// 造型留言的 composer。兩段 gate：
// 1. 未登入 → Apple 登入 CTA
// 2. 已登入 → 輸入框（1–500 字；冷卻與內容過濾由伺服器仲裁，
//    作者身分是 esports profile——第一次投稿時伺服器自動建立）

interface SkinCommentComposerProps {
  skinID: string;
  /** 發佈成功後呼叫；父層負責重讀整串（伺服器擁有作者顯示） */
  onPosted(): void;
}

type Feedback =
  | { kind: "throttled"; seconds: number }
  | { kind: "rejected" }
  | { kind: "failed" }
  | null;

export default function SkinCommentComposer({ skinID, onPosted }: SkinCommentComposerProps) {
  const t = useTranslations("ratings.skins.comments");
  const session = useEsportsSession();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  if (session.status === "loading") return null;

  if (session.status === "signedOut") {
    return (
      <button
        type="button"
        onClick={() => void session.signInWithApple()}
        className="cut-sm w-full border border-border-med bg-bg-elevated px-4 py-3 text-left font-ui text-sm text-text-3 transition-colors hover:border-border-bright hover:text-text-1"
      >
        {t("signInToComment")}
      </button>
    );
  }

  async function handleSubmit() {
    // expectedUID 在按下送出的當下捕捉（伺服器拒絕半路換帳號的投稿）
    const actingUID = session.uid;
    if (posting || !actingUID) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    setPosting(true);
    setFeedback(null);
    // 快照送出時的草稿：request 期間使用者繼續打字的話，成功後不清空
    const submittedDraft = text;
    try {
      await postSkinComment({ skinID, text: trimmed, expectedUID: actingUID });
      onPosted();
      setText((current) => (current === submittedDraft ? "" : current));
    } catch (error) {
      if (error instanceof EsportsServiceError && error.kind === "rate_limited") {
        setFeedback({ kind: "throttled", seconds: COMMENT_COOLDOWN_SECONDS });
      } else if (
        error instanceof EsportsServiceError &&
        error.kind === "objectionable_content"
      ) {
        setFeedback({ kind: "rejected" });
      } else {
        setFeedback({ kind: "failed" });
      }
    }
    setPosting(false);
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={COMMENT_TEXT_LIMIT}
        rows={3}
        placeholder={t("composerPlaceholder")}
        className="cut-sm w-full resize-y border border-border-med bg-bg-elevated px-3 py-2.5 font-body text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-ui text-[11px] tabular-nums text-text-3">
          {text.trim().length}/{COMMENT_TEXT_LIMIT}
        </span>
        <button
          type="button"
          disabled={posting || text.trim().length === 0}
          onClick={() => void handleSubmit()}
          className="cut-sm bg-val-red px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 disabled:opacity-50"
        >
          {posting ? t("sending") : t("send")}
        </button>
      </div>
      {feedback && (
        <p role="alert" className="mt-2 font-ui text-xs text-val-red">
          {feedback.kind === "throttled" && t("throttled", { seconds: feedback.seconds })}
          {feedback.kind === "rejected" && t("contentRejected")}
          {feedback.kind === "failed" && t("postFailed")}
        </p>
      )}
    </div>
  );
}
