// 電競評分的常數集中地。
// 兩把 key 都是公開資訊：Riot key 是 valorantesports.com 前端出貨的
// 同一把；Supabase publishable key 本來就隨 App 出貨（RLS 是安全邊界）。

export const ESPORTS_API =
  "https://esports-api.service.valorantesports.com/persisted/val";
export const ESPORTS_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";

export const SUPABASE_URL = "https://api.dailyval.com";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_-XlgMPv9owXvR5U44oSNEA_gZqeNktv";

/**
 * Tier-1 聯賽（與 iOS EsportsViewModel.tierOneLeagueIDs 同一份清單）。
 * 注意：sport=val 與 leagueId 必須跟著「每一個」請求（含 pageToken 分頁），
 * pageToken 不會記住原本的查詢條件；漏帶 sport 會默默回英雄聯盟的資料。
 */
export const TIER_ONE_LEAGUE_IDS = [
  "107254585505459304", // Champions
  "109940824119741550", // VALORANT Masters
  "109974795266458277", // VCT Americas
  "106109559530232966", // VCT EMEA
  "109974804058058602", // VCT Pacific
  "111691194187846945", // VCT CN
  "109222784797127274", // Game Changers Championship
] as const;

/** 網站語系 → Riot feed 的 hl（僅網站支援的兩個語系） */
export function esportsLocale(locale: string): string {
  return locale === "zh-TW" ? "zh-TW" : "en-US";
}

/** 留言 keyset 分頁的每頁筆數（iOS pageSize 同值） */
export const COMMENTS_PAGE_SIZE = 30;

/** id 清單查詢的分塊上限（Cloudflare 的 32KB URI 上限，iOS likeReadChunkSize 同值） */
export const ID_LIST_CHUNK_SIZE = 50;

/**
 * 亮回覆門檻（iOS 走 Firebase RC esports_hot_min_likes，預設 3）。
 * 網頁端不為一個整數引入 Firebase：以環境變數調整，改值重佈署即可。
 */
export const HOT_MIN_LIKES = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_ESPORTS_HOT_MIN_LIKES);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
})();

/** 留言查詢的固定 select（author join 必須指名 FK，否則 PGRST201 歧義） */
export const COMMENT_COLUMNS =
  "id, riot_match_id, parent_id, user_id, body, created_at, player_key, " +
  "author:profiles!comments_user_id_fkey(id, display_name, avatar_card_id)";

/** playercard 小圖（uuid 必須小寫，media CDN 的路徑大小寫敏感） */
export function playerCardSmallArtURL(cardID: string): string {
  return `https://media.valorant-api.com/playercards/${cardID.toLowerCase()}/smallart.png`;
}
