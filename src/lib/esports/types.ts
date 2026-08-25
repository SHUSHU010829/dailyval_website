// 電競評分的型別，分兩層：
// - wire 層：snake_case、timestamp 保留原始字串。刻意不 camelize——
//   select 字串、keyset cursor 的原字串回傳、.or() filter 全都講
//   snake_case，中間多一層轉換就是 drift 的溫床。
// - view model 層：元件消費的形狀（比照 iOS 的 domain model）。

// ---------- Supabase wire rows ----------

/** esports.match_rating_summaries 一列 */
export interface RatingSummaryRow {
  riot_match_id: string;
  window_open: boolean;
  window_closes_at: string;
  match_avg: number | null;
  match_vote_count: number;
  comment_count: number;
}

/** esports.player_rating_averages 一列 */
export interface PlayerAverageRow {
  riot_match_id: string;
  player_key: string;
  avg_score: number;
  vote_count: number;
}

/** esports.profiles（column-level grant 只讀得到這三欄） */
export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_card_id: string | null;
}

/** esports.comments 一列（帶 author join） */
export interface CommentRow {
  id: string;
  riot_match_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  /** 原始字串；cursor 必須原封不動 round-trip */
  created_at: string;
  player_key: string | null;
  author: ProfileRow | null;
}

/** esports.comment_like_counts 一列 */
export interface CommentLikeCountRow {
  comment_id: string;
  like_count: number;
}

/** esports.comment_heat 一列（熱門排序的 keyset 索引） */
export interface CommentHeatRow {
  riot_match_id: string;
  player_key: string | null;
  comment_id: string;
  like_count: number;
  created_at: string;
}

/** esports.hot_player_comments 一列（每位選手一個亮回覆槽位） */
export interface HotPlayerCommentRow {
  riot_match_id: string;
  player_key: string;
  comment_id: string;
  like_count: number;
}

/** esports.match_stats_public 一列 */
export interface StatsSnapshotRow {
  riot_match_id: string;
  payload: StatsPayload;
  is_final: boolean;
}

// ---------- 快照 payload（schema_version 1，對齊 EsportsStatsSnapshot.swift / derive.ts） ----------

export interface StatsPayload {
  schema_version: number;
  maps_total: number;
  maps_covered: number;
  teams: PayloadTeam[];
  maps: PayloadMap[];
  /** builder 於建置時從賽程 event 拓下的 Riot 官方識別；舊 payload 沒有 */
  riot?: PayloadRiotIdentity | null;
}

export interface PayloadTeam {
  id: number;
  name: string;
  score: number;
  won: boolean;
  players: PayloadPlayer[];
}

export interface PayloadMap {
  sequence: number;
  /** 英文地圖名（"Breeze"），顯示時經 map-name 表在地化 */
  map: string;
  teams: PayloadTeam[];
}

export interface PayloadPlayer {
  /** GRID player id（數字字串）＝ Supabase 的 player_key */
  id: string;
  nickname: string;
  /** 英文特務名，icon 經 normalize 後的表解析 */
  agents: string[];
  photo_url?: string | null;
  rating?: number | null;
  acs?: number | null;
  kills: number;
  deaths: number;
  assists: number;
  kast_percent?: number | null;
  adr?: number | null;
  first_kills?: number | null;
}

export interface PayloadRiotIdentity {
  league?: {
    /** en-US 正名；names 缺語系時的 fallback */
    name: string;
    slug: string;
    icon_url?: string | null;
    /** Riot 官方在地化聯賽名，以 feed locale 為 key */
    names?: Record<string, string> | null;
  } | null;
  /** Riot 官方在地化賽段名（"Week 1" / "第1週"），以 feed locale 為 key */
  block_names?: Record<string, string> | null;
  best_of?: number | null;
  /** 以 payload team 的 id 對應；builder 對不上的隊伍沒有條目 */
  teams: Array<{ team_id: number; code: string; logo_url?: string | null }>;
}

// ---------- Riot 賽程（getSchedule） ----------

export type EsportsMatchState = "upcoming" | "live" | "completed";

export interface EsportsMatchTeam {
  name: string;
  code: string;
  imageURL: string | null;
  gameWins: number;
  outcome: "win" | "loss" | null;
  record: { wins: number; losses: number } | null;
}

export interface EsportsMatchLeague {
  name: string;
  slug: string;
  imageURL: string | null;
  region: string | null;
}

/** VCT 賽程上的一場比賽（比照 iOS EsportsMatch） */
export interface EsportsMatch {
  id: string;
  /** epoch ms */
  startTime: number;
  state: EsportsMatchState;
  league: EsportsMatchLeague;
  blockName: string | null;
  /** 恆為兩隊；對戰未定時可能是 TBD 佔位 */
  teams: EsportsMatchTeam[];
  bestOf: number | null;
}

export interface SchedulePage {
  matches: EsportsMatch[];
  olderToken: string | null;
  newerToken: string | null;
}

// ---------- 計分板 view model ----------

export interface MatchStatsAgent {
  name: string;
  iconURL: string | null;
}

export interface MatchStatsPlayer {
  /** GRID player id（數值），String(id) ＝ player_key */
  id: number;
  playerKey: string;
  nickname: string;
  photoURL: string | null;
  agents: MatchStatsAgent[];
  rating: number | null;
  acs: number | null;
  kills: number;
  deaths: number;
  assists: number;
  kastPercent: number | null;
  adr: number | null;
  firstKills: number;
}

export interface MatchStatsTeam {
  id: number;
  title: string;
  score: number;
  didWin: boolean;
  players: MatchStatsPlayer[];
}

export interface MatchStatsMap {
  id: number;
  /** 已在地化的地圖名 */
  title: string;
  teams: MatchStatsTeam[];
}

export interface MatchStatsViewModel {
  teams: MatchStatsTeam[];
  maps: MatchStatsMap[];
  mapsCovered: number;
  mapsTotal: number;
  isFinal: boolean;
}

// ---------- Cursors ----------

/** 最新排序的 keyset cursor（created_at 原字串 + id） */
export interface NewestCursor {
  createdAtRaw: string;
  id: string;
}

/** 熱門排序的三鍵 cursor；like_count 是會變動的 key，追加時要以 id 去重 */
export interface HeatCursor {
  likeCount: number;
  createdAtRaw: string;
  id: string;
}
