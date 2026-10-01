// @vitest-environment node
import { describe, expect, it } from "vitest";
import { reportsPath } from "./client";
import { reportQueueParams } from "./validate";

// 瀏覽器組網址、伺服器拆網址，兩邊各自寫。這裡把兩邊接起來測，確定畫面上
// 選的東西原封不動變成 rpc 的參數。
const roundTrip = (query: Parameters<typeof reportsPath>[0]) =>
  reportQueueParams(new URL(reportsPath(query), "https://dailyval.com"));

describe("reportsPath", () => {
  it("sends only what the old console sent when nothing is picked", () => {
    expect(reportsPath()).toBe("/api/admin/reports?status=open&offset=0");
    expect(reportsPath({ sort: "most", kinds: [] })).toBe(
      "/api/admin/reports?status=open&offset=0"
    );
  });

  it("round-trips the sort and one kind", () => {
    expect(roundTrip({ status: "open", offset: 0, sort: "newest", kinds: ["skin_comment"] })).toEqual({
      p_status: "open",
      p_sort: "newest",
      p_kinds: ["skin_comment"],
      p_limit: 50,
      p_offset: 0,
    });
  });

  it("round-trips several kinds, the all status and a later page", () => {
    expect(
      roundTrip({ status: "all", offset: 100, sort: "oldest", kinds: ["post", "esports_comment"] })
    ).toEqual({
      p_status: null,
      p_sort: "oldest",
      p_kinds: ["post", "esports_comment"],
      p_limit: 50,
      p_offset: 100,
    });
  });

  it("round-trips the snapshot and the cursor exactly", () => {
    const asOf = "2026-10-01T13:23:36.934821+00:00";
    const after = {
      open: 3,
      first: "2026-09-01T02:00:00+00:00",
      last: "2026-09-01T04:00:00.000001+00:00",
      kind: "skin_comment" as const,
      id: "27000000-0000-4000-8000-000000000003",
    };
    expect(roundTrip({ status: "open", sort: "oldest", kinds: ["post"], asOf, after })).toEqual({
      p_status: "open",
      p_sort: "oldest",
      p_kinds: ["post"],
      p_as_of: asOf,
      p_after_open: 3,
      p_after_first: after.first,
      p_after_last: after.last,
      p_after_kind: "skin_comment",
      p_after_id: after.id,
      p_limit: 50,
      p_offset: 0,
    });
  });

  it("leaves p_kinds out when every kind is wanted", () => {
    expect(roundTrip({ status: "dismissed", kinds: [] })).not.toHaveProperty("p_kinds");
  });
});
