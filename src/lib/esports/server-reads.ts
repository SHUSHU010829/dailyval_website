// 電競資料的伺服器端匿名讀取（RSC 用）。
// 沿用 src/lib/esports.ts 的 raw fetch 模式：Accept-Profile: esports +
// next.revalidate。任一來源失敗回 null/空，頁面退化不 500。

import {
  ESPORTS_API_KEY,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/esports/constants";
import { buildScheduleURL, parseSchedule } from "@/lib/esports/schedule";
import type {
  PlayerAverageRow,
  RatingSummaryRow,
  SchedulePage,
  StatsSnapshotRow,
} from "@/lib/esports/types";

async function supabaseSelect<T>(
  table: string,
  params: URLSearchParams,
  revalidateSeconds: number
): Promise<T[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Accept-Profile": "esports",
      },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows as T[]) : null;
  } catch {
    return null;
  }
}

/** 評分摘要（含 48 小時窗的截止時間）。沒有列＝窗還沒開或功能關閉。 */
export async function fetchSummary(riotMatchID: string): Promise<RatingSummaryRow | null> {
  const rows = await supabaseSelect<RatingSummaryRow>(
    "match_rating_summaries",
    new URLSearchParams({ riot_match_id: `eq.${riotMatchID}`, select: "*" }),
    60
  );
  return rows?.[0] ?? null;
}

/** 每位選手的平均分 */
export async function fetchPlayerAverages(riotMatchID: string): Promise<PlayerAverageRow[]> {
  const rows = await supabaseSelect<PlayerAverageRow>(
    "player_rating_averages",
    new URLSearchParams({ riot_match_id: `eq.${riotMatchID}`, select: "*" }),
    60
  );
  return rows ?? [];
}

/** 伺服器建置的統計快照（可能到 512KB；只在伺服器端讀，映射後才進 props） */
export async function fetchStatsSnapshot(riotMatchID: string): Promise<StatsSnapshotRow | null> {
  const rows = await supabaseSelect<StatsSnapshotRow>(
    "match_stats_public",
    new URLSearchParams({
      riot_match_id: `eq.${riotMatchID}`,
      select: "riot_match_id,payload,is_final",
    }),
    300
  );
  return rows?.[0] ?? null;
}

/** 快照 fallback 用的聯賽 slug */
export async function fetchKnownLeagueSlug(riotMatchID: string): Promise<string | null> {
  const rows = await supabaseSelect<{ league_slug: string | null }>(
    "known_matches",
    new URLSearchParams({
      riot_match_id: `eq.${riotMatchID}`,
      select: "league_slug",
      limit: "1",
    }),
    3600
  );
  return rows?.[0]?.league_slug ?? null;
}

/** 賽程一頁（RSC 首頁用；瀏覽器端翻頁走同一個 URL builder 直連 Riot） */
export async function fetchSchedulePage(
  locale: string,
  pageToken?: string | null
): Promise<SchedulePage | null> {
  try {
    const res = await fetch(buildScheduleURL(locale, pageToken), {
      headers: { "x-api-key": ESPORTS_API_KEY },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return parseSchedule(await res.json());
  } catch {
    return null;
  }
}

// ---------- valorant-api 資產表（小回應，直接走 fetch cache） ----------

/** normalize 後的特務名 → displayIcon URL */
export async function getAgentIconTable(): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      "https://valorant-api.com/v1/agents?isPlayableCharacter=true",
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return {};
    const json = await res.json();
    const table: Record<string, string> = {};
    for (const agent of json?.data ?? []) {
      if (typeof agent?.displayName === "string" && typeof agent?.displayIcon === "string") {
        table[agent.displayName.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")] =
          agent.displayIcon;
      }
    }
    return table;
  } catch {
    return {};
  }
}

/** 英文地圖名 → 目標語系的官方譯名（?language=all 一次拿齊，挑一個語系） */
export async function getMapNameTable(locale: string): Promise<Record<string, string>> {
  const apiLocale = locale === "zh-TW" ? "zh-TW" : "en-US";
  try {
    const res = await fetch("https://valorant-api.com/v1/maps?language=all", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    const json = await res.json();
    const table: Record<string, string> = {};
    for (const map of json?.data ?? []) {
      const english = map?.displayName?.["en-US"];
      if (typeof english === "string") {
        table[english] = map.displayName?.[apiLocale] ?? english;
      }
    }
    return table;
  } catch {
    return {};
  }
}
