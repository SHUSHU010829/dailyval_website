"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import { playerCardSmallArtURL } from "@/lib/esports/constants";
import { parsePostgresTimestamp } from "@/lib/esports/timestamps";
import { formatRelativeTime } from "@/lib/ratings/format";
import type { CommentRow } from "@/lib/esports/types";

// 電競留言單列：頭像、名稱、HOT 徽章、選手 chip、內文、讚、動作列
// （回覆／檢舉／封鎖／刪除）。回覆縮排一層（後端保證只有一層）。
// 樂觀插入的留言 created_at 為空字串——不顯示時間，重整後補上。

export interface CommentViewModel {
  row: CommentRow;
  likeCount: number;
  likedByMe: boolean;
  isHot: boolean;
  isOwn: boolean;
  playerName: string | null;
}

export interface CommentActions {
  /** 讚是 window-gated；窗關了整排動作停用（檢舉除外） */
  interactionsEnabled: boolean;
  onToggleLike(id: string): void;
  onReply(row: CommentRow): void;
  onReport(row: CommentRow): void;
  onBlock(row: CommentRow): void;
  onDelete(row: CommentRow): void;
}

interface EsportsCommentRowProps {
  comment: CommentViewModel;
  replies: CommentViewModel[];
  locale: string;
  actions: CommentActions;
}

export default function EsportsCommentRow({
  comment,
  replies,
  locale,
  actions,
}: EsportsCommentRowProps) {
  return (
    <li className="px-3 py-4 md:px-4">
      <CommentBody comment={comment} locale={locale} actions={actions} isReply={false} />
      {replies.length > 0 && (
        <ul className="mt-3 space-y-3 border-l-2 border-border-dim pl-4 md:pl-5">
          {replies.map((reply) => (
            <li key={reply.row.id}>
              <CommentBody comment={reply} locale={locale} actions={actions} isReply />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentBody({
  comment,
  locale,
  actions,
  isReply,
}: {
  comment: CommentViewModel;
  locale: string;
  actions: CommentActions;
  isReply: boolean;
}) {
  const t = useTranslations("esports.comments");
  const { row, likeCount, likedByMe, isHot, isOwn, playerName } = comment;
  const createdAt = row.created_at ? parsePostgresTimestamp(row.created_at) : null;
  const avatarURL = row.author?.avatar_card_id
    ? playerCardSmallArtURL(row.author.avatar_card_id)
    : null;

  const actionClass =
    "font-ui text-[11px] uppercase tracking-widest text-text-3 transition-colors hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-40";

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

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* 讚（SET 語意，debounce 在 section）——窗關了停用 */}
          <button
            type="button"
            disabled={!actions.interactionsEnabled}
            onClick={() => actions.onToggleLike(row.id)}
            aria-pressed={likedByMe}
            aria-label={t("likeCountLabel", { count: likeCount })}
            className={`flex items-center gap-1.5 font-ui text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              likedByMe ? "text-val-red" : "text-text-3 hover:text-val-red"
            }`}
          >
            <Icon name="Heart" size={14} weight={likedByMe ? "fill" : "bold"} aria-hidden />
            {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
          </button>

          {!isReply && (
            <button
              type="button"
              disabled={!actions.interactionsEnabled}
              onClick={() => actions.onReply(row)}
              className={actionClass}
            >
              {t("reply")}
            </button>
          )}

          {isOwn ? (
            <button type="button" onClick={() => actions.onDelete(row)} className={actionClass}>
              {t("delete")}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => actions.onReport(row)} className={actionClass}>
                {t("report")}
              </button>
              <button type="button" onClick={() => actions.onBlock(row)} className={actionClass}>
                {t("block")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
