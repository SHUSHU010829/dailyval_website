"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import EsportsCommentRow, {
  type CommentViewModel,
} from "@/components/esports/EsportsCommentRow";
import {
  fetchCommentsByIds,
  fetchHeatPage,
  fetchLikeCounts,
  fetchReplies,
  fetchTopLevelComments,
} from "@/lib/esports/comment-reads";
import { COMMENTS_PAGE_SIZE, HOT_MIN_LIKES } from "@/lib/esports/constants";
import type { CommentRow, HeatCursor, NewestCursor } from "@/lib/esports/types";

// 賽後留言（PR 2 唯讀）：最熱／最新 排序、keyset 分頁、一層回覆、讚數。
// 發佈留言、按讚、檢舉、封鎖在登入 PR 之後接上。
// 熱門排序的 like_count 是會變動的 keyset key：頁與頁之間讚數變了會
// 漏或重，這裡以 id 去重、切排序或重整收斂（設計上接受的取捨）。

interface CommentsSectionProps {
  riotMatchID: string;
  /** player_key → 暱稱（留言的選手 chip 用；快照缺席時空物件） */
  playerNames: Record<string, string>;
  /** 由 server 端 summary 來的留言總數（顯示用） */
  commentCount: number;
}

type CommentSort = "hot" | "newest";

interface ThreadState {
  rows: CommentRow[];
  repliesByParent: Record<string, CommentRow[]>;
  likeCounts: Record<string, number>;
  newestCursor: NewestCursor | null;
  heatCursor: HeatCursor | null;
  hasMore: boolean;
}

const EMPTY_THREAD: ThreadState = {
  rows: [],
  repliesByParent: {},
  likeCounts: {},
  newestCursor: null,
  heatCursor: null,
  hasMore: false,
};

export default function CommentsSection({
  riotMatchID,
  playerNames,
  commentCount,
}: CommentsSectionProps) {
  const t = useTranslations("esports.comments");
  const locale = useLocale();

  // 熱門是預設排序（零讚的長尾與最新排序完全同序，所以安全）
  const [sort, setSort] = useState<CommentSort>("hot");
  // 討論串內容綁著它所屬的排序；排序一換，衍生值自動歸零（不用 effect 重設）
  const [threadState, setThreadState] = useState<{ sort: CommentSort; data: ThreadState }>({
    sort: "hot",
    data: EMPTY_THREAD,
  });
  const thread = threadState.sort === sort ? threadState.data : EMPTY_THREAD;
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  // 排序切換的世代柵欄：晚到的舊排序回應不得覆蓋新排序的內容
  const generation = useRef(0);

  const loadPage = useCallback(
    async (targetSort: CommentSort, current: ThreadState) => {
      const myGeneration = ++generation.current;
      // 讓出同步階段再 setState（effect 的同步呼叫鏈內不得 setState）
      await Promise.resolve();
      if (generation.current !== myGeneration) return;
      setStatus("loading");
      try {
        let pageRows: CommentRow[];
        let nextNewest: NewestCursor | null = current.newestCursor;
        let nextHeat: HeatCursor | null = current.heatCursor;
        let hasMore: boolean;

        if (targetSort === "newest") {
          pageRows = await fetchTopLevelComments({
            riotMatchID,
            cursor: current.newestCursor,
          });
          hasMore = pageRows.length === COMMENTS_PAGE_SIZE;
          const last = pageRows[pageRows.length - 1];
          if (last) nextNewest = { createdAtRaw: last.created_at, id: last.id };
        } else {
          const heatRows = await fetchHeatPage({
            riotMatchID,
            cursor: current.heatCursor,
          });
          hasMore = heatRows.length === COMMENTS_PAGE_SIZE;
          const last = heatRows[heatRows.length - 1];
          if (last) {
            nextHeat = {
              likeCount: last.like_count,
              createdAtRaw: last.created_at,
              id: last.comment_id,
            };
          }
          // 依熱度索引取回本文，維持索引的排序
          const bodies = await fetchCommentsByIds(heatRows.map((row) => row.comment_id));
          const byID = new Map(bodies.map((row) => [row.id, row]));
          pageRows = heatRows
            .map((row) => byID.get(row.comment_id))
            .filter((row): row is CommentRow => Boolean(row));
        }

        // 以 id 去重（熱門排序的 mutable key 會讓邊界重複）
        const held = new Set(current.rows.map((row) => row.id));
        const fresh = pageRows.filter((row) => !held.has(row.id));

        // 回覆與讚數整批補齊後才一次 commit；中途失敗不留半頁
        const [replies, likeCounts] = await Promise.all([
          fetchReplies(fresh.map((row) => row.id)),
          fetchLikeCounts([...fresh.map((row) => row.id)]),
        ]);
        const replyLikes =
          replies.length > 0 ? await fetchLikeCounts(replies.map((row) => row.id)) : [];

        if (generation.current !== myGeneration) return;

        setThreadState((previous) => {
          const base = previous.sort === targetSort ? previous.data : EMPTY_THREAD;
          const repliesByParent = { ...base.repliesByParent };
          for (const reply of replies) {
            if (!reply.parent_id) continue;
            repliesByParent[reply.parent_id] = [
              ...(repliesByParent[reply.parent_id] ?? []),
              reply,
            ];
          }
          const counts = { ...base.likeCounts };
          for (const row of [...likeCounts, ...replyLikes]) {
            counts[row.comment_id] = row.like_count;
          }
          return {
            sort: targetSort,
            data: {
              rows: [...base.rows, ...fresh],
              repliesByParent,
              likeCounts: counts,
              newestCursor: nextNewest,
              heatCursor: nextHeat,
              hasMore,
            },
          };
        });
        setStatus("idle");
      } catch {
        if (generation.current === myGeneration) setStatus("error");
      }
    },
    [riotMatchID]
  );

  useEffect(() => {
    // 排序或比賽變更時整串重載（內容歸零由上面的衍生值處理）。
    // setState 都發生在 await 之後的非同步接續（規則的靜態分析看不穿
    // async 邊界才誤報）；掛載即抓資料正是 effect 同步外部系統的正途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(sort, EMPTY_THREAD);
  }, [sort, loadPage]);

  const switchSort = (next: CommentSort) => {
    if (next !== sort) setSort(next);
  };

  const toggleClass = (active: boolean) =>
    [
      "cut-sm px-4 py-1.5 font-ui text-xs font-bold uppercase tracking-widest transition-colors",
      active
        ? "bg-val-red text-bg-base"
        : "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1",
    ].join(" ");

  const toViewModel = (row: CommentRow): CommentViewModel => ({
    row,
    likeCount: thread.likeCounts[row.id] ?? 0,
    isHot: (thread.likeCounts[row.id] ?? 0) >= HOT_MIN_LIKES,
    playerName: row.player_key ? playerNames[row.player_key] ?? null : null,
  });

  return (
    <section aria-label={t("title")} className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-black uppercase tracking-tight text-text-1">
          {t("title")}
          <span className="ml-2 font-ui text-sm font-bold text-text-3">{commentCount}</span>
        </h2>
        <div className="flex gap-2" role="group" aria-label={t("sortLabel")}>
          <button
            type="button"
            onClick={() => switchSort("hot")}
            aria-pressed={sort === "hot"}
            className={toggleClass(sort === "hot")}
          >
            {t("sortHot")}
          </button>
          <button
            type="button"
            onClick={() => switchSort("newest")}
            aria-pressed={sort === "newest"}
            className={toggleClass(sort === "newest")}
          >
            {t("sortNewest")}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {thread.rows.length === 0 && status === "loading" ? (
          <p role="status" className="py-12 text-center font-ui text-sm uppercase tracking-widest text-text-3">
            {t("loading")}
          </p>
        ) : thread.rows.length === 0 && status === "error" ? (
          <p role="alert" className="py-12 text-center font-ui text-sm text-text-2">
            {t("loadFailed")}
          </p>
        ) : thread.rows.length === 0 ? (
          <p className="py-12 text-center font-ui text-sm text-text-2">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border-dim border-y border-border-dim">
            {thread.rows.map((row) => (
              <EsportsCommentRow
                key={row.id}
                comment={toViewModel(row)}
                replies={(thread.repliesByParent[row.id] ?? []).map(toViewModel)}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </div>

      {thread.hasMore && status !== "loading" && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => void loadPage(sort, thread)}
            className="cut-sm border border-border-med px-6 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:border-border-bright hover:text-text-1"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
      {thread.rows.length > 0 && status === "loading" && (
        <p role="status" className="mt-5 text-center font-ui text-xs uppercase tracking-widest text-text-3">
          {t("loading")}
        </p>
      )}
      {thread.rows.length > 0 && status === "error" && (
        <p role="alert" className="mt-5 text-center font-ui text-xs text-text-2">
          {t("loadFailed")}
        </p>
      )}

      <p className="mt-6 font-ui text-xs text-text-3">{t("inAppNote")}</p>
    </section>
  );
}
