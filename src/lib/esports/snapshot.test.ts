import { describe, expect, it } from "vitest";
import {
  buildStatsViewModel,
  byRatingThenACS,
  matchFromSnapshot,
  normalizeAgentName,
  teamCodeFromName,
} from "./snapshot";
import type { MatchStatsPlayer, StatsPayload } from "./types";

function player(overrides: Partial<MatchStatsPlayer>): MatchStatsPlayer {
  return {
    id: 1,
    playerKey: "1",
    nickname: "p",
    photoURL: null,
    agents: [],
    rating: null,
    acs: null,
    kills: 0,
    deaths: 0,
    assists: 0,
    kastPercent: null,
    adr: null,
    firstKills: 0,
    ...overrides,
  };
}

const payload: StatsPayload = {
  schema_version: 1,
  maps_total: 3,
  maps_covered: 3,
  teams: [
    {
      id: 10,
      name: "TYLOO",
      score: 1,
      won: false,
      players: [
        { id: "201", nickname: "loser1", agents: ["Jett"], kills: 10, deaths: 15, assists: 2, rating: 0.8, acs: 180 },
      ],
    },
    {
      id: 11,
      name: "FULL SENSE",
      score: 2,
      won: true,
      players: [
        { id: "101", nickname: "star", agents: ["KAY/O"], kills: 20, deaths: 10, assists: 5, rating: 1.3, acs: 250 },
        { id: "not-numeric", nickname: "ghost", agents: [], kills: 0, deaths: 0, assists: 0 },
        { id: "102", nickname: "acsOnly", agents: ["Omen"], kills: 15, deaths: 12, assists: 8, acs: 210 },
      ],
    },
  ],
  maps: [
    {
      sequence: 1,
      map: "Breeze",
      teams: [
        { id: 10, name: "TYLOO", score: 5, won: false, players: [] },
        { id: 11, name: "FULL SENSE", score: 13, won: true, players: [] },
      ],
    },
  ],
  riot: {
    league: {
      name: "VCT Pacific",
      slug: "vct_pacific",
      icon_url: "https://cdn/league.png",
      names: { "zh-TW": "太平洋聯賽", "en-US": "VCT Pacific" },
    },
    block_names: { "zh-TW": "第1週", "en-US": "Week 1" },
    best_of: 3,
    teams: [{ team_id: 11, code: "FS", logo_url: "https://cdn/fs.png" }],
  },
};

describe("normalizeAgentName", () => {
  it('"KAY/O" → "kayo"，與 payload 產生端同一套摺疊', () => {
    expect(normalizeAgentName("KAY/O")).toBe("kayo");
    expect(normalizeAgentName("Jett")).toBe("jett");
  });
});

describe("byRatingThenACS", () => {
  it("rating 成對比 rating、單邊有 rating 優先、都沒有比 ACS", () => {
    const high = player({ rating: 1.3 });
    const low = player({ rating: 0.8 });
    const acsOnly = player({ acs: 250 });
    const acsLow = player({ acs: 100 });
    expect([low, high].sort(byRatingThenACS)[0]).toBe(high);
    expect([acsOnly, high].sort(byRatingThenACS)[0]).toBe(high);
    expect([acsLow, acsOnly].sort(byRatingThenACS)[0]).toBe(acsOnly);
  });
});

describe("buildStatsViewModel", () => {
  it("勝隊在前、選手依 rating→ACS 排序、非數字 id 丟棄、地圖名在地化", () => {
    const vm = buildStatsViewModel(payload, true, { kayo: "https://icon/kayo.png" }, { Breeze: "熱帶樂園" });
    expect(vm).not.toBeNull();
    expect(vm!.teams[0].title).toBe("FULL SENSE");
    expect(vm!.teams[0].players.map((p) => p.nickname)).toEqual(["star", "acsOnly"]);
    expect(vm!.teams[0].players[0].agents[0].iconURL).toBe("https://icon/kayo.png");
    expect(vm!.maps[0].title).toBe("熱帶樂園");
    expect(vm!.maps[0].teams[0].title).toBe("FULL SENSE");
    expect(vm!.isFinal).toBe(true);
  });

  it("未知 schema_version 回 null——絕不出現讀一半的計分板", () => {
    expect(buildStatsViewModel({ ...payload, schema_version: 2 }, true, {}, {})).toBeNull();
  });
});

describe("matchFromSnapshot", () => {
  it("以內嵌 Riot 識別合成賽程頭：在地化聯賽名、官方代號、logo", () => {
    const synthesized = matchFromSnapshot("115", payload, true, "zh-TW");
    expect(synthesized.league.name).toBe("太平洋聯賽");
    expect(synthesized.blockName).toBe("第1週");
    expect(synthesized.state).toBe("completed");
    expect(synthesized.startTime).toBe(0);
    const fullSense = synthesized.teams.find((team) => team.name === "FULL SENSE")!;
    expect(fullSense.code).toBe("FS");
    expect(fullSense.imageURL).toBe("https://cdn/fs.png");
    expect(fullSense.outcome).toBe("win");
    expect(synthesized.bestOf).toBe(3);
  });

  it("識別缺席的隊伍退到縮寫；整塊 riot 缺席退到 VCT 標籤", () => {
    const tyloo = matchFromSnapshot("115", payload, true, "en").teams.find(
      (team) => team.name === "TYLOO"
    )!;
    expect(tyloo.code).toBe("TYLO");

    const bare = matchFromSnapshot("115", { ...payload, riot: null }, false, "en");
    expect(bare.league.name).toBe("VCT");
    expect(bare.state).toBe("live");
    expect(bare.teams.find((team) => team.name === "FULL SENSE")!.code).toBe("FS");
    // won: true 即為 win（live 也標）；輸的那邊要等 isFinal 才標 loss
    expect(bare.teams.find((team) => team.name === "FULL SENSE")!.outcome).toBe("win");
    expect(bare.teams.find((team) => team.name === "TYLOO")!.outcome).toBeNull();
  });
});

describe("teamCodeFromName", () => {
  it('"FULL SENSE" → "FS"、"TYLOO" → "TYLO"、"T1" → "T1"', () => {
    expect(teamCodeFromName("FULL SENSE")).toBe("FS");
    expect(teamCodeFromName("TYLOO")).toBe("TYLO");
    expect(teamCodeFromName("T1")).toBe("T1");
  });
});
