import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCommunityFeed } from "@/components/community/useCommunityFeed";
import type { SocialPost } from "@/lib/community/types";

const { mockSession, feedPage, authorPosts } = vi.hoisted(() => ({
  mockSession: vi.fn(),
  feedPage: vi.fn(),
  authorPosts: vi.fn(),
}));

vi.mock("@/components/community/CommunitySessionProvider", () => ({
  useCommunitySession: () => mockSession(),
}));
vi.mock("@/lib/community/service", () => ({ feedPage, authorPosts }));

function post(id: string): SocialPost {
  return {
    id,
    body: id,
    createdAt: `2026-01-01T00:00:${id.padStart(2, "0")}+00:00`,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    author: {
      id: "a",
      name: "x",
      tagLine: null,
      rankTier: null,
      isVerified: false,
      isPremium: false,
      avatarURL: null,
    },
    images: [],
    myReaction: null,
    didReport: false,
  };
}

const tick = () => act(async () => {});

// 每個測試用不同的 authorId，避免模組層級的頁面快取互相影響
let scope = 0;
let authorId = "";

describe("components/community/useCommunityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorId = `author-${++scope}`;
  });

  it("refetches for a signed-in viewer and replaces the anonymous SSR page", async () => {
    mockSession.mockReturnValue({ status: "signedIn", uid: "u1" });
    authorPosts.mockResolvedValue([post("9")]);
    const { result } = renderHook(() =>
      useCommunityFeed({
        authorId: authorId,
        initialData: {
          posts: [post("1")],
          hasMore: false,
          generatedAt: Date.now(),
        },
      }),
    );
    // 讀回來之前仍顯示匿名首屏
    expect(result.current.posts.map((p) => p.id)).toEqual(["1"]);
    await tick();
    expect(authorPosts).toHaveBeenCalledTimes(1);
    expect(result.current.posts.map((p) => p.id)).toEqual(["9"]);
  });

  it("fails closed when the signed-in read fails", async () => {
    mockSession.mockReturnValue({ status: "signedIn", uid: "u1" });
    authorPosts.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() =>
      useCommunityFeed({
        authorId: authorId,
        initialData: {
          posts: [post("1")],
          hasMore: false,
          generatedAt: Date.now(),
        },
      }),
    );
    await tick();
    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(true);
  });

  it("keeps a fresh SSR page for an anonymous viewer without fetching", async () => {
    mockSession.mockReturnValue({ status: "signedOut", uid: null });
    const { result } = renderHook(() =>
      useCommunityFeed({
        authorId: authorId,
        initialData: {
          posts: [post("1")],
          hasMore: false,
          generatedAt: Date.now(),
        },
      }),
    );
    await tick();
    expect(authorPosts).not.toHaveBeenCalled();
    expect(result.current.posts.map((p) => p.id)).toEqual(["1"]);
  });

  it("does nothing while the session is still loading", async () => {
    mockSession.mockReturnValue({ status: "loading", uid: null });
    renderHook(() => useCommunityFeed({ authorId: authorId }));
    await tick();
    expect(authorPosts).not.toHaveBeenCalled();
  });

  it("re-reads the page when the viewer changes and never shows the previous viewer's posts", async () => {
    mockSession.mockReturnValue({ status: "signedIn", uid: "u1" });
    authorPosts.mockResolvedValueOnce([post("1")]);
    const { result, rerender } = renderHook(() =>
      useCommunityFeed({ authorId: authorId }),
    );
    await tick();
    expect(result.current.posts.map((p) => p.id)).toEqual(["1"]);

    let resolveSecond: (posts: SocialPost[]) => void = () => {};
    authorPosts.mockReturnValueOnce(new Promise((r) => (resolveSecond = r)));
    mockSession.mockReturnValue({ status: "signedIn", uid: "u2" });
    rerender();
    expect(result.current.posts).toEqual([]);
    await act(async () => resolveSecond([post("2")]));
    expect(result.current.posts.map((p) => p.id)).toEqual(["2"]);
  });

  it("does not clone the anonymous SSR page into a signed-in view when a post is added", async () => {
    mockSession.mockReturnValue({ status: "signedIn", uid: "u1" });
    authorPosts.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useCommunityFeed({
        authorId: authorId,
        initialData: {
          posts: [post("1")],
          hasMore: false,
          generatedAt: Date.now(),
        },
      }),
    );
    authorPosts.mockClear();
    authorPosts.mockResolvedValue([post("7"), post("1")]);
    await act(async () => result.current.addPost(post("7")));
    // 改成重讀，而不是把新貼文插進匿名首屏
    expect(authorPosts).toHaveBeenCalledTimes(1);
    expect(result.current.posts.map((p) => p.id)).toEqual(["7", "1"]);
  });

  it("appends the next page using the last post as the cursor", async () => {
    mockSession.mockReturnValue({ status: "signedOut", uid: null });
    const page = Array.from({ length: 20 }, (_, i) => post(String(i + 10)));
    const { result } = renderHook(() =>
      useCommunityFeed({
        authorId: authorId,
        initialData: { posts: page, hasMore: true, generatedAt: Date.now() },
      }),
    );
    authorPosts.mockResolvedValue([post("40")]);
    await act(async () => result.current.loadMore());
    expect(authorPosts).toHaveBeenCalledWith(authorId, {
      createdAt: page[19].createdAt,
      id: page[19].id,
    });
    expect(result.current.posts).toHaveLength(21);
    expect(result.current.hasMore).toBe(false);
  });
});
