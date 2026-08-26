// 排行榜的純邏輯：目錄 × 彙總 join、四種排序（含決勝規則）、搜尋、
// 武器過濾、20/頁分頁。語意逐條對齊 iOS AllSkinsRatingViewModel。

import { averageOf } from "@/lib/ratings/aggregate";
import type { SkinCatalogEntry } from "@/lib/ratings/skin-catalog";

export const LEADERBOARD_PAGE_SIZE = 20;

export type LeaderboardSort =
  | "mostPopular"
  | "highestRating"
  | "tier"
  | "alphabetical";

/** iOS 預設排序是 Most Popular */
export const DEFAULT_LEADERBOARD_SORT: LeaderboardSort = "mostPopular";

export interface LeaderboardItem extends SkinCatalogEntry {
  ratingCount: number;
  ratingSum: number;
  averageRating: number;
}

export interface AggregateTotals {
  ratingCount: number;
  ratingSum: number;
}

/** 目錄 join 彙總；沒被評分過的造型以 0 呈現（iOS 同樣列出全部） */
export function buildLeaderboard(
  catalog: SkinCatalogEntry[],
  aggregatesBySkinID: Map<string, AggregateTotals>
): LeaderboardItem[] {
  return catalog.map((entry) => {
    const totals = aggregatesBySkinID.get(entry.id);
    const ratingCount = totals?.ratingCount ?? 0;
    const ratingSum = totals?.ratingSum ?? 0;
    return {
      ...entry,
      ratingCount,
      ratingSum,
      averageRating: averageOf(ratingCount, ratingSum),
    };
  });
}

export interface LeaderboardFilter {
  sort: LeaderboardSort;
  /** 搜尋比對造型名稱「或」武器名稱，不分大小寫 */
  search?: string;
  weaponId?: string | null;
  locale: string;
}

export function filterAndSortLeaderboard(
  items: LeaderboardItem[],
  { sort, search, weaponId, locale }: LeaderboardFilter
): LeaderboardItem[] {
  let result = items;

  if (weaponId) {
    result = result.filter((item) => item.weaponId === weaponId);
  }

  const query = search?.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.weaponName.toLowerCase().includes(query)
    );
  }

  const sorted = [...result];
  switch (sort) {
    case "highestRating":
      // 同分以票數多者在前
      sorted.sort((a, b) =>
        a.averageRating !== b.averageRating
          ? b.averageRating - a.averageRating
          : b.ratingCount - a.ratingCount
      );
      break;
    case "mostPopular":
      // 同票數以平均分高者在前
      sorted.sort((a, b) =>
        a.ratingCount !== b.ratingCount
          ? b.ratingCount - a.ratingCount
          : b.averageRating - a.averageRating
      );
      break;
    case "tier":
      // 稀有度高在前，同稀有度以平均分決勝
      sorted.sort((a, b) =>
        a.tierRank !== b.tierRank
          ? b.tierRank - a.tierRank
          : b.averageRating - a.averageRating
      );
      break;
    case "alphabetical":
      sorted.sort((a, b) => a.name.localeCompare(b.name, locale));
      break;
  }
  return sorted;
}

export interface LeaderboardPage {
  items: LeaderboardItem[];
  hasMore: boolean;
}

/** 前 pageCount 頁的內容（配合「載入更多」的累積式分頁） */
export function leaderboardPage(
  items: LeaderboardItem[],
  pageCount: number,
  pageSize: number = LEADERBOARD_PAGE_SIZE
): LeaderboardPage {
  const visible = Math.max(1, pageCount) * pageSize;
  return {
    items: items.slice(0, visible),
    hasMore: items.length > visible,
  };
}

/** 過濾用的武器清單（依目錄出現順序去重） */
export function weaponOptions(
  items: LeaderboardItem[]
): Array<{ id: string; name: string }> {
  const seen = new Set<string>();
  const options: Array<{ id: string; name: string }> = [];
  for (const item of items) {
    if (seen.has(item.weaponId)) continue;
    seen.add(item.weaponId);
    options.push({ id: item.weaponId, name: item.weaponName });
  }
  return options;
}
