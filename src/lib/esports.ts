// 電競比賽 landing page 的資料層。
// 兩個來源都是唯讀、可匿名存取：
// - Riot 官方電競 API：valorantesports.com 前端出貨的同一把公開 key，非機密
// - Supabase 電競評分後端：publishable key 本來就隨 App 出貨，屬公開資訊
// 任一來源失敗都回 null，頁面退化成純 CTA，不會 500。

const ESPORTS_API =
  "https://esports-api.service.valorantesports.com/persisted/val";
const ESPORTS_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";

const SUPABASE_URL = "https://api.dailyval.com";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-XlgMPv9owXvR5U44oSNEA_gZqeNktv";

export interface EsportsMatchTeam {
  name: string;
  code: string;
  image: string | null;
  gameWins: number;
}

export interface EsportsMatchDetails {
  leagueName: string;
  bestOf: number | null;
  /** 任一局已開打（比分才有意義；否則顯示 vs） */
  started: boolean;
  /** 每一局都已結束（評分窗 kick 的門檻；feed 沒有 startTime 可用） */
  completed: boolean;
  teams: [EsportsMatchTeam, EsportsMatchTeam];
}

export interface EsportsMatchRating {
  avg: number | null;
  voteCount: number;
  commentCount: number;
}

/** Riot 的圖片走 http，瀏覽器會擋 mixed content；同路徑有 TLS 版本 */
function httpsUpgrade(url: string | null): string | null {
  return url ? url.replace(/^http:\/\//, "https://") : null;
}

export async function fetchEsportsMatch(
  id: string,
  locale: string
): Promise<EsportsMatchDetails | null> {
  // hl 只影響聯賽名稱的在地化
  const hl = locale === "zh-TW" ? "zh-TW" : "en-US";
  try {
    const res = await fetch(
      `${ESPORTS_API}/getEventDetails?hl=${hl}&id=${encodeURIComponent(id)}`,
      {
        headers: { "x-api-key": ESPORTS_API_KEY },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const event = json?.data?.event;
    const match = event?.match;
    const teams = match?.teams;
    if (!event?.league?.name || !Array.isArray(teams) || teams.length !== 2) {
      return null;
    }
    const games: Array<{ state?: string }> = Array.isArray(match?.games)
      ? match.games
      : [];
    const mapTeam = (t: {
      name?: string;
      code?: string;
      image?: string;
      result?: { gameWins?: number };
    }): EsportsMatchTeam => ({
      name: t?.name ?? "",
      code: t?.code ?? "",
      image: httpsUpgrade(t?.image ?? null),
      gameWins: t?.result?.gameWins ?? 0,
    });
    return {
      leagueName: event.league.name,
      bestOf:
        typeof match?.strategy?.count === "number" ? match.strategy.count : null,
      started: games.some((g) => g?.state && g.state !== "unstarted"),
      completed: games.length > 0 && games.every((g) => g?.state === "completed"),
      teams: [mapTeam(teams[0]), mapTeam(teams[1])],
    };
  } catch {
    return null;
  }
}

export async function fetchMatchRating(
  id: string
): Promise<EsportsMatchRating | null> {
  try {
    const params = new URLSearchParams({
      riot_match_id: `eq.${id}`,
      select: "match_avg,match_vote_count,comment_count",
    });
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_rating_summaries?${params.toString()}`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Accept-Profile": "esports",
        },
        // 評分會持續變動，快取放短一點
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    return {
      avg: typeof row.match_avg === "number" ? row.match_avg : null,
      voteCount: row.match_vote_count ?? 0,
      commentCount: row.comment_count ?? 0,
    };
  } catch {
    return null;
  }
}
