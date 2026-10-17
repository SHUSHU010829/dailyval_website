// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  addLocal,
  appendPage,
  emptyThread,
  nextCursor,
  removeByAuthor,
  removeComment,
  visibleComments,
} from "@/lib/community/thread";
import type { SocialComment } from "@/lib/community/types";

const comment = (
  id: string,
  createdAt: string,
  authorId: string | null = "a",
): SocialComment => ({
  id,
  postId: "p",
  body: id,
  createdAt,
  likeCount: 0,
  author: {
    id: authorId,
    name: "x",
    tagLine: null,
    rankTier: null,
    isVerified: false,
    isPremium: false,
    avatarURL: null,
  },
  imageURL: null,
  thumbURL: null,
  myReaction: null,
  didReport: false,
});

describe("lib/community/thread", () => {
  it("takes the next cursor from the last server row, never from a locally added comment", () => {
    const page = [
      comment("1", "2026-01-01T00:00:01+00:00"),
      comment("2", "2026-01-01T00:00:02+00:00"),
    ];
    let state = appendPage(emptyThread, page, 2);
    state = addLocal(state, comment("mine", "2026-09-09T00:00:00+00:00"));

    expect(nextCursor(state)).toEqual({
      createdAt: "2026-01-01T00:00:02+00:00",
      id: "2",
    });
    expect(visibleComments(state).map((c) => c.id)).toEqual(["1", "2", "mine"]);
    expect(state.hasMore).toBe(true);
  });

  it("drops a local comment once the server hands it back, and dedups repeated rows", () => {
    let state = addLocal(
      emptyThread,
      comment("mine", "2026-09-09T00:00:00+00:00"),
    );
    state = appendPage(
      state,
      [
        comment("1", "2026-01-01T00:00:01+00:00"),
        comment("mine", "2026-09-09T00:00:00+00:00"),
      ],
      50,
    );
    expect(state.local).toEqual([]);
    expect(state.pages.map((c) => c.id)).toEqual(["1", "mine"]);
    expect(state.hasMore).toBe(false);

    const again = appendPage(
      state,
      [comment("1", "2026-01-01T00:00:01+00:00")],
      50,
    );
    expect(again.pages.map((c) => c.id)).toEqual(["1", "mine"]);
  });

  it("ignores adding the same local comment twice", () => {
    const state = addLocal(
      addLocal(emptyThread, comment("m", "x")),
      comment("m", "x"),
    );
    expect(state.local).toHaveLength(1);
  });

  it("removes by id and by author across both lists", () => {
    let state = appendPage(
      emptyThread,
      [comment("1", "a", "u1"), comment("2", "b", "u2")],
      50,
    );
    state = addLocal(state, comment("3", "c", "u1"));
    expect(visibleComments(removeComment(state, "2")).map((c) => c.id)).toEqual(
      ["1", "3"],
    );
    expect(
      visibleComments(removeByAuthor(state, "u1")).map((c) => c.id),
    ).toEqual(["2"]);
  });

  it("starts from the beginning when nothing is loaded", () => {
    expect(nextCursor(emptyThread)).toBeNull();
    expect(visibleComments(emptyThread)).toEqual([]);
  });
});
