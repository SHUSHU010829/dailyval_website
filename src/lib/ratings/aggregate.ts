// Skin 彙總的純邏輯，語意逐條對齊 iOS SkinRatingService：
// - 歷史資料有同一 skinID 的重複彙總 record：顯示時「全部加總」，
//   寫入時鎖定「最舊的一筆」（兩端的選擇必須一致，否則票數會分家；
//   iOS 曾因此讓 1 票的重複 record 蓋過 244 票的本尊）。
// - 投票對彙總的影響以 delta 表示：新票 (+1, +值)、改票 (0, 新−舊)、
//   同值 no-op。彙總永遠是「重抓最新值 + delta」的 CAS 寫入，絕不能
//   把加總後的顯示值寫回去。

import type { SkinAggregate } from "@/lib/cloudkit/types";

export interface MergedAggregate {
  ratingCount: number;
  ratingSum: number;
  /** 寫入目標：最舊的 record（無資料時為 null） */
  writeTarget: SkinAggregate | null;
}

/** 依建立時間由舊到新排序；缺時間戳的排最後，並以 recordName 決勝保持穩定 */
export function oldestFirst(records: SkinAggregate[]): SkinAggregate[] {
  return [...records].sort((a, b) => {
    const timeA = a.createdAt ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.createdAt ?? Number.MAX_SAFE_INTEGER;
    if (timeA !== timeB) return timeA - timeB;
    return a.recordName < b.recordName ? -1 : a.recordName > b.recordName ? 1 : 0;
  });
}

export function mergeAggregates(records: SkinAggregate[]): MergedAggregate {
  if (records.length === 0) {
    return { ratingCount: 0, ratingSum: 0, writeTarget: null };
  }
  const sorted = oldestFirst(records);
  return {
    ratingCount: sorted.reduce((total, record) => total + record.ratingCount, 0),
    ratingSum: sorted.reduce((total, record) => total + record.ratingSum, 0),
    writeTarget: sorted[0],
  };
}

export interface RatingDelta {
  countDelta: number;
  sumDelta: number;
}

/**
 * 投票 → 彙總 delta。回傳 null 表示 no-op（同值重投），不該發任何寫入。
 * oldValue 為 null 表示這位使用者的第一票。
 */
export function computeDelta(oldValue: number | null, newValue: number): RatingDelta | null {
  if (oldValue === null) {
    return { countDelta: 1, sumDelta: newValue };
  }
  if (oldValue === newValue) return null;
  return { countDelta: 0, sumDelta: newValue - oldValue };
}

/** 平均分數；沒有票數時回 0（與 iOS 的顯示一致） */
export function averageOf(ratingCount: number, ratingSum: number): number {
  return ratingCount > 0 ? ratingSum / ratingCount : 0;
}
