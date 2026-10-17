import { describe, expect, it } from "vitest";
import { communityOgPath, ogImageFor } from "@/lib/community/og";
import { imageFromRow } from "@/lib/community/mapping";
import type { SocialPost } from "@/lib/community/types";

function postWith(images: SocialPost["images"]): SocialPost {
  return {
    id: "p",
    body: "x",
    createdAt: "2026-01-01T00:00:00+00:00",
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    author: {
      id: "a",
      name: "n",
      tagLine: null,
      rankTier: null,
      isVerified: false,
      isPremium: false,
      avatarURL: null,
    },
    images,
    myReaction: null,
    didReport: false,
  };
}

describe("lib/community/og", () => {
  it("builds the og path with only id and locale", () => {
    expect(communityOgPath("abc", "zh-TW")).toBe(
      "/og/community-post?id=abc&locale=zh-TW",
    );
  });

  it("embeds the thumbnail of a fresh upload from the media host", () => {
    const image = imageFromRow({
      position: 0,
      key: "posts/p/0abc.jpg",
      thumb: "posts/p/0abc_thumb.jpg",
      width: 10,
      height: 10,
    });
    expect(ogImageFor(postWith([image]))).toBe(image.thumbURL);
  });

  it("returns null for a post without images", () => {
    expect(ogImageFor(postWith([]))).toBeNull();
  });

  it("skips images migrated from CloudKit", () => {
    const image = imageFromRow({
      position: 0,
      key: "posts/p/0-import.png",
      thumb: "posts/p/0-import_thumb.jpg",
      width: null,
      height: null,
    });
    expect(ogImageFor(postWith([image]))).toBeNull();
  });

  it("rejects an image hosted outside the media host", () => {
    const image = imageFromRow({
      position: 0,
      key: "posts/p/0abc.jpg",
      thumb: "posts/p/0abc_thumb.jpg",
      width: 10,
      height: 10,
    });
    expect(
      ogImageFor(
        postWith([{ ...image, thumbURL: "https://evil.example.com/x.jpg" }]),
      ),
    ).toBeNull();
  });
});
