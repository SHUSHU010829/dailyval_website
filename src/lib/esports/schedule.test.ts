import { describe, expect, it } from "vitest";
import {
  buildScheduleURL,
  hasConfirmedTeams,
  mergeMatches,
  parseSchedule,
} from "./schedule";
import type { EsportsMatch } from "./types";

function match(overrides: Partial<EsportsMatch>): EsportsMatch {
  return {
    id: "1",
    startTime: 0,
    state: "completed",
    league: { name: "VCT Pacific", slug: "vct_pacific", imageURL: null, region: null },
    blockName: null,
    teams: [
      { name: "A", code: "A", imageURL: null, gameWins: 0, outcome: null, record: null },
      { name: "B", code: "B", imageURL: null, gameWins: 0, outcome: null, record: null },
    ],
    bestOf: 3,
    ...overrides,
  };
}

describe("buildScheduleURL", () => {
  it("每個請求都帶 hl + sport=val + leagueId（含分頁；pageToken 不會記住條件）", () => {
    const first = new URL(buildScheduleURL("zh-TW"));
    expect(first.searchParams.get("hl")).toBe("zh-TW");
    expect(first.searchParams.get("sport")).toBe("val");
    expect(first.searchParams.get("leagueId")).toContain("107254585505459304");
    expect(first.searchParams.get("pageToken")).toBeNull();

    const paged = new URL(buildScheduleURL("en", "token123"));
    expect(paged.searchParams.get("sport")).toBe("val");
    expect(paged.searchParams.get("hl")).toBe("en-US");
    expect(paged.searchParams.get("leagueId")).not.toBeNull();
    expect(paged.searchParams.get("pageToken")).toBe("token123");
  });
});

describe("parseSchedule", () => {
  const event = {
    startTime: "2026-07-12T19:00:00Z",
    state: "completed",
    blockName: "Week 3",
    league: { name: "VCT Pacific", slug: "vct_pacific", image: "http://cdn/logo.png", region: "" },
    match: {
      id: "115581244955660707",
      strategy: { type: "bestOf", count: 3 },
      teams: [
        { name: "T1", code: "T1", image: "http://cdn/t1.png", result: { outcome: "win", gameWins: 2 } },
        { name: "TYLOO", code: "TYL", result: { outcome: "loss", gameWins: 1 } },
      ],
    },
  };

  it("解析事件，http 圖檔升級成 https，空白 region 轉 null", () => {
    const page = parseSchedule({ data: { schedule: { events: [event], pages: { older: "o1", newer: null } } } });
    expect(page.olderToken).toBe("o1");
    expect(page.newerToken).toBeNull();
    expect(page.matches).toHaveLength(1);
    const parsed = page.matches[0];
    expect(parsed.id).toBe("115581244955660707");
    expect(parsed.state).toBe("completed");
    expect(parsed.league.imageURL).toBe("https://cdn/logo.png");
    expect(parsed.league.region).toBeNull();
    expect(parsed.teams[0]).toMatchObject({ code: "T1", gameWins: 2, outcome: "win" });
    expect(parsed.bestOf).toBe(3);
  });

  it("缺 match、隊伍數不對、未知 state 的事件整筆略過", () => {
    const bad = [
      { ...event, match: undefined },
      { ...event, match: { ...event.match, teams: [event.match.teams[0]] } },
      { ...event, state: "postponed" },
    ];
    const page = parseSchedule({ data: { schedule: { events: bad } } });
    expect(page.matches).toHaveLength(0);
  });

  it("showMatches 非 bestOf 的 strategy 視為無 bestOf", () => {
    const noBestOf = { ...event, match: { ...event.match, strategy: { type: "playAll", count: 5 } } };
    const page = parseSchedule({ data: { schedule: { events: [noBestOf] } } });
    expect(page.matches[0].bestOf).toBeNull();
  });
});

describe("mergeMatches", () => {
  it("已持有的比賽原位更新（live 比分變動），順序不動", () => {
    const held = [match({ id: "1" }), match({ id: "2" })];
    const updated = match({ id: "2", state: "live" });
    const { matches, added } = mergeMatches(held, [updated], "older");
    expect(added).toBe(0);
    expect(matches.map((entry) => entry.id)).toEqual(["1", "2"]);
    expect(matches[1].state).toBe("live");
  });

  it("較舊方向附加在尾端，較新方向插在前端", () => {
    const held = [match({ id: "2" })];
    expect(
      mergeMatches(held, [match({ id: "3" })], "older").matches.map((entry) => entry.id)
    ).toEqual(["2", "3"]);
    expect(
      mergeMatches(held, [match({ id: "1" })], "newer").matches.map((entry) => entry.id)
    ).toEqual(["1", "2"]);
  });
});

describe("hasConfirmedTeams", () => {
  it("TBD 佔位視為未定", () => {
    expect(hasConfirmedTeams(match({}))).toBe(true);
    const tbd = match({});
    tbd.teams[1] = { ...tbd.teams[1], code: "tbd" };
    expect(hasConfirmedTeams(tbd)).toBe(false);
  });
});
