import { describe, expect, it } from "vitest";
import { formatArticleDate, isArticleCategory, parseArticlePage } from "./articles";

describe("parseArticlePage", () => {
  it("1 起算；壞值、0、負數、非整數都回第 1 頁；陣列取第一個", () => {
    expect(parseArticlePage(undefined)).toBe(1);
    expect(parseArticlePage("3")).toBe(3);
    expect(parseArticlePage("0")).toBe(1);
    expect(parseArticlePage("-2")).toBe(1);
    expect(parseArticlePage("1.5")).toBe(1);
    expect(parseArticlePage("abc")).toBe(1);
    expect(parseArticlePage(["4", "9"])).toBe(4);
  });
});

describe("formatArticleDate", () => {
  it("以台灣時區顯示：UTC 晚上跨到隔天", () => {
    expect(formatArticleDate("2026-09-30T17:30:00+00:00", "zh-TW")).toBe("2026年10月1日");
    expect(formatArticleDate("2026-09-30T17:30:00+00:00", "en")).toBe("October 1, 2026");
  });
});

describe("isArticleCategory", () => {
  it("只認四個分類", () => {
    expect(isArticleCategory("esports")).toBe(true);
    expect(isArticleCategory("gossip")).toBe(false);
  });
});
