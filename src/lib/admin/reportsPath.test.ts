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

  it("leaves p_kinds out when every kind is wanted", () => {
    expect(roundTrip({ status: "dismissed", kinds: [] })).not.toHaveProperty("p_kinds");
  });
});
