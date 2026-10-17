// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  avatarURL,
  commentFromRow,
  cursorOf,
  displayName,
  imageFromRow,
  isMigratedKey,
  isUUID,
  mediaURL,
  postFromRow,
  profileFromRow,
} from "@/lib/community/mapping";
import type { CommentRow, PostRow } from "@/lib/community/types";

const CARD = "0d6995aa-49c1-2e67-f423-39bfed03676a";

describe("lib/community/mapping", () => {
  describe("avatarURL", () => {
    it("turns a claimed author’s playercard id into the small-art URL", () => {
      expect(avatarURL(CARD)).toBe(
        `https://media.valorant-api.com/playercards/${CARD}/smallart.png`,
      );
    });

    it("lowercases the id: the media CDN path is case sensitive", () => {
      expect(avatarURL(CARD.toUpperCase())).toBe(
        `https://media.valorant-api.com/playercards/${CARD}/smallart.png`,
      );
    });

    it("digs the card id out of a legacy playercards URL, with or without the file name", () => {
      expect(
        avatarURL(
          `https://media.valorant-api.com/playercards/${CARD}/smallart.png`,
        ),
      ).toBe(`https://media.valorant-api.com/playercards/${CARD}/smallart.png`);
      expect(
        avatarURL(`https://media.valorant-api.com/playercards/${CARD}/`),
      ).toBe(`https://media.valorant-api.com/playercards/${CARD}/smallart.png`);
    });

    it("keeps any other https URL as is", () => {
      expect(avatarURL("https://example.com/a.png")).toBe(
        "https://example.com/a.png",
      );
    });

    it("returns null for empty, non-URL and non-http values", () => {
      expect(avatarURL(null)).toBeNull();
      expect(avatarURL("")).toBeNull();
      expect(avatarURL("not a url")).toBeNull();
      expect(avatarURL("javascript:alert(1)")).toBeNull();
    });
  });

  describe("media keys", () => {
    it("builds a public URL under the media base, encoding each segment", () => {
      expect(mediaURL("posts/abc/0-deadbeef.jpg")).toBe(
        "https://img.dailyval.com/posts/abc/0-deadbeef.jpg",
      );
      expect(mediaURL("posts/a b/0.jpg")).toBe(
        "https://img.dailyval.com/posts/a%20b/0.jpg",
      );
    });

    it("loads the original for migrated images and the thumbnail for new uploads", () => {
      expect(isMigratedKey("posts/x/0-import.jpg")).toBe(true);
      expect(isMigratedKey("posts/x/0-adc39ad7e2fc-1-46481fb30046.jpg")).toBe(
        false,
      );

      const migrated = imageFromRow({
        position: 0,
        key: "posts/x/0-import.jpg",
        thumb: "posts/x/0-import_thumb.jpg",
        width: null,
        height: null,
      });
      expect(migrated.listURL).toBe(migrated.url);

      const fresh = imageFromRow({
        position: 1,
        key: "posts/x/1-adc39ad7e2fc-1-46481fb30046.jpg",
        thumb: "posts/x/1-adc39ad7e2fc-1-46481fb30046_thumb.jpg",
        width: 1920,
        height: 1080,
      });
      expect(fresh.listURL).toBe(fresh.thumbURL);
      expect(fresh.width).toBe(1920);
    });
  });

  describe("postFromRow", () => {
    const row: PostRow = {
      id: "b0f788da-eaee-5511-949f-415c64c253ba",
      body: "hello",
      created_at: "2026-09-02T09:00:00.123456+00:00",
      like_count: 2,
      dislike_count: 1,
      comment_count: 3,
      report_count: 0,
      author_id: null,
      is_legacy: true,
      author_name: null,
      author_avatar: null,
      author_tag_line: "",
      author_rank_tier: null,
      author_is_verified: null,
      author_is_premium: null,
      images: [
        {
          position: 1,
          key: "posts/p/1-b.jpg",
          thumb: "posts/p/1-b_thumb.jpg",
          width: 1,
          height: 1,
        },
        {
          position: 0,
          key: "posts/p/0-a.jpg",
          thumb: "posts/p/0-a_thumb.jpg",
          width: 1,
          height: 1,
        },
      ],
      my_reaction: "like",
      my_report: null,
    };

    it("keeps a legacy row with no author snapshot rather than dropping it", () => {
      const post = postFromRow(row);
      expect(post.author.id).toBeNull();
      expect(post.author.name).toBe("");
      expect(post.author.tagLine).toBeNull();
      expect(post.author.isVerified).toBe(false);
      expect(post.didReport).toBe(false);
      expect(post.myReaction).toBe("like");
    });

    it("sorts images by position and keeps the raw created_at for the cursor", () => {
      const post = postFromRow(row);
      expect(post.images.map((image) => image.position)).toEqual([0, 1]);
      expect(cursorOf(post)).toEqual({
        createdAt: "2026-09-02T09:00:00.123456+00:00",
        id: "b0f788da-eaee-5511-949f-415c64c253ba",
      });
    });

    it("ignores reaction values it does not know", () => {
      expect(
        postFromRow({ ...row, my_reaction: "love" }).myReaction,
      ).toBeNull();
      expect(postFromRow({ ...row, images: null }).images).toEqual([]);
    });
  });

  it("maps a comment row including its image", () => {
    const row: CommentRow = {
      id: "df61348a-63d8-5adf-aac5-879841387d28",
      post_id: "f17c6a79-3183-59ac-a7fe-59b693f0e624",
      body: "nice",
      created_at: "2026-09-01T11:56:00+00:00",
      like_count: 4,
      author_id: "e37c1ec9-1f0a-526f-97e0-439716f5ee09",
      is_legacy: false,
      author_name: "Jett Diff",
      author_avatar: CARD,
      author_tag_line: "TW1",
      author_rank_tier: 24,
      author_is_verified: false,
      author_is_premium: true,
      image_key: "comments/c/0-x.jpg",
      thumb_key: "comments/c/0-x_thumb.jpg",
      my_reaction: null,
      my_report: true,
    };
    const comment = commentFromRow(row);
    expect(comment.author.avatarURL).toContain(CARD);
    expect(comment.imageURL).toBe(
      "https://img.dailyval.com/comments/c/0-x.jpg",
    );
    expect(comment.thumbURL).toBe(
      "https://img.dailyval.com/comments/c/0-x_thumb.jpg",
    );
    expect(comment.didReport).toBe(true);
    expect(displayName(comment.author)).toBe("Jett Diff#TW1");
  });

  it("maps a profile row", () => {
    const profile = profileFromRow({
      id: "e37c1ec9-1f0a-526f-97e0-439716f5ee09",
      display_name: "Jett Diff",
      avatar: CARD,
      tag_line: "TW1",
      rank_tier: 24,
      is_verified: null,
      is_premium: true,
    });
    expect(profile.avatarURL).toContain("smallart.png");
    expect(profile.isVerified).toBe(false);
    expect(profile.isPremium).toBe(true);
  });

  it("recognises uuids", () => {
    expect(isUUID("f17c6a79-3183-59ac-a7fe-59b693f0e624")).toBe(true);
    expect(isUUID("post_1712345_abc")).toBe(false);
    expect(isUUID(null)).toBe(false);
  });
});
