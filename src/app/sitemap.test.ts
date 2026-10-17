import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPostsForSitemap } = vi.hoisted(() => ({
  fetchPostsForSitemap: vi.fn(),
}));
vi.mock("@/lib/community/reads", () => ({ fetchPostsForSitemap }));

import sitemap from "@/app/sitemap";

const POST = "f17c6a79-3183-59ac-a7fe-59b693f0e624";
const AUTHOR = "e37c1ec9-1f0a-526f-97e0-439716f5ee09";

describe("app/sitemap", () => {
  beforeEach(() => {
    fetchPostsForSitemap.mockReset();
  });

  it("lists the community board for every locale", async () => {
    fetchPostsForSitemap.mockResolvedValue([]);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("https://dailyval.com/en/community");
    expect(urls).toContain("https://dailyval.com/zh-TW/community");
  });

  it("adds post and author pages for every locale, one author entry per author", async () => {
    fetchPostsForSitemap.mockResolvedValue([
      { id: POST, authorID: AUTHOR, createdAt: "2026-01-01T00:00:00+00:00" },
      {
        id: "second",
        authorID: AUTHOR,
        createdAt: "2026-01-02T00:00:00+00:00",
      },
    ]);
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const locale of ["en", "zh-TW"]) {
      expect(urls).toContain(
        `https://dailyval.com/${locale}/community/post/${POST}`,
      );
      expect(urls).toContain(
        `https://dailyval.com/${locale}/community/user/${AUTHOR}`,
      );
      expect(
        urls.filter((url) => url.includes(`/${locale}/community/user/`)),
      ).toHaveLength(1);
    }
  });

  it("skips author pages for posts without an author id", async () => {
    fetchPostsForSitemap.mockResolvedValue([
      { id: POST, authorID: null, createdAt: "2026-01-01T00:00:00+00:00" },
    ]);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/community/user/"))).toBe(false);
    expect(urls).toContain(`https://dailyval.com/en/community/post/${POST}`);
  });

  it("still returns the static entries when the data source is unavailable", async () => {
    fetchPostsForSitemap.mockResolvedValue([]);
    const withoutPosts = await sitemap();
    expect(withoutPosts.length).toBeGreaterThan(0);
    expect(withoutPosts.map((entry) => entry.url)).toContain(
      "https://dailyval.com/en/tos",
    );
  });
});
