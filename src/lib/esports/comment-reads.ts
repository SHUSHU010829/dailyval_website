// 留言區的匿名讀取。同構（RSC 首屏與瀏覽器翻頁共用）：
// 純 raw fetch + publishable key，不需要 supabase-js。
// 瀏覽器端一律 cache: "no-store"（留言是活資料）；RSC 呼叫端以
// 頁面 revalidate 控制。

import {
  COMMENT_COLUMNS,
  COMMENTS_PAGE_SIZE,
  ID_LIST_CHUNK_SIZE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/esports/constants";
import { heatCursorFilter, newestCursorFilter } from "@/lib/esports/cursors";
import { chunk } from "@/lib/esports/chunk";
import type {
  CommentHeatRow,
  CommentLikeCountRow,
  CommentRow,
  HeatCursor,
  HotPlayerCommentRow,
  NewestCursor,
} from "@/lib/esports/types";

async function select<T>(table: string, params: URLSearchParams): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Accept-Profile": "esports",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`esports ${table} 讀取失敗：${res.status}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** 最新排序的第一層留言一頁（可選 player thread 過濾） */
export async function fetchTopLevelComments(options: {
  riotMatchID: string;
  playerKey?: string | null;
  cursor?: NewestCursor | null;
  limit?: number;
}): Promise<CommentRow[]> {
  const params = new URLSearchParams({
    select: COMMENT_COLUMNS,
    riot_match_id: `eq.${options.riotMatchID}`,
    parent_id: "is.null",
    order: "created_at.desc,id.desc",
    limit: String(options.limit ?? COMMENTS_PAGE_SIZE),
  });
  if (options.playerKey) params.set("player_key", `eq.${options.playerKey}`);
  if (options.cursor) params.set("or", `(${newestCursorFilter(options.cursor)})`);
  return select<CommentRow>("comments", params);
}

/** 熱門排序的 keyset 索引一頁（本文另以 fetchCommentsByIds 取回） */
export async function fetchHeatPage(options: {
  riotMatchID: string;
  playerKey?: string | null;
  cursor?: HeatCursor | null;
  limit?: number;
}): Promise<CommentHeatRow[]> {
  const params = new URLSearchParams({
    select: "*",
    riot_match_id: `eq.${options.riotMatchID}`,
    order: "like_count.desc,created_at.desc,comment_id.desc",
    limit: String(options.limit ?? COMMENTS_PAGE_SIZE),
  });
  // 主討論串不帶 player_key 過濾（選手留言也算主串的一部分，比照 iOS）
  if (options.playerKey) params.set("player_key", `eq.${options.playerKey}`);
  if (options.cursor) params.set("or", `(${heatCursorFilter(options.cursor)})`);
  return select<CommentHeatRow>("comment_heat", params);
}

/** 依 id 取留言本文（分塊 50） */
export async function fetchCommentsByIds(ids: string[]): Promise<CommentRow[]> {
  const results = await Promise.all(
    chunk(ids, ID_LIST_CHUNK_SIZE).map((batch) =>
      select<CommentRow>(
        "comments",
        new URLSearchParams({
          select: COMMENT_COLUMNS,
          id: `in.(${batch.join(",")})`,
        })
      )
    )
  );
  return results.flat();
}

/** 整批第一層留言的回覆（依父留言分組由呼叫端做；時間正序） */
export async function fetchReplies(parentIDs: string[]): Promise<CommentRow[]> {
  const results = await Promise.all(
    chunk(parentIDs, ID_LIST_CHUNK_SIZE).map((batch) =>
      select<CommentRow>(
        "comments",
        new URLSearchParams({
          select: COMMENT_COLUMNS,
          parent_id: `in.(${batch.join(",")})`,
          order: "created_at.asc,id.asc",
        })
      )
    )
  );
  return results.flat();
}

/** 留言讚數（分塊 50） */
export async function fetchLikeCounts(commentIDs: string[]): Promise<CommentLikeCountRow[]> {
  const results = await Promise.all(
    chunk(commentIDs, ID_LIST_CHUNK_SIZE).map((batch) =>
      select<CommentLikeCountRow>(
        "comment_like_counts",
        new URLSearchParams({
          select: "*",
          comment_id: `in.(${batch.join(",")})`,
        })
      )
    )
  );
  return results.flat();
}

/** 亮回覆槽位（每位選手的最高讚留言；門檻由呼叫端帶入） */
export async function fetchHotPlayerComments(
  riotMatchID: string,
  minLikes: number
): Promise<HotPlayerCommentRow[]> {
  return select<HotPlayerCommentRow>(
    "hot_player_comments",
    new URLSearchParams({
      select: "*",
      riot_match_id: `eq.${riotMatchID}`,
      like_count: `gte.${minLikes}`,
    })
  );
}
