import { describe, expect, it } from "vitest";
import { contentSummary } from "./contentSummary";

const row = (over: Partial<Parameters<typeof contentSummary>[0]> = {}) => ({
  content_exists: true,
  body: "hello",
  images: [] as { key: string }[],
  ...over,
});

describe("contentSummary", () => {
  it("says nothing when there is a body to show", () => {
    expect(contentSummary(row())).toBeNull();
    expect(contentSummary(row({ images: [{ key: "a" }] }))).toBeNull();
  });

  it("does not call an empty live post deleted", () => {
    // The regression: 109 posts in production carry body = '', and one of them
    // is reported with no images. Inferring existence from the body told the
    // moderator it had been deleted, and it had not.
    expect(contentSummary(row({ body: "" }))).toBe("（這篇是空的：沒有內文也沒有圖片）");
    expect(contentSummary(row({ body: null }))).toBe("（這篇是空的：沒有內文也沒有圖片）");
    expect(contentSummary(row({ body: "   " }))).toBe("（這篇是空的：沒有內文也沒有圖片）");
  });

  it("says so when the only content is the image", () => {
    expect(contentSummary(row({ body: "", images: [{ key: "a" }] }))).toBe(
      "（只有圖片，沒有內文）"
    );
  });

  it("only claims deletion when the server says the row is gone", () => {
    expect(contentSummary(row({ content_exists: false, body: null }))).toBe("（內容已不存在）");
    // …and existence wins over having nothing to show.
    expect(contentSummary(row({ content_exists: false, body: "still here" }))).toBe(
      "（內容已不存在）"
    );
  });
});
