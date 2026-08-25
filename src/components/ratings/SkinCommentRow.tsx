"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { formatRelativeTime, rankIconURL } from "@/lib/ratings/format";
import type { SkinCommentData } from "@/lib/cloudkit/types";

// 造型留言單列：頭像（playercard 快照）、名稱#tag、牌位、驗證徽章、
// 內文、讚（可互動）、作者刪除。userID 是 Riot puuid，只做身分判斷，
// 不顯示。

interface SkinCommentRowProps {
  comment: SkinCommentData;
  locale: string;
  likedByMe: boolean;
  canLike: boolean;
  isOwn: boolean;
  onToggleLike(): void;
  onDelete(): void;
}

export default function SkinCommentRow({
  comment,
  locale,
  likedByMe,
  canLike,
  isOwn,
  onToggleLike,
  onDelete,
}: SkinCommentRowProps) {
  const t = useTranslations("ratings.skins.comments");
  const rankIcon = rankIconURL(comment.rankTier);
  const likeCount = comment.likedUserIDs.length;

  return (
    <li className="flex gap-3 px-3 py-4 md:px-4">
      {/* 頭像：發文當下的 playercard 圖 URL 快照；載不到就顯示底色 */}
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-bg-elevated">
        {comment.userImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.userImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-ui text-sm font-bold text-text-1">
            {comment.userName}
            {comment.tagLine && (
              <span className="font-normal text-text-3">#{comment.tagLine}</span>
            )}
          </span>
          {comment.isVerify && (
            <Icon
              name="SealCheck"
              size={14}
              weight="fill"
              className="text-jett-blue"
              aria-label={t("verified")}
            />
          )}
          {rankIcon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rankIcon} alt="" loading="lazy" className="h-4 w-4" />
          )}
          <span className="font-ui text-xs text-text-3">
            {formatRelativeTime(comment.createdAt, locale)}
          </span>
        </div>

        <p className="mt-1.5 whitespace-pre-wrap break-words font-body text-sm text-text-2">
          {comment.text}
        </p>

        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            disabled={!canLike}
            onClick={onToggleLike}
            aria-pressed={likedByMe}
            aria-label={t("likeCountLabel", { count: likeCount })}
            className={`flex items-center gap-1.5 font-ui text-xs transition-colors disabled:cursor-default ${
              likedByMe ? "text-val-red" : "text-text-3 enabled:hover:text-val-red"
            }`}
          >
            <Icon name="Heart" size={13} weight={likedByMe ? "fill" : "bold"} aria-hidden />
            {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
          </button>

          {isOwn && (
            <button
              type="button"
              onClick={onDelete}
              className="font-ui text-[11px] uppercase tracking-widest text-text-3 transition-colors hover:text-val-red"
            >
              {t("delete")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
