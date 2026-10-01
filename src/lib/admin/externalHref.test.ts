// @vitest-environment node
import { describe, expect, it } from "vitest";
import { externalHref } from "./externalHref";

describe("externalHref", () => {
  it("adds https:// to a link typed without a scheme", () => {
    expect(externalHref("tiktok.com/@zalenona")).toBe("https://tiktok.com/@zalenona");
    expect(externalHref("www.youtube.com/@someone")).toBe("https://www.youtube.com/@someone");
    expect(externalHref("  instagram.com/abc  ")).toBe("https://instagram.com/abc");
    expect(externalHref("example.com:8080/x")).toBe("https://example.com:8080/x");
    expect(externalHref("//twitch.tv/abc")).toBe("https://twitch.tv/abc");
  });

  it("keeps a link that already has http or https", () => {
    expect(externalHref("https://x.com/abc")).toBe("https://x.com/abc");
    expect(externalHref("HTTP://example.com/a?b=1#c")).toBe("http://example.com/a?b=1#c");
  });

  it("does not link anything that is not a web address", () => {
    for (const bad of [
      "",
      "   ",
      "@zalenona",
      "zalenona",
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,hi",
      "mailto:a@b.com",
      "ftp://example.com/x",
      "tiktok.com/@a b",
      "https://",
    ]) {
      expect(externalHref(bad), bad).toBeNull();
    }
  });
});
