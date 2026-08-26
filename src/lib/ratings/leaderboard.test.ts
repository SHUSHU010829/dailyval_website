import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  filterAndSortLeaderboard,
  leaderboardPage,
  weaponOptions,
  type LeaderboardItem,
} from "./leaderboard";
import type { SkinCatalogEntry } from "./skin-catalog";

function entry(overrides: Partial<SkinCatalogEntry>): SkinCatalogEntry {
  return {
    id: "id",
    name: "Skin",
    weaponId: "weapon",
    weaponName: "Vandal",
    tierRank: 0,
    tierIcon: null,
    tierColor: null,
    image: null,
    ...overrides,
  };
}

function item(overrides: Partial<LeaderboardItem>): LeaderboardItem {
  return {
    ...entry({}),
    ratingCount: 0,
    ratingSum: 0,
    averageRating: 0,
    ...overrides,
  };
}

describe("buildLeaderboard", () => {
  it("join 彙總並算平均；沒被評過的造型以 0 呈現", () => {
    const catalog = [entry({ id: "a" }), entry({ id: "b" })];
    const aggregates = new Map([["a", { ratingCount: 4, ratingSum: 18 }]]);
    const board = buildLeaderboard(catalog, aggregates);
    expect(board[0]).toMatchObject({ id: "a", ratingCount: 4, averageRating: 4.5 });
    expect(board[1]).toMatchObject({ id: "b", ratingCount: 0, averageRating: 0 });
  });
});

describe("filterAndSortLeaderboard", () => {
  const items = [
    item({ id: "a", name: "Araxys", weaponName: "Vandal", weaponId: "w-vandal", averageRating: 4.2, ratingCount: 10, tierRank: 4 }),
    item({ id: "b", name: "Prime", weaponName: "Phantom", weaponId: "w-phantom", averageRating: 4.2, ratingCount: 30, tierRank: 3 }),
    item({ id: "c", name: "Reaver", weaponName: "Vandal", weaponId: "w-vandal", averageRating: 4.8, ratingCount: 30, tierRank: 3 }),
  ];
  const base = { search: "", weaponId: null, locale: "en" };

  it("highestRating：同分以票數決勝", () => {
    const sorted = filterAndSortLeaderboard(items, { ...base, sort: "highestRating" });
    expect(sorted.map((entry) => entry.id)).toEqual(["c", "b", "a"]);
  });

  it("mostPopular：同票數以平均分決勝", () => {
    const sorted = filterAndSortLeaderboard(items, { ...base, sort: "mostPopular" });
    expect(sorted.map((entry) => entry.id)).toEqual(["c", "b", "a"]);
  });

  it("tier：稀有度高在前，同稀有度以平均分決勝", () => {
    const sorted = filterAndSortLeaderboard(items, { ...base, sort: "tier" });
    expect(sorted.map((entry) => entry.id)).toEqual(["a", "c", "b"]);
  });

  it("alphabetical：依語系比字", () => {
    const sorted = filterAndSortLeaderboard(items, { ...base, sort: "alphabetical" });
    expect(sorted.map((entry) => entry.name)).toEqual(["Araxys", "Prime", "Reaver"]);
  });

  it("搜尋同時比對造型與武器名稱，不分大小寫", () => {
    const byySkin = filterAndSortLeaderboard(items, { ...base, sort: "mostPopular", search: "prime" });
    expect(byySkin.map((entry) => entry.id)).toEqual(["b"]);
    const byWeapon = filterAndSortLeaderboard(items, { ...base, sort: "mostPopular", search: "VANDAL" });
    expect(byWeapon.map((entry) => entry.id)).toEqual(["c", "a"]);
  });

  it("武器過濾", () => {
    const filtered = filterAndSortLeaderboard(items, { ...base, sort: "mostPopular", weaponId: "w-phantom" });
    expect(filtered.map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("leaderboardPage", () => {
  it("累積式分頁：pageCount 頁 × 20 筆，並回報 hasMore", () => {
    const items = Array.from({ length: 45 }, (_, index) => item({ id: `${index}` }));
    expect(leaderboardPage(items, 1)).toMatchObject({ hasMore: true });
    expect(leaderboardPage(items, 1).items).toHaveLength(20);
    expect(leaderboardPage(items, 2).items).toHaveLength(40);
    expect(leaderboardPage(items, 3)).toMatchObject({ hasMore: false });
    expect(leaderboardPage(items, 3).items).toHaveLength(45);
  });
});

describe("weaponOptions", () => {
  it("依出現順序去重", () => {
    const options = weaponOptions([
      item({ weaponId: "w1", weaponName: "Vandal" }),
      item({ weaponId: "w2", weaponName: "Phantom" }),
      item({ weaponId: "w1", weaponName: "Vandal" }),
    ]);
    expect(options).toEqual([
      { id: "w1", name: "Vandal" },
      { id: "w2", name: "Phantom" },
    ]);
  });
});
