// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPostDetail, imageResponse } = vi.hoisted(() => ({
  fetchPostDetail: vi.fn(),
  imageResponse: vi.fn(),
}));

vi.mock("@/lib/community/reads", () => ({ fetchPostDetail }));
vi.mock("@/lib/og-fonts", () => ({
  loadOgFonts: vi.fn(async () => []),
  truncate: (s: string, n: number) =>
    s.length <= n ? s : s.slice(0, n - 1) + "…",
}));
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(...args: unknown[]) {
      imageResponse(...args);
    }
  },
}));

import { GET } from "@/app/og/community-post/route";

const ID = "f17c6a79-3183-59ac-a7fe-59b693f0e624";
const request = (query: string) =>
  new NextRequest(`https://dailyval.com/og/community-post?${query}`);

describe("og/community-post", () => {
  beforeEach(() => {
    fetchPostDetail.mockReset();
    imageResponse.mockReset();
  });

  it("falls back to the brand card without touching the data source when the id is not a uuid", async () => {
    await GET(request("id=abc&locale=en"));
    expect(fetchPostDetail).not.toHaveBeenCalled();
    expect(imageResponse).toHaveBeenCalledTimes(1);
  });

  it("fetches the post itself and ignores any text passed in the query", async () => {
    fetchPostDetail.mockResolvedValue({
      id: ID,
      body: "real body",
      createdAt: "2026-01-01T00:00:00+00:00",
      author: { name: "real author" },
      images: [],
    });
    await GET(request(`id=${ID}&locale=en&content=INJECTED&title=INJECTED`));
    expect(fetchPostDetail).toHaveBeenCalledWith(ID);
    const [element] = imageResponse.mock.calls[0];
    const rendered = JSON.stringify(element);
    expect(rendered).toContain("real body");
    expect(rendered).not.toContain("INJECTED");
  });

  it("still renders a card when the post cannot be found", async () => {
    fetchPostDetail.mockResolvedValue(null);
    await GET(request(`id=${ID}&locale=zh-TW`));
    expect(imageResponse).toHaveBeenCalledTimes(1);
  });
});
