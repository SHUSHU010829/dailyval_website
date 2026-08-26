// Riot 賽程（getSchedule）的同構模組：URL 組裝、解析、合併。
// 伺服器端（RSC 首頁）與瀏覽器端（翻頁）共用同一個 URL builder，
// 保證 hl + sport=val + leagueId 跟著每一個請求（含 pageToken 分頁）。

import {
  ESPORTS_API,
  esportsLocale,
  TIER_ONE_LEAGUE_IDS,
} from "@/lib/esports/constants";
import type {
  EsportsMatch,
  EsportsMatchState,
  SchedulePage,
} from "@/lib/esports/types";

export function buildScheduleURL(locale: string, pageToken?: string | null): string {
  const params = new URLSearchParams({
    hl: esportsLocale(locale),
    sport: "val",
    leagueId: TIER_ONE_LEAGUE_IDS.join(","),
  });
  if (pageToken) params.set("pageToken", pageToken);
  return `${ESPORTS_API}/getSchedule?${params.toString()}`;
}

/** Riot 的 logo 走 http，瀏覽器擋 mixed content；同路徑有 TLS 版本 */
function httpsUpgrade(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://");
}

function nilIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseState(feedValue: string | undefined): EsportsMatchState | null {
  switch (feedValue) {
    case "unstarted":
      return "upcoming";
    case "inProgress":
      return "live";
    case "completed":
      return "completed";
    default:
      return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Riot 的 feed 無型別保證，逐欄防禦性讀取 */
export function parseSchedule(json: any): SchedulePage {
  const schedule = json?.data?.schedule;
  const events: any[] = Array.isArray(schedule?.events) ? schedule.events : [];

  const matches: EsportsMatch[] = [];
  for (const event of events) {
    const match = event?.match;
    const state = parseState(event?.state);
    const startTime = Date.parse(event?.startTime ?? "");
    if (
      !match?.id ||
      !Array.isArray(match?.teams) ||
      match.teams.length !== 2 ||
      state === null ||
      Number.isNaN(startTime) ||
      !event?.league?.name
    ) {
      continue;
    }
    matches.push({
      id: String(match.id),
      startTime,
      state,
      league: {
        name: event.league.name,
        slug: event.league.slug ?? "",
        imageURL: httpsUpgrade(event.league.image),
        region: nilIfBlank(event.league.region),
      },
      blockName: nilIfBlank(event.blockName),
      teams: match.teams.map((team: any) => ({
        name: team?.name ?? "",
        code: team?.code ?? "",
        imageURL: httpsUpgrade(team?.image),
        gameWins: team?.result?.gameWins ?? 0,
        outcome:
          team?.result?.outcome === "win" || team?.result?.outcome === "loss"
            ? team.result.outcome
            : null,
        record:
          typeof team?.record?.wins === "number" && typeof team?.record?.losses === "number"
            ? { wins: team.record.wins, losses: team.record.losses }
            : null,
      })),
      bestOf:
        match?.strategy?.type === "bestOf" && typeof match?.strategy?.count === "number"
          ? match.strategy.count
          : null,
    });
  }

  return {
    matches,
    olderToken: schedule?.pages?.older ?? null,
    newerToken: schedule?.pages?.newer ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 順序保持合併：已持有的比賽原位更新（live 比分會動），新比賽依
 * 進來的方向附加。聯賽 chip 依「首次出現順序」衍生，順序不能跳動。
 */
export function mergeMatches(
  held: EsportsMatch[],
  incoming: EsportsMatch[],
  direction: "older" | "newer"
): { matches: EsportsMatch[]; added: number } {
  const heldByID = new Map(held.map((match) => [match.id, match]));
  const fresh: EsportsMatch[] = [];

  const merged = held.map((match) => match);
  for (const match of incoming) {
    if (heldByID.has(match.id)) {
      const index = merged.findIndex((existing) => existing.id === match.id);
      merged[index] = match;
    } else {
      fresh.push(match);
    }
  }

  return {
    matches: direction === "older" ? [...merged, ...fresh] : [...fresh, ...merged],
    added: fresh.length,
  };
}

/** 比賽是否已有比分意義（任一隊有勝場，或狀態非 upcoming） */
export function matchStarted(match: EsportsMatch): boolean {
  return match.state !== "upcoming";
}

/** TBD 佔位隊伍（對戰未定）；比照 iOS hasConfirmedTeams */
export function hasConfirmedTeams(match: EsportsMatch): boolean {
  return (
    match.teams.length === 2 &&
    !match.teams.some((team) => team.code.toUpperCase() === "TBD")
  );
}
