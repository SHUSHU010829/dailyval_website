"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import SkinCommentRow from "@/components/ratings/SkinCommentRow";
import type { SkinCommentData } from "@/lib/cloudkit/types";

// 造型留言清單（PR 1 唯讀）：最新／最讚 切換。
// 資料由 server component 抓好傳進來；發佈留言與按讚在 PR 3 加入。

type CommentSort = "newest" | "top";

interface SkinCommentListProps {
  comments: SkinCommentData[];
  locale: string;
}

export default function SkinCommentList({ comments, locale }: SkinCommentListProps) {
  const t = useTranslations("ratings.skins.comments");
  const [sort, setSort] = useState<CommentSort>("newest");

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

      {sorted.length === 0 ? (
        <p className="mt-6 py-10 text-center font-ui text-sm text-text-2">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border-dim border-y border-border-dim">
          {sorted.map((comment) => (
            <SkinCommentRow key={comment.id} comment={comment} locale={locale} />
          ))}
        </ul>
      )}

      <p className="mt-6 font-ui text-xs text-text-3">{t("inAppNote")}</p>
    </section>
  );
}
