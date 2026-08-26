"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import SkinCommentRow from "@/components/ratings/SkinCommentRow";
import SkinCommentComposer from "@/components/ratings/SkinCommentComposer";
import { useCloudKitSession } from "@/components/ratings/CloudKitProvider";
import {
  deleteOwnComment,
  toggleCommentLike,
} from "@/lib/ratings/skin-comments-client";
import { SKIN_WRITES_ENABLED } from "@/lib/ratings/flags";
import type { SkinCommentData } from "@/lib/cloudkit/types";

// 造型留言（互動版）：最新／熱門切換、發佈（Riot ID gate）、按讚、
// 作者刪除。資料由 server component 抓好傳進來，寫入走 CloudKit JS。

type CommentSort = "newest" | "top";

interface SkinCommentListProps {
  skinID: string;
  comments: SkinCommentData[];
  locale: string;
}

export default function SkinCommentList({
  skinID,
  comments: initialComments,
  locale,
}: SkinCommentListProps) {
  const t = useTranslations("ratings.skins.comments");
  const session = useCloudKitSession();
  const [sort, setSort] = useState<CommentSort>("newest");
  const [comments, setComments] = useState(initialComments);
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState(false);

  const myRiotID = session.profile?.riotID ?? null;

  const sorted = useMemo(() => {
    if (sort === "newest") {
      return [...comments].sort((a, b) => b.createdAt - a.createdAt);
    }
    // Top：讚數多在前，同讚數以新留言在前
    return [...comments].sort((a, b) =>
      a.likedUserIDs.length !== b.likedUserIDs.length
        ? b.likedUserIDs.length - a.likedUserIDs.length
        : b.createdAt - a.createdAt
    );
  }, [comments, sort]);

  async function handleToggleLike(comment: SkinCommentData) {
    // 按讚身分是 Riot puuid：沒連結 Riot ID 就不能讚（空字串會污染名單）
    if (!session.canComment || !myRiotID || likePending.has(comment.id)) return;
    setLikePending((previous) => new Set(previous).add(comment.id));
    setActionError(false);

    // 樂觀 toggle；失敗回滾
    const optimistic = comment.likedUserIDs.includes(myRiotID)
      ? comment.likedUserIDs.filter((id) => id !== myRiotID)
      : [...comment.likedUserIDs, myRiotID];
    setComments((previous) =>
      previous.map((entry) =>
        entry.id === comment.id ? { ...entry, likedUserIDs: optimistic } : entry
      )
    );

    const result = await toggleCommentLike({ commentID: comment.id, riotID: myRiotID });
    setComments((previous) =>
      previous.map((entry) =>
        entry.id === comment.id
          ? {
              ...entry,
              likedUserIDs:
                result.outcome === "ok" ? result.value : comment.likedUserIDs,
            }
          : entry
      )
    );
    if (result.outcome !== "ok") setActionError(true);
    setLikePending((previous) => {
      const next = new Set(previous);
      next.delete(comment.id);
      return next;
    });
  }

  async function handleDelete(comment: SkinCommentData) {
    if (!myRiotID || comment.userID !== myRiotID) return;
    setActionError(false);
    const previous = comments;
    setComments((current) => current.filter((entry) => entry.id !== comment.id));
    const deleted = await deleteOwnComment(comment.id);
    if (!deleted) {
      setComments(previous);
      setActionError(true);
    }
  }

  const toggleClass = (active: boolean) =>
    [
      "cut-sm px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-widest transition-colors",
      active
        ? "bg-val-red text-bg-base"
        : "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1",
    ].join(" ");

  return (
    <section aria-label={t("title")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-1">
          {t("title")}
          <span className="ml-2 font-ui text-sm font-bold text-text-3">
            {comments.length}
          </span>
        </h2>
        {comments.length > 1 && (
          <div className="flex gap-2" role="group" aria-label={t("sortLabel")}>
            <button
              type="button"
              onClick={() => setSort("newest")}
              aria-pressed={sort === "newest"}
              className={toggleClass(sort === "newest")}
            >
              {t("sortNewest")}
            </button>
            <button
              type="button"
              onClick={() => setSort("top")}
              aria-pressed={sort === "top"}
              className={toggleClass(sort === "top")}
            >
              {t("sortTop")}
            </button>
          </div>
        )}
      </div>

      {SKIN_WRITES_ENABLED ? (
        <div className="mt-4">
          <SkinCommentComposer
            skinID={skinID}
            onPosted={(comment) => setComments((previous) => [comment, ...previous])}
          />
        </div>
      ) : (
        <p className="mt-4 font-ui text-xs text-text-3">{t("inAppNote")}</p>
      )}

      {actionError && (
        <p role="alert" className="mt-3 font-ui text-xs text-val-red">
          {t("actionFailed")}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="mt-6 py-10 text-center font-ui text-sm text-text-2">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border-dim border-y border-border-dim">
          {sorted.map((comment) => (
            <SkinCommentRow
              key={comment.id}
              comment={comment}
              locale={locale}
              likedByMe={myRiotID !== null && comment.likedUserIDs.includes(myRiotID)}
              canLike={SKIN_WRITES_ENABLED && session.canComment}
              isOwn={SKIN_WRITES_ENABLED && myRiotID !== null && comment.userID === myRiotID}
              onToggleLike={() => void handleToggleLike(comment)}
              onDelete={() => void handleDelete(comment)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
