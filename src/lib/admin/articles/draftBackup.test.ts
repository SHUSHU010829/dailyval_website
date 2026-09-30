import { describe, expect, it } from "vitest";
import type { ArticleDraft } from "./types";
import {
  clearDraftBackup,
  draftBackupKey,
  readDraftBackup,
  shouldOfferRestore,
  writeDraftBackup,
} from "./draftBackup";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const draft: ArticleDraft = {
  id: null,
  slug: "20260930-abcd",
  title: "草稿",
  summary: "",
  body_md: "打到一半",
  cover_url: null,
  category: "briefing",
  lang: "zh-Hant",
};

describe("draft backup", () => {
  it("每個帳號、每篇一格；新文章是 new", () => {
    expect(draftBackupKey("u1", null)).toBe("dailyval.articles.draft:u1:new");
    expect(draftBackupKey("u1", "a1")).toBe("dailyval.articles.draft:u1:a1");
  });

  it("寫進去讀得回來，清掉就沒了；壞掉的內容當沒有", () => {
    const store = memoryStorage();
    const key = draftBackupKey("u1", null);
    writeDraftBackup(key, draft, new Date("2026-09-30T10:00:00Z"), store);
    expect(readDraftBackup(key, store)).toEqual({ draft, savedAt: "2026-09-30T10:00:00.000Z" });
    clearDraftBackup(key, store);
    expect(readDraftBackup(key, store)).toBeNull();
    store.setItem(key, "{not json");
    expect(readDraftBackup(key, store)).toBeNull();
    store.setItem(key, JSON.stringify({ draft, savedAt: "yesterday-ish" }));
    expect(readDraftBackup(key, store)).toBeNull();
  });

  it("備份比伺服器新而且內容不同才提議恢復；新文章有備份就問", () => {
    const backup = { draft: { ...draft, body_md: "打到一半，又多打了" }, savedAt: "2026-09-30T10:05:00Z" };
    expect(shouldOfferRestore(null, null)).toBe(false);
    expect(shouldOfferRestore(backup, null)).toBe(true);
    expect(shouldOfferRestore(backup, { updatedAt: "2026-09-30T10:00:00Z", draft })).toBe(true);
    expect(shouldOfferRestore(backup, { updatedAt: "2026-09-30T10:10:00Z", draft })).toBe(false);
    expect(
      shouldOfferRestore({ draft, savedAt: "2026-09-30T10:05:00Z" }, { updatedAt: "2026-09-30T10:00:00Z", draft })
    ).toBe(false);
  });
});
