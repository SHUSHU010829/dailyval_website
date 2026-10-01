// @vitest-environment node
import { describe, expect, it } from "vitest";
import { badgesPath } from "./client";
import { badgeQueueParams } from "./validate";

// 瀏覽器組網址、伺服器拆網址，兩邊各自寫。這裡把兩邊接起來測，確定畫面上
// 選的東西原封不動變成 rpc 的參數。
const roundTrip = (query: Parameters<typeof badgesPath>[0]) =>
  badgeQueueParams(new URL(badgesPath(query), "https://dailyval.com"));

describe("badgesPath", () => {
  it("sends only what the old console sent when nothing is picked", () => {
    expect(badgesPath()).toBe("/api/admin/badges?status=pending&offset=0");
    expect(badgesPath({ sort: "oldest" })).toBe("/api/admin/badges?status=pending&offset=0");
  });

  it("round-trips the newest sort with a status and a later page", () => {
    expect(roundTrip({ status: "rejected", offset: 100, sort: "newest" })).toEqual({
      p_status: "rejected",
      p_sort: "newest",
      p_limit: 50,
      p_offset: 100,
    });
  });

  it("round-trips the snapshot string exactly", () => {
    const asOf = "2026-10-01T13:23:36.934821+00:00";
    expect(roundTrip({ status: "pending", offset: 50, sort: "newest", asOf })).toEqual({
      p_status: "pending",
      p_sort: "newest",
      p_as_of: asOf,
      p_limit: 50,
      p_offset: 50,
    });
  });

  it("round-trips a cursor with the snapshot", () => {
    const asOf = "2026-10-01T13:23:36.934821+00:00";
    const at = "2026-09-01T04:00:00.000001+00:00";
    const id = "0a0a0a0a-0000-4000-8000-00000000000a";
    expect(roundTrip({ status: "all", sort: "newest", asOf, after: { at, id } })).toEqual({
      p_status: null,
      p_sort: "newest",
      p_as_of: asOf,
      p_after_at: at,
      p_after_id: id,
      p_limit: 50,
      p_offset: 0,
    });
  });

  it("round-trips the all status with the default sort", () => {
    expect(roundTrip({ status: "all", sort: "oldest" })).toEqual({
      p_status: null,
      p_limit: 50,
      p_offset: 0,
    });
  });
});
