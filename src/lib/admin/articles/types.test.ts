import { describe, expect, it } from "vitest";
import { defaultSlug, humanizeRpcError } from "./types";

describe("defaultSlug", () => {
  it("日期 + 四個亂數字元，本身就是合法的 slug", () => {
    const slug = defaultSlug(new Date("2026-09-30T23:59:00Z"), () => 0);
    expect(slug).toBe("20260930-aaaa");
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("humanizeRpcError", () => {
  it("RPC 的代號翻成中文，認不得的原樣回", () => {
    expect(humanizeRpcError("slug_taken")).toMatch(/已經有別的文章/);
    expect(humanizeRpcError("P0001: unpublish_first")).toMatch(/先撤回/);
    expect(humanizeRpcError("something else")).toBe("something else");
  });
});
