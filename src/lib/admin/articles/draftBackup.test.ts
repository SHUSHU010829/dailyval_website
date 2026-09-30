import { describe, expect, it } from "vitest";
import type { ArticleDraft } from "./types";
import {
  clearDraftBackup,
  draftBackupKey,
  readDraftBackup,
  serverIsNewer,
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

  it("內容跟伺服器不一樣就提議恢復，時間不是門檻；一模一樣才不問；新文章有備份就問", () => {
    const backup = { draft: { ...draft, body_md: "打到一半，又多打了" }, savedAt: "2026-09-30T10:05:00Z" };
    expect(shouldOfferRestore(null, null)).toBe(false);
    expect(shouldOfferRestore(backup, null)).toBe(true);
    expect(shouldOfferRestore(backup, { updatedAt: "2026-09-30T10:00:00Z", draft })).toBe(true);
    // 管理員下架推了 updated_at，內文沒動：備份還是要問，不能當舊的丟掉。
    expect(shouldOfferRestore(backup, { updatedAt: "2026-09-30T10:10:00Z", draft })).toBe(true);
    expect(
      shouldOfferRestore({ draft, savedAt: "2026-09-30T10:05:00Z" }, { updatedAt: "2026-09-30T10:00:00Z", draft })
    ).toBe(false);
    expect(serverIsNewer(backup, "2026-09-30T10:10:00Z")).toBe(true);
    expect(serverIsNewer(backup, "2026-09-30T10:00:00Z")).toBe(false);
    expect(serverIsNewer(backup, null)).toBe(false);
  });
});
