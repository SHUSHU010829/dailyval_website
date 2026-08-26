// 評分看板的匿名讀取（瀏覽器端 reload 用；raw fetch + no-store）。
// 首屏由 server-reads 提供（有 fetch 快取），投票後的收斂重載走這裡。

import {
  ID_LIST_CHUNK_SIZE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/esports/constants";
import { chunk } from "@/lib/esports/chunk";
import type { PlayerAverageRow, RatingSummaryRow } from "@/lib/esports/types";

async function select<T>(table: string, params: URLSearchParams): Promise<T[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Accept-Profile": "esports",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows as T[]) : null;
  } catch {
    return null;
  }
}

/** null＝讀取失敗（保留快取值）；[]＝真的沒有列 */
export async function fetchSummaryLive(
  riotMatchID: string
): Promise<RatingSummaryRow | null | "error"> {
  const rows = await select<RatingSummaryRow>(
    "match_rating_summaries",
    new URLSearchParams({ riot_match_id: `eq.${riotMatchID}`, select: "*" })
  );
  if (rows === null) return "error";
  return rows[0] ?? null;
}

export async function fetchPlayerAveragesLive(
  riotMatchID: string
): Promise<PlayerAverageRow[] | null> {
  return select<PlayerAverageRow>(
    "player_rating_averages",
    new URLSearchParams({ riot_match_id: `eq.${riotMatchID}`, select: "*" })
  );
}

/** 賽程瀏覽頁的摘要徽章：整批比賽的評分摘要（分塊 50） */
export async function fetchSummariesLive(
  riotMatchIDs: string[]
): Promise<Record<string, RatingSummaryRow>> {
  const summaries: Record<string, RatingSummaryRow> = {};
  const batches = await Promise.all(
    chunk(riotMatchIDs, ID_LIST_CHUNK_SIZE).map((batch) =>
      select<RatingSummaryRow>(
        "match_rating_summaries",
        new URLSearchParams({
          riot_match_id: `in.(${batch.join(",")})`,
          select: "*",
        })
      )
    )
  );
  for (const rows of batches) {
    for (const row of rows ?? []) summaries[row.riot_match_id] = row;
  }
  return summaries;
}
