"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCloudKitSession } from "@/components/ratings/CloudKitProvider";
import {
  COMMENT_TEXT_LIMIT,
  submitComment,
} from "@/lib/ratings/skin-comments-client";
import type { SkinCommentData } from "@/lib/cloudkit/types";

// 造型留言的 composer。三段 gate（與社群板同一條規則）：
// 1. 未登入 → Apple 登入 CTA
// 2. 已登入但沒連結 Riot ID → 請到 App 連結（留言作者快照需要 Riot 身分）
// 3. 齊了 → 輸入框（1–500 字、30 秒冷卻）

interface SkinCommentComposerProps {
  skinID: string;
  onPosted(comment: SkinCommentData): void;
}

type Feedback =
  | { kind: "throttled"; seconds: number }
  | { kind: "failed" }
  | null;

export default function SkinCommentComposer({ skinID, onPosted }: SkinCommentComposerProps) {
  const t = useTranslations("ratings.skins.comments");
  const session = useCloudKitSession();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  if (session.status === "loading" || session.status === "unavailable") return null;

  if (session.status === "signedOut") {
    return (
      <button
        type="button"
        onClick={session.signIn}
        className="cut-sm w-full border border-border-med bg-bg-elevated px-4 py-3 text-left font-ui text-sm text-text-3 transition-colors hover:border-border-bright hover:text-text-1"
      >
        {t("signInToComment")}
      </button>
    );
  }

  if (!session.canComment) {
    return (
      <p className="cut-sm border border-border-med bg-bg-elevated px-4 py-3 font-ui text-sm text-text-3">
        {t("linkRiotIDNote")}
      </p>
    );
  }

  async function handleSubmit() {
    const profile = session.profile;
    if (posting || !profile) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    setPosting(true);
    setFeedback(null);
    const result = await submitComment({ skinID, text: trimmed, profile });
    switch (result.outcome) {
      case "ok":
        onPosted(result.value);
        setText("");
        break;
      case "throttled":
        setFeedback({ kind: "throttled", seconds: result.retryAfterSeconds });
        break;
      default:
        setFeedback({ kind: "failed" });
        break;
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
          {feedback.kind === "throttled"
            ? t("throttled", { seconds: feedback.seconds })
            : t("postFailed")}
        </p>
      )}
    </div>
  );
}
