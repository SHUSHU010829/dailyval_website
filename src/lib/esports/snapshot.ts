// 快照 payload（schema_version 1）→ 計分板 view model 的映射。
// 純函數：agent icon 表與地圖名表由呼叫端傳入，方便單元測試。
// 語意逐條對齊 iOS EsportsStatsSnapshot.swift：
// - 未知 schema_version 回 null——寧可顯示「暫無資料」也不能出現
//   讀了一半的計分板
// - 隊伍勝者在前、選手 rating 優先 ACS 其次
// - 選手 id 非數字整筆丟棄（無法成為 player_key 的選手不可能被投票）

import { esportsLocale } from "@/lib/esports/constants";
import type {
  EsportsMatch,
  MatchStatsPlayer,
  MatchStatsTeam,
  MatchStatsViewModel,
  PayloadPlayer,
  PayloadTeam,
  StatsPayload,
} from "@/lib/esports/types";

/** "KAY/O" → "kayo"；與 payload 產生端同一套摺疊規則 */
export function normalizeAgentName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** rating 有值先比 rating，否則比 ACS——計分板的正典排序 */
export function byRatingThenACS(a: MatchStatsPlayer, b: MatchStatsPlayer): number {
  if (a.rating !== null && b.rating !== null && a.rating !== b.rating) {
    return b.rating - a.rating;
  }
  if (a.rating !== null && b.rating === null) return -1;
  if (a.rating === null && b.rating !== null) return 1;
  return (b.acs ?? 0) - (a.acs ?? 0);
}

function mapPlayer(
  payload: PayloadPlayer,
  agentIcons: Record<string, string>
): MatchStatsPlayer | null {
  // id 必須是純數字（round-trip 成 player_key）
  if (!/^\d+$/.test(payload.id)) return null;
  return {
    id: Number(payload.id),
    playerKey: payload.id,
    nickname: payload.nickname,
    photoURL: payload.photo_url ?? null,
    agents: payload.agents.map((name) => ({
      name,
      iconURL: agentIcons[normalizeAgentName(name)] ?? null,
    })),
    rating: payload.rating ?? null,
    acs: payload.acs ?? null,
    kills: payload.kills,
    deaths: payload.deaths,
    assists: payload.assists,
    kastPercent: payload.kast_percent ?? null,
    adr: payload.adr ?? null,
    firstKills: payload.first_kills ?? 0,
  };
}

function mapTeam(payload: PayloadTeam, agentIcons: Record<string, string>): MatchStatsTeam {
  return {
    id: payload.id,
    title: payload.name,
    score: payload.score,
    didWin: payload.won,
    players: payload.players
      .map((player) => mapPlayer(player, agentIcons))
      .filter((player): player is MatchStatsPlayer => player !== null)
      .sort(byRatingThenACS),
  };
}

/** 勝者在前的穩定排序 */
function wonFirst(teams: MatchStatsTeam[]): MatchStatsTeam[] {
  return [...teams].sort((a, b) => Number(b.didWin) - Number(a.didWin));
}

export function buildStatsViewModel(
  payload: StatsPayload,
  isFinal: boolean,
  agentIcons: Record<string, string>,
  mapNames: Record<string, string>
): MatchStatsViewModel | null {
  if (payload.schema_version !== 1) return null;
  return {
    teams: wonFirst(payload.teams.map((team) => mapTeam(team, agentIcons))),
    maps: payload.maps.map((map) => ({
      id: map.sequence,
      title: mapNames[map.map] ?? map.map,
      teams: wonFirst(map.teams.map((team) => mapTeam(team, agentIcons))),
    })),
    mapsCovered: payload.maps_covered,
    mapsTotal: payload.maps_total,
    isFinal,
  };
}

/** "FULL SENSE" → "FS"、"TYLOO" → "TYLO"：官方代號拿不到時最誠實的替身 */
export function teamCodeFromName(name: string): string {
  const words = name.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return words.map((word) => word[0]).join("").toUpperCase();
  }
  return name.slice(0, 4).toUpperCase();
}

/**
 * 快照 fallback：feed 已經查不到的比賽（老分享連結），以 payload 內嵌的
 * Riot 官方識別合成賽程頭（iOS EsportsMatch.init(snapshotID:…) 的對應）。
 * startTime 刻意設為 0（遠古）：唯一讀它的是「剛完賽的 window kick」，
 * 走到這條路的比賽絕不該觸發 kick。
 */
export function matchFromSnapshot(
  snapshotID: string,
  payload: StatsPayload,
  isFinal: boolean,
  locale: string
): EsportsMatch {
  const feedLocale = esportsLocale(locale);
  const league = payload.riot?.league;

  return {
    id: snapshotID,
    startTime: 0,
    state: isFinal ? "completed" : "live",
    league: {
      name: league ? league.names?.[feedLocale] ?? league.name : "VCT",
      slug: league?.slug ?? "",
      imageURL: league?.icon_url ?? null,
      region: null,
    },
    blockName:
      payload.riot?.block_names?.[feedLocale] ??
      payload.riot?.block_names?.["en-US"] ??
      null,
    teams: payload.teams.map((team) => {
      const identity = payload.riot?.teams.find((entry) => entry.team_id === team.id);
      return {
        name: team.name,
        code: identity?.code ?? teamCodeFromName(team.name),
        imageURL: identity?.logo_url ?? null,
        gameWins: team.score,
        outcome: team.won ? "win" : isFinal ? "loss" : null,
        record: null,
      };
    }),
    bestOf: payload.riot?.best_of ?? null,
  };
}
