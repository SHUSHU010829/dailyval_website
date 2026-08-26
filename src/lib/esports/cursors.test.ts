import { describe, expect, it } from "vitest";
import { heatCursorFilter, newestCursorFilter } from "./cursors";

// cursor filter 是 wire 契約：以字串相等比對 iOS 組出來的形狀

describe("newestCursorFilter", () => {
  it("與 iOS 逐字元一致，+00:00 正規化成 Z", () => {
    const filter = newestCursorFilter({
      createdAtRaw: "2026-08-07T12:34:56.78901+00:00",
      id: "0e0f3fde-73a8-4f4b-9c8d-111111111111",
    });
    expect(filter).toBe(
      'created_at.lt."2026-08-07T12:34:56.78901Z"' +
        ',and(created_at.eq."2026-08-07T12:34:56.78901Z",id.lt."0e0f3fde-73a8-4f4b-9c8d-111111111111")'
    );
  });

  it("已是 Z 結尾的時間戳不變", () => {
    const filter = newestCursorFilter({ createdAtRaw: "2026-08-07T12:34:56Z", id: "abc" });
    expect(filter).toContain('"2026-08-07T12:34:56Z"');
    expect(filter).not.toContain("+00:00");
  });
});

describe("heatCursorFilter", () => {
  it("三鍵條件：like_count → created_at → comment_id", () => {
    const filter = heatCursorFilter({
      likeCount: 7,
      createdAtRaw: "2026-08-07T12:00:00+00:00",
      id: "aaaa",
    });
    expect(filter).toBe(
      "like_count.lt.7" +
        ',and(like_count.eq.7,created_at.lt."2026-08-07T12:00:00Z")' +
        ',and(like_count.eq.7,created_at.eq."2026-08-07T12:00:00Z",comment_id.lt."aaaa")'
    );
  });
});
