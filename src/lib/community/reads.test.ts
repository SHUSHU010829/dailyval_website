// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchFeedPage,
  fetchPostDetail,
  fetchPostsForSitemap,
} from "@/lib/community/reads";

const row = (id: string, createdAt: string) => ({
  id,
  body: "x",
  created_at: createdAt,
  like_count: 0,
  dislike_count: 0,
  comment_count: 0,
  report_count: 0,
  author_id: null,
  is_legacy: true,
  author_name: "a",
  author_avatar: null,
  author_tag_line: null,
  author_rank_tier: null,
  author_is_verified: false,
  author_is_premium: false,
  images: [],
  my_reaction: null,
  my_report: false,
});

describe("lib/community/reads", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the social schema RPC with explicit nulls for the optional arguments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchFeedPage(null, 20);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dailyval.com/rest/v1/rpc/feed");
    expect(init.headers["Content-Profile"]).toBe("social");
    expect(JSON.parse(init.body)).toEqual({
      p_before: null,
      p_before_id: null,
      p_limit: 20,
    });
  });

  it("sends the cursor pair back verbatim", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchFeedPage(
      { createdAt: "2026-09-02T09:00:00.123456+00:00", id: "abc" },
      5,
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      p_before: "2026-09-02T09:00:00.123456+00:00",
      p_before_id: "abc",
      p_limit: 5,
    });
  });

  it("returns null instead of throwing when the upstream fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    expect(await fetchFeedPage(null)).toBeNull();

    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    expect(
      await fetchPostDetail("f17c6a79-3183-59ac-a7fe-59b693f0e624"),
    ).toBeNull();
  });

  it("does not hit the server for a path parameter that is not a uuid", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await fetchPostDetail("post_1712345_abc")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports hasMore only when the page is full", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [row("a", "2026-01-01T00:00:00+00:00")],
    }) as unknown as typeof fetch;
    const page = await fetchFeedPage(null, 2);
    expect(page?.posts).toHaveLength(1);
    expect(page?.hasMore).toBe(false);
  });

  it("walks the keyset cursor for the sitemap and stops at the last page", async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) =>
      row(`p${i}`, `2026-01-01T00:00:${String(59 - i).padStart(2, "0")}+00:00`),
    );
    const pages = [firstPage, [row("last", "2025-12-31T00:00:00+00:00")]];
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => pages.shift() ?? [],
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const entries = await fetchPostsForSitemap(100);

    expect(entries).toHaveLength(51);
    expect(entries[50].id).toBe("last");
    // 第二次請求帶著第一頁最後一列的游標
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.p_before).toBe("2026-01-01T00:00:10+00:00");
    expect(second.p_before_id).toBe("p49");
    // 第二頁不滿 50 筆，所以到此為止
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caps the sitemap at maxPosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        Array.from({ length: 50 }, (_, i) =>
          row(`p${i}`, "2026-01-01T00:00:00+00:00"),
        ),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await fetchPostsForSitemap(60)).toHaveLength(60);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
