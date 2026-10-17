import { describe, expect, it } from "vitest";
import { rankIconURL } from "@/lib/community/rank";

describe("lib/community/rank", () => {
  it("builds the icon URL for Unranked and tiers 3 to 27", () => {
    expect(rankIconURL(0)).toMatch(/\/0\/smallicon\.png$/);
    expect(rankIconURL(3)).toMatch(/\/3\/smallicon\.png$/);
    expect(rankIconURL(27)).toMatch(/\/27\/smallicon\.png$/);
  });

  it("returns null for reserved, out-of-range or missing tiers", () => {
    expect(rankIconURL(1)).toBeNull();
    expect(rankIconURL(2)).toBeNull();
    expect(rankIconURL(28)).toBeNull();
    expect(rankIconURL(3.5)).toBeNull();
    expect(rankIconURL(null)).toBeNull();
    expect(rankIconURL(undefined)).toBeNull();
  });
});
