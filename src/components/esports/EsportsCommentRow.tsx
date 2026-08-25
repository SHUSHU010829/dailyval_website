"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { playerCardSmallArtURL } from "@/lib/esports/constants";
import { parsePostgresTimestamp } from "@/lib/esports/timestamps";
import { formatRelativeTime } from "@/lib/ratings/format";
import type { CommentRow } from "@/lib/esports/types";

// 電競留言單列：頭像（playercard）、名稱、HOT 徽章、選手 chip、
// 內文、讚數、相對時間；回覆縮排一層（後端保證只有一層）。

export interface CommentViewModel {
  row: CommentRow;
  likeCount: number;
  isHot: boolean;
  /** 留言掛的選手暱稱（player_key 對得上快照才有） */
  playerName: string | null;
}

interface EsportsCommentRowProps {
  comment: CommentViewModel;
  replies: CommentViewModel[];
  locale: string;
}

export default function EsportsCommentRow({
  comment,
  replies,
  locale,
}: EsportsCommentRowProps) {
  return (
    <li className="px-3 py-4 md:px-4">
      <CommentBody comment={comment} locale={locale} />
      {replies.length > 0 && (
        <ul className="mt-3 space-y-3 border-l-2 border-border-dim pl-4 md:pl-5">
          {replies.map((reply) => (
            <li key={reply.row.id}>
              <CommentBody comment={reply} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentBody({ comment, locale }: { comment: CommentViewModel; locale: string }) {
  const t = useTranslations("esports.comments");
  const { row, likeCount, isHot, playerName } = comment;
  const createdAt = parsePostgresTimestamp(row.created_at);
  const avatarURL = row.author?.avatar_card_id
    ? playerCardSmallArtURL(row.author.avatar_card_id)
    : null;

  return (
    <div className="flex gap-3">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-bg-elevated">
        {avatarURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarURL} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-text-3">
            <Icon name="UsersThree" size={16} aria-hidden />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-ui text-sm font-bold text-text-1">
            {row.author?.display_name || t("anonymousName")}
          </span>
          {isHot && (
            <span className="cut-sm bg-val-red/15 px-1.5 py-0.5 font-ui text-[10px] font-bold uppercase tracking-widest text-val-red">
              {t("hotBadge")}
            </span>
          )}
          {playerName && (
            <span className="cut-sm bg-jett-blue/10 px-1.5 py-0.5 font-ui text-[10px] font-bold tracking-widest text-jett-blue">
              {playerName}
            </span>
          )}
          {createdAt !== null && (
            <span className="font-ui text-xs text-text-3">
              {formatRelativeTime(createdAt, locale)}
            </span>
          )}
        </div>

        <p className="mt-1.5 whitespace-pre-wrap break-words font-body text-sm text-text-2">
          {row.body}
        </p>

        {likeCount > 0 && (
          <p className="mt-2 flex items-center gap-1.5 font-ui text-xs text-text-3">
            <Icon name="Heart" size={13} weight="fill" className="text-val-red" aria-hidden />
            <span aria-label={t("likeCountLabel", { count: likeCount })}>{likeCount}</span>
          </p>
        )}
      </div>
    </div>
  );
}
