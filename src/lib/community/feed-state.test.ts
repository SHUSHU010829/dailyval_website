import { describe, expect, it } from "vitest";
import {
  emptyFeed,
  feedReducer,
  INITIAL_DATA_STALE_MS,
  initialFeedState,
  isAnonymousForViewer,
  lastPost,
  needsRefetch,
  visiblePosts,
  type FeedState,
} from "@/lib/community/feed-state";
import type { SocialPost } from "@/lib/community/types";

function post(id: string, authorId: string | null = "a"): SocialPost {
  return {
    id,
    body: id,
    createdAt: `2026-01-01T00:00:${id.padStart(2, "0")}+00:00`,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    author: {
      id: authorId,
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

const NOW = 1_000_000;
const ssr = (posts: SocialPost[], generatedAt = NOW) =>
  initialFeedState({ posts, hasMore: true, generatedAt });

describe("lib/community/feed-state", () => {
  describe("needsRefetch", () => {
    it("always refetches for a signed-in viewer showing the SSR page", () => {
      expect(needsRefetch(ssr([post("1")]), "u1", NOW)).toBe(true);
    });

    it("keeps a fresh SSR page for an anonymous viewer and refetches a stale one", () => {
      const fresh = ssr([post("1")], NOW - 1000);
      expect(needsRefetch(fresh, null, NOW)).toBe(false);
      const stale = ssr([post("1")], NOW - INITIAL_DATA_STALE_MS - 1);
      expect(needsRefetch(stale, null, NOW)).toBe(true);
    });

    it("refetches when there is no data at all", () => {
      expect(needsRefetch(emptyFeed, null, NOW)).toBe(true);
    });

    it("skips the refetch when the cached pages already belong to this viewer", () => {
      const state = feedReducer(emptyFeed, {
        type: "replaced",
        uid: "u1",
        posts: [post("1")],
      });
      expect(needsRefetch(state, "u1", NOW)).toBe(false);
      expect(needsRefetch(state, "u2", NOW)).toBe(true);
      expect(needsRefetch(state, null, NOW)).toBe(true);
    });
  });

  describe("visiblePosts", () => {
    it("fails closed: a signed-in viewer whose read failed never sees the anonymous page", () => {
      const failed = feedReducer(ssr([post("1")]), { type: "replaceFailed" });
      expect(visiblePosts(failed, "u1")).toEqual([]);
      // 匿名者讀取失敗仍可看首屏
      expect(visiblePosts(failed, null)).toHaveLength(1);
    });

    it("shows the anonymous SSR page while the signed-in refetch is still pending", () => {
      expect(visiblePosts(ssr([post("1")]), "u1")).toHaveLength(1);
    });

    it("hides the previous viewer's posts immediately after the viewer changes", () => {
      const state = feedReducer(emptyFeed, {
        type: "replaced",
        uid: "u1",
        posts: [post("1")],
      });
      expect(visiblePosts(state, "u1")).toHaveLength(1);
      expect(visiblePosts(state, "u2")).toEqual([]);
      expect(visiblePosts(state, null)).toEqual([]);
    });

    it("dedupes posts that appear on two pages", () => {
      let state = feedReducer(emptyFeed, {
        type: "replaced",
        uid: null,
        posts: [post("1"), post("2")],
        pageSize: 2,
      });
      state = feedReducer(state, {
        type: "pageAppended",
        posts: [post("2"), post("3")],
        pageSize: 2,
      });
      expect(visiblePosts(state, null).map((p) => p.id)).toEqual([
        "1",
        "2",
        "3",
      ]);
    });
  });

  describe("isAnonymousForViewer", () => {
    it("flags the SSR page when the viewer is signed in", () => {
      expect(isAnonymousForViewer(ssr([post("1")]), "u1")).toBe(true);
      expect(isAnonymousForViewer(ssr([post("1")]), null)).toBe(false);
      const own = feedReducer(emptyFeed, {
        type: "replaced",
        uid: "u1",
        posts: [],
      });
      expect(isAnonymousForViewer(own, "u1")).toBe(false);
    });
  });

  describe("pagination", () => {
    it("reports hasMore only when the page is full", () => {
      const full = feedReducer(emptyFeed, {
        type: "replaced",
        uid: null,
        posts: [post("1"), post("2")],
        pageSize: 2,
      });
      expect(full.hasMore).toBe(true);
      const partial = feedReducer(full, {
        type: "pageAppended",
        posts: [post("3")],
        pageSize: 2,
      });
      expect(partial.hasMore).toBe(false);
    });

    it("takes the cursor from the last row of the last non-empty page", () => {
      const state: FeedState = {
        ...emptyFeed,
        pages: [[post("1"), post("2")], []],
      };
      expect(lastPost(state)?.id).toBe("2");
      expect(lastPost(emptyFeed)).toBeNull();
    });

    it("clears the failure flag when a replace succeeds", () => {
      const failed = feedReducer(ssr([post("1")]), { type: "replaceFailed" });
      const ok = feedReducer(failed, {
        type: "replaced",
        uid: "u1",
        posts: [post("9")],
      });
      expect(ok.loadFailed).toBe(false);
      expect(visiblePosts(ok, "u1").map((p) => p.id)).toEqual(["9"]);
    });
  });

  describe("local edits", () => {
    const base = feedReducer(emptyFeed, {
      type: "replaced",
      uid: "u1",
      posts: [post("1", "a"), post("2", "b")],
    });

    it("puts a new post first and replaces an existing copy of it", () => {
      const added = feedReducer(base, {
        type: "postAdded",
        post: post("2", "b"),
      });
      expect(visiblePosts(added, "u1").map((p) => p.id)).toEqual(["2", "1"]);
    });

    it("creates the first page when none exists", () => {
      const added = feedReducer(emptyFeed, {
        type: "postAdded",
        post: post("1"),
      });
      expect(added.pages).toHaveLength(1);
    });

    it("removes a post or all posts of a blocked author", () => {
      const removed = feedReducer(base, { type: "postRemoved", id: "1" });
      expect(visiblePosts(removed, "u1").map((p) => p.id)).toEqual(["2"]);
      const blocked = feedReducer(base, {
        type: "authorRemoved",
        authorId: "b",
      });
      expect(visiblePosts(blocked, "u1").map((p) => p.id)).toEqual(["1"]);
    });
  });
});
