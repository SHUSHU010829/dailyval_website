import { beforeEach, describe, expect, it } from "vitest";
import {
  clearScroll,
  peekScroll,
  saveScroll,
} from "@/lib/community/scroll-memory";

describe("lib/community/scroll-memory", () => {
  beforeEach(() => sessionStorage.clear());

  it("returns what was saved for the same path", () => {
    saveScroll({ path: "/zh-TW/community", y: 1234, postId: "p1" });
    expect(peekScroll("/zh-TW/community")).toEqual({
      path: "/zh-TW/community",
      y: 1234,
      postId: "p1",
    });
  });

  it("remembers a position saved without a post (clicking an author name)", () => {
    saveScroll({ path: "/en/community", y: 300 });
    expect(peekScroll("/en/community")).toEqual({
      path: "/en/community",
      y: 300,
      postId: undefined,
    });
  });

  it("does not hand the feed position to a different page", () => {
    saveScroll({ path: "/zh-TW/community", y: 1234, postId: "p1" });
    expect(peekScroll("/zh-TW/community/user/u1")).toBeNull();
  });

  it("peeking does not clear it, clearing does", () => {
    saveScroll({ path: "/en/community", y: 10, postId: "p1" });
    peekScroll("/en/community");
    expect(peekScroll("/en/community")).not.toBeNull();
    clearScroll();
    expect(peekScroll("/en/community")).toBeNull();
  });

  it("ignores corrupted or invalid entries", () => {
    sessionStorage.setItem("community:scroll", "not json");
    expect(peekScroll("/en/community")).toBeNull();
    sessionStorage.setItem(
      "community:scroll",
      JSON.stringify({ path: "/en/community", y: -5, postId: "p" }),
    );
    expect(peekScroll("/en/community")).toBeNull();
    sessionStorage.setItem(
      "community:scroll",
      JSON.stringify({ path: "/en/community", y: "9", postId: "p" }),
    );
    expect(peekScroll("/en/community")).toBeNull();
  });
});
