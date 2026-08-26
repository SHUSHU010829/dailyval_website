import { describe, expect, it } from "vitest";
import { averageOf, computeDelta, mergeAggregates, oldestFirst } from "./aggregate";
import type { SkinAggregate } from "@/lib/cloudkit/types";

function aggregate(overrides: Partial<SkinAggregate>): SkinAggregate {
  return {
    recordName: "skin-test",
    recordChangeTag: "tag",
    skinID: "skin-uuid",
    ratingCount: 0,
    ratingSum: 0,
    createdAt: 0,
    ...overrides,
  };
}

describe("mergeAggregates", () => {
  it("空清單回零值且沒有寫入目標", () => {
    const merged = mergeAggregates([]);
    expect(merged).toEqual({ ratingCount: 0, ratingSum: 0, writeTarget: null });
  });

  it("重複 record 顯示值加總、寫入目標選最舊（iOS 的 244 票 bug 場景）", () => {
    // 情境重現：1 票的新重複 record 絕不能取代 244 票的本尊
    const legacy = aggregate({
      recordName: "8F0-legacy",
      ratingCount: 244,
      ratingSum: 1000,
      createdAt: 1000,
    });
    const duplicate = aggregate({
      recordName: "skin-abc",
      ratingCount: 1,
      ratingSum: 5,
      createdAt: 2000,
    });
    const merged = mergeAggregates([duplicate, legacy]);
    expect(merged.ratingCount).toBe(245);
    expect(merged.ratingSum).toBe(1005);
    expect(merged.writeTarget?.recordName).toBe("8F0-legacy");
  });

  it("缺建立時間的 record 排最後，不會被選為寫入目標", () => {
    const dated = aggregate({ recordName: "b", createdAt: 500 });
    const undated = aggregate({ recordName: "a", createdAt: null });
    expect(mergeAggregates([undated, dated]).writeTarget?.recordName).toBe("b");
  });

  it("同時間戳以 recordName 決勝，排序穩定", () => {
    const first = aggregate({ recordName: "a", createdAt: 100 });
    const second = aggregate({ recordName: "b", createdAt: 100 });
    expect(oldestFirst([second, first]).map((record) => record.recordName)).toEqual(["a", "b"]);
  });
});

describe("computeDelta", () => {
  it("第一票：count +1、sum +值", () => {
    expect(computeDelta(null, 4)).toEqual({ countDelta: 1, sumDelta: 4 });
  });

  it("改票：count 不變、sum 差值", () => {
    expect(computeDelta(2, 5)).toEqual({ countDelta: 0, sumDelta: 3 });
    expect(computeDelta(5, 2)).toEqual({ countDelta: 0, sumDelta: -3 });
  });

  it("同值重投是 no-op，不該發任何寫入", () => {
    expect(computeDelta(3, 3)).toBeNull();
  });
});

describe("averageOf", () => {
  it("有票數時為 sum/count，沒票數回 0", () => {
    expect(averageOf(4, 18)).toBeCloseTo(4.5);
    expect(averageOf(0, 0)).toBe(0);
  });
});
