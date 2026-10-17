"use client";

/* eslint-disable @next/next/no-img-element */
import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import AuthorBadge from "@/components/community/AuthorBadge";
import { useCommunitySession } from "@/components/community/CommunitySessionProvider";
import PostActionsMenu from "@/components/community/PostActionsMenu";
import { useReaction } from "@/components/community/useReaction";
import { useRequireSignIn } from "@/components/community/useRequireSignIn";
import Icon from "@/components/Icon";
import { setCommentReaction } from "@/lib/community/service";
import { formatRelativeTime } from "@/lib/community/time";
import type { SocialComment } from "@/lib/community/types";

interface CommentRowProps {
  comment: SocialComment;
  onRemoved(id: string): void;
  onBlocked(comment: SocialComment): void;
}

const CommentRow = memo(function CommentRow({
  comment,
  onRemoved,
  onBlocked,
}: CommentRowProps) {
  const t = useTranslations("communityBoard.post");
  const tA11y = useTranslations("communityBoard.a11y");
  const locale = useLocale();
  const { uid } = useCommunitySession();
  const requireSignIn = useRequireSignIn();

  // 留言沒有倒讚的畫面，dislikeCount 一律 0
  const { state: reaction, react } = useReaction({
    row: comment,
    server: {
      mine: comment.myReaction,
      likeCount: comment.likeCount,
      dislikeCount: 0,
    },
    uid,
    send: (kind, forUid) =>
      setCommentReaction(comment.id, kind, forUid).then((result) => ({
        mine: result.mine,
        likeCount: result.likeCount,
        dislikeCount: 0,
      })),
  });

  const liked = reaction.mine === "like";

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-2">
        <AuthorBadge author={comment.author} size={28} />
        <div className="flex shrink-0 items-center gap-1">
          <time
            dateTime={comment.createdAt}
            suppressHydrationWarning
            className="font-ui text-xs text-text-3"
          >
            {formatRelativeTime(comment.createdAt, locale)}
          </time>
          <PostActionsMenu
            kind="comment"
            targetId={comment.id}
            authorId={comment.author.id}
            didReport={comment.didReport}
            onRemoved={() => onRemoved(comment.id)}
            onBlocked={() => onBlocked(comment)}
          />
        </div>
      </div>

      <div className="pl-9">
        <p className="mt-2 whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-text-1">
          {comment.body}
        </p>
        {comment.imageURL && (
          <a
            href={comment.imageURL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tA11y("postImage", { index: 1 })}
            className="mt-2 block w-40"
          >
            <img
              src={comment.thumbURL ?? comment.imageURL}
              alt=""
              loading="lazy"
              className="w-full"
            />
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            if (requireSignIn()) react("like");
          }}
          aria-pressed={liked}
          aria-label={t("like")}
          className={`mt-2 flex items-center gap-1 font-ui text-xs transition-colors hover:text-val-red ${liked ? "text-val-red" : "text-text-3"}`}
        >
          <Icon name="ThumbsUp" size={14} weight={liked ? "fill" : "bold"} />
          {reaction.likeCount > 0 && (
            <span className="tabular-nums">{reaction.likeCount}</span>
          )}
        </button>
      </div>
    </div>
  );
});

export default CommentRow;
