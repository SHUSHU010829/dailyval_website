import { describe, expect, it } from "vitest";
import { BadInput } from "@/lib/admin/validate";
import {
  articleDraft,
  articlePatch,
  bylineInput,
  displayNameInput,
  profileUrlInput,
  sniffImageType,
  writerInput,
} from "./validate";

const good = {
  id: null,
  slug: "Patch-11-Notes",
  title: "  改版筆記  ",
  summary: "摘要",
  body_md: "# hi",
  cover_url: "https://img.dailyval.com/articles/a.webp",
  category: "briefing",
  lang: "zh-Hant",
};

describe("articleDraft", () => {
  it("正規化：slug 小寫、標題去頭尾空白、id 空字串當 null", () => {
    const p = articleDraft({ ...good, id: "" });
    expect(p.p_id).toBeNull();
    expect(p.p_slug).toBe("patch-11-notes");
    expect(p.p_title).toBe("改版筆記");
    expect(p.p_cover_url).toBe(good.cover_url);
  });

  it("封面留空 → null；http 或有空白的網址 → invalid_cover_url", () => {
    expect(articleDraft({ ...good, cover_url: "" }).p_cover_url).toBeNull();
    expect(articleDraft({ ...good, cover_url: undefined }).p_cover_url).toBeNull();
    expect(() => articleDraft({ ...good, cover_url: "http://x/a.png" })).toThrow(BadInput);
    expect(() => articleDraft({ ...good, cover_url: "https://x/a b.png" })).toThrow(/invalid_cover_url/);
  });

  it("slug 只能是小寫英數與連字號，3 到 80 字", () => {
    expect(() => articleDraft({ ...good, slug: "ab" })).toThrow(/invalid_slug/);
    expect(() => articleDraft({ ...good, slug: "有 空白" })).toThrow(/invalid_slug/);
    expect(() => articleDraft({ ...good, slug: "-lead" })).toThrow(/invalid_slug/);
    expect(() => articleDraft({ ...good, slug: "a".repeat(81) })).toThrow(BadInput);
  });

  it("分類與語言只認白名單；標題不能空白", () => {
    expect(() => articleDraft({ ...good, category: "gossip" })).toThrow(BadInput);
    expect(() => articleDraft({ ...good, lang: "fr" })).toThrow(BadInput);
    expect(() => articleDraft({ ...good, title: "   " })).toThrow(BadInput);
  });

  it("id 要是 uuid", () => {
    expect(() => articleDraft({ ...good, id: "nope" })).toThrow(BadInput);
    expect(articleDraft({ ...good, id: "A0A0A0A0-0000-4000-8000-0000000000AA" }).p_id).toBe(
      "a0a0a0a0-0000-4000-8000-0000000000aa"
    );
  });
});

describe("articlePatch", () => {
  it("status 或 hidden 擇一；兩個都沒有是 400", () => {
    expect(articlePatch({ status: "published" })).toEqual({ kind: "status", status: "published" });
    expect(articlePatch({ hidden: true })).toEqual({ kind: "hidden", hidden: true });
    expect(() => articlePatch({ status: "live" })).toThrow(BadInput);
    expect(() => articlePatch({ hidden: "yes" })).toThrow(BadInput);
    expect(() => articlePatch({})).toThrow(BadInput);
  });
});

describe("writerInput / displayNameInput", () => {
  it("active 沒帶預設 true，備註空字串當 null", () => {
    const p = writerInput({ user_id: "a0a0a0a0-0000-4000-8000-0000000000bb", display_name: " 小瓦 ", note: "" });
    expect(p).toEqual({
      p_user_id: "a0a0a0a0-0000-4000-8000-0000000000bb",
      p_display_name: "小瓦",
      p_active: true,
      p_note: null,
    });
    expect(() => writerInput({ user_id: "x", display_name: "a" })).toThrow(BadInput);
    expect(() => displayNameInput({ display_name: "  " })).toThrow(BadInput);
    expect(displayNameInput({ display_name: " 編輯部 " })).toBe("編輯部");
  });
});

describe("profileUrlInput", () => {
  it("沒有 scheme 的補上 https://；空白是清掉", () => {
    expect(profileUrlInput(" instagram.com/hr_newstw ")).toBe("https://instagram.com/hr_newstw");
    expect(profileUrlInput("https://www.threads.net/@hr_newstw")).toBe("https://www.threads.net/@hr_newstw");
    expect(profileUrlInput("")).toBeNull();
    expect(profileUrlInput("   ")).toBeNull();
    expect(profileUrlInput(null)).toBeNull();
    expect(profileUrlInput(undefined)).toBeNull();
  });

  it("只收 https、像網址的、300 字以內", () => {
    for (const bad of [
      "http://instagram.com/x",
      "javascript:alert(1)",
      "instagram://user?username=x",
      "@hr_newstw",
      "insta gram.com",
      `https://example.com/${"a".repeat(300)}`,
    ]) {
      expect(() => profileUrlInput(bad), bad).toThrow("invalid_profile_url");
    }
    expect(() => profileUrlInput(42)).toThrow(BadInput);
  });
});

describe("bylineInput", () => {
  it("帶 profile_url 才一起存；舊版頁面只送署名時不碰網址", () => {
    expect(bylineInput({ display_name: " H&R ", profile_url: "instagram.com/hr" })).toEqual({
      kind: "byline",
      p_display_name: "H&R",
      p_profile_url: "https://instagram.com/hr",
    });
    expect(bylineInput({ display_name: "H&R", profile_url: "" })).toEqual({
      kind: "byline",
      p_display_name: "H&R",
      p_profile_url: null,
    });
    expect(bylineInput({ display_name: "H&R" })).toEqual({ kind: "name", p_display_name: "H&R" });
    expect(() => bylineInput({ display_name: " ", profile_url: "https://x.example" })).toThrow(BadInput);
  });
});

describe("sniffImageType", () => {
  it("看魔術數字，不看副檔名", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
    expect(sniffImageType(new TextEncoder().encode("<html>"))).toBeNull();
  });
});
