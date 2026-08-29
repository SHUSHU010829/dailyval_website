// 造型評分的伺服器端讀取（Supabase PostgREST，Accept-Profile: skins）。
// 全部匿名唯讀；view 都掛在 skin_ratings_api_enabled 開關後面，
// 開關關閉時回空集合，頁面退化成「還沒有評分」而不是 500。
// 快取沿用 unstable_cache（排行榜 300s、單造型/留言 60s）。

import { unstable_cache } from "next/cache";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/esports/constants";
import type { AggregateTotals } from "@/lib/ratings/leaderboard";
import {
  assembleComments,
  SKIN_COMMENTS_LIMIT,
  type SkinCommentData,
  type SkinCommentRow,
} from "@/lib/ratings/skin-comments";

/**
 * PostgREST 的 max_rows 是 1000，超過「沉默截斷」——排行榜的造型數
 * 已經破 1300，所以整表讀取一律用 Range header 分頁到讀完為止
 * （iOS 排行榜同一課）。
 */
const RANGE_PAGE_SIZE = 1000;

interface LeaderboardRow {
  skin_id: string;
  rating_count: number;
  rating_sum: number;
}

async function skinsSelect<T>(
  table: string,
  params: URLSearchParams,
  range?: { from: number; to: number }
): Promise<T[]> {
  // 傳輸失敗一律 THROW：呼叫端的結果會進 unstable_cache，把失敗的
  // 分頁當空資料快取起來，就是「排行榜第二頁掛掉 → 一半造型顯示
  // 0 票、還快取五分鐘」。丟出去讓快取不落地，ISR 繼續供應上一版。
  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "Accept-Profile": "skins",
  };
  if (range) headers.Range = `${range.from}-${range.to}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers,
    // 快取由外層 unstable_cache 統一管；這裡不重複疊 fetch cache
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`skins read failed: ${table} ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`skins read malformed: ${table}`);
  return rows as T[];
}

const cachedAllAggregates = unstable_cache(
  async (): Promise<Record<string, AggregateTotals>> => {
    const totals: Record<string, AggregateTotals> = {};
    for (let from = 0; ; from += RANGE_PAGE_SIZE) {
      const rows = await skinsSelect<LeaderboardRow>(
        "rating_leaderboard",
        new URLSearchParams({
          select: "skin_id,rating_count,rating_sum",
          order: "skin_id.asc",
        }),
        { from, to: from + RANGE_PAGE_SIZE - 1 }
      );
      for (const row of rows) {
        totals[row.skin_id] = {
          ratingCount: row.rating_count,
          ratingSum: row.rating_sum,
        };
      }
      if (rows.length < RANGE_PAGE_SIZE) break;
    }
    return totals;
  },
  ["skin-aggregates-all"],
  { revalidate: 300 }
);

/** 排行榜用：所有有票數的彙總（開關關閉時為空 Map） */
export async function fetchAllSkinAggregates(): Promise<Map<string, AggregateTotals>> {
  return new Map(Object.entries(await cachedAllAggregates()));
}

const cachedSkinAggregate = unstable_cache(
  async (skinID: string): Promise<AggregateTotals> => {
    const rows = await skinsSelect<LeaderboardRow>(
      "rating_leaderboard",
      new URLSearchParams({
        skin_id: `eq.${skinID}`,
        select: "skin_id,rating_count,rating_sum",
      })
    );
    const row = rows[0];
    return {
      ratingCount: row?.rating_count ?? 0,
      ratingSum: row?.rating_sum ?? 0,
    };
  },
  ["skin-aggregate"],
  { revalidate: 60 }
);

/** 單一造型的彙總；沒被評過（或開關關閉）以 0 呈現 */
export async function fetchSkinAggregate(skinID: string): Promise<AggregateTotals> {
  return cachedSkinAggregate(skinID);
}

const cachedSkinComments = unstable_cache(
  async (skinID: string): Promise<SkinCommentData[]> => {
    const rows = await skinsSelect<SkinCommentRow>(
      "comments_public",
      new URLSearchParams({
        skin_id: `eq.${skinID}`,
        select: "*",
        order: "created_at.desc",
        limit: String(SKIN_COMMENTS_LIMIT),
      })
    );
    if (rows.length === 0) return [];

    const likeCounts = new Map<string, number>();
    const likeRows = await skinsSelect<{ comment_id: string; like_count: number }>(
      "comment_like_counts",
      new URLSearchParams({
        comment_id: `in.(${rows.map((row) => row.id).join(",")})`,
        select: "comment_id,like_count",
      })
    );
    for (const row of likeRows) likeCounts.set(row.comment_id, row.like_count);

    return assembleComments(rows, likeCounts);
  },
  ["skin-comments"],
  { revalidate: 60 }
);

/** 單一造型的留言，最新在前（上限 100，與 iOS 同） */
export async function fetchSkinComments(skinID: string): Promise<SkinCommentData[]> {
  return cachedSkinComments(skinID);
}
