import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  announcementSlugs,
  formatAnnouncementDate,
  getActiveAnnouncement,
  getAnnouncement,
  getAnnouncements,
} from "./announcements";

describe("announcements", () => {
  it("依語系解析文案，未知語系退回 zh-TW", () => {
    const zh = getAnnouncement("zh-TW", "deathmatch-crash");
    const en = getAnnouncement("en", "deathmatch-crash");
    const unknown = getAnnouncement("ja", "deathmatch-crash");
    expect(zh?.title).not.toBe(en?.title);
    expect(unknown?.title).toBe(zh?.title);
  });

  it("不存在的 slug 回 null", () => {
    expect(getAnnouncement("en", "nope")).toBeNull();
  });

  it("列表新的在前，slug 與靜態參數一致", () => {
    const list = getAnnouncements("en");
    const dates = list.map((item) => item.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(list.map((item) => item.slug)).toEqual(announcementSlugs());
  });

  it("首頁提示條：更新公告上架 14 天內顯示，過期就不掛；已解決的問題不掛", () => {
    const beforeRelease = new Date("2026-10-04T23:59:59.999Z");
    expect(getActiveAnnouncement("zh-TW", beforeRelease)?.slug).not.toBe("release-3-0-0");
    const releaseDay = new Date("2026-10-05T12:00:00Z");
    expect(getActiveAnnouncement("zh-TW", releaseDay)?.slug).toBe("release-3-0-0");
    const twoWeeksLater = new Date("2026-10-19T00:00:00Z");
    const later = getActiveAnnouncement("zh-TW", twoWeeksLater);
    expect(later?.slug).not.toBe("release-3-0-0");
    expect(later === null || later.status !== "resolved").toBe(true);
  });

  it("首頁提示條：3.1.0 從上架日起取代 3.0.0，發布日之前不提早出現", () => {
    const dayBefore = new Date("2026-10-07T23:59:59.999Z");
    expect(getActiveAnnouncement("zh-TW", dayBefore)?.slug).toBe("release-3-0-0");
    const releaseDay = new Date("2026-10-08T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", releaseDay)?.slug).toBe("release-3-1-0");
    const twoWeeksLater = new Date("2026-10-22T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", twoWeeksLater)?.slug).not.toBe("release-3-1-0");
  });

  it("首頁提示條：功能調整說明從發布日起取代 3.1.0，掛 14 天", () => {
    const dayBefore = new Date("2026-10-12T23:59:59.999Z");
    expect(getActiveAnnouncement("zh-TW", dayBefore)?.slug).toBe("release-3-1-0");
    const published = new Date("2026-10-13T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", published)?.slug).toBe("agent-select-incognito");
    const lastDay = new Date("2026-10-26T23:59:59.999Z");
    expect(getActiveAnnouncement("zh-TW", lastDay)?.slug).toBe("agent-select-incognito");
    const twoWeeksLater = new Date("2026-10-27T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", twoWeeksLater)).toBeNull();
  });

  it("首頁提示條：連假揪團活動從發布日掛到 10/26 23:59（台灣時間），截止後回到功能調整說明", () => {
    const dayBefore = new Date("2026-10-23T23:59:59.999Z");
    expect(getActiveAnnouncement("zh-TW", dayBefore)?.slug).toBe("agent-select-incognito");
    const published = new Date("2026-10-24T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", published)?.slug).toBe("teamup-holiday-giveaway");
    const lastSecond = new Date("2026-10-26T15:59:58.999Z");
    expect(getActiveAnnouncement("zh-TW", lastSecond)?.slug).toBe("teamup-holiday-giveaway");
    const ended = new Date("2026-10-26T15:59:59Z");
    expect(getActiveAnnouncement("zh-TW", ended)?.slug).toBe("agent-select-incognito");
  });

  it("連假揪團活動：兩種語系段落、條列與圖片一致，抽 1 間房", () => {
    const zh = getAnnouncement("zh-TW", "teamup-holiday-giveaway");
    const en = getAnnouncement("en", "teamup-holiday-giveaway");
    expect(zh?.status).toBe("event");
    expect(zh?.endsAt).toBe("2026-10-26T23:59:59+08:00");
    expect(zh?.sections.length).toBe(en?.sections.length);
    expect(zh?.sections.map((s) => s.paragraphs?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.paragraphs?.length ?? 0)
    );
    expect(zh?.sections.map((s) => s.bullets?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.bullets?.length ?? 0)
    );
    const zhImages = zh?.sections.flatMap((s) => s.images ?? []).map((i) => i.src) ?? [];
    const enImages = en?.sections.flatMap((s) => s.images ?? []).map((i) => i.src) ?? [];
    expect(zhImages).toEqual(["https://img.dailyval.com/announcement/teamup-holiday-giveaway-1080x1080.jpg"]);
    expect(enImages).toEqual(zhImages);
    const zhLinks = zh?.sections.flatMap((s) => s.links ?? []).map((l) => l.href) ?? [];
    const enLinks = en?.sections.flatMap((s) => s.links ?? []).map((l) => l.href) ?? [];
    expect(zhLinks).toEqual(["https://www.threads.com/@dailyval_official/post/De3oOfYjA3Z"]);
    expect(enLinks).toEqual(zhLinks);
    expect(zh?.summary).toContain("抽出 1 間房");
    expect(en?.summary).toContain("draw 1 room");
    // 對外文案不用破折號
    const allText = [zh, en].flatMap((item) => [
      item?.title ?? "",
      item?.summary ?? "",
      ...(item?.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]) ?? []),
    ]);
    expect(allText.filter((text) => /—|——/.test(text))).toEqual([]);
  });

  it("抽獎結果：首頁提示條從 10/30 掛到領獎截止 11/2 23:59（台灣時間）", () => {
    const dayBefore = new Date("2026-10-29T23:59:59.999Z");
    expect(getActiveAnnouncement("zh-TW", dayBefore)).toBeNull();
    const published = new Date("2026-10-30T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", published)?.slug).toBe("giveaway-results-2026-10");
    const lastSecond = new Date("2026-11-02T15:59:58.999Z");
    expect(getActiveAnnouncement("zh-TW", lastSecond)?.slug).toBe("giveaway-results-2026-10");
    expect(getActiveAnnouncement("zh-TW", new Date("2026-11-02T15:59:59Z"))).toBeNull();
  });

  it("抽獎結果：兩種語系結構一致，驗證檔案都在 public，指紋就是 SHA256SUMS 的雜湊", () => {
    const zh = getAnnouncement("zh-TW", "giveaway-results-2026-10");
    const en = getAnnouncement("en", "giveaway-results-2026-10");
    expect(zh?.sections.length).toBe(en?.sections.length);
    expect(zh?.sections.map((s) => s.paragraphs?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.paragraphs?.length ?? 0)
    );
    expect(zh?.sections.map((s) => s.bullets?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.bullets?.length ?? 0)
    );
    const zhLinks = zh?.sections.flatMap((s) => s.links ?? []).map((l) => l.href) ?? [];
    const enLinks = en?.sections.flatMap((s) => s.links ?? []).map((l) => l.href) ?? [];
    expect(enLinks).toEqual(zhLinks);
    for (const href of zhLinks) {
      expect(existsSync(join(process.cwd(), "public", href))).toBe(true);
    }
    // 抽獎前貼在 Threads 的指紋，必須等於公開的 SHA256SUMS 檔本身的雜湊
    const sums = readFileSync(join(process.cwd(), "public/giveaways/2026-10/SHA256SUMS"));
    const fingerprint = createHash("sha256").update(sums).digest("hex");
    expect(fingerprint).toBe("bd56a001dfbc04f7fda46d2466ae4c2378b1f377d965a86f984b84916c8282fa");
    expect(zh?.sections.some((s) => s.paragraphs?.some((p) => p.includes(fingerprint)))).toBe(true);
    expect(en?.sections.some((s) => s.paragraphs?.some((p) => p.includes(fingerprint)))).toBe(true);
    const allText = [zh, en].flatMap((item) => [
      item?.title ?? "",
      item?.summary ?? "",
      ...(item?.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]) ?? []),
    ]);
    expect(allText.filter((text) => /—|——/.test(text))).toEqual([]);
  });

  it("選角與隱身說明：兩種語系段落一致，引文附 Riot 13.05 公告各語系的連結", () => {
    const zh = getAnnouncement("zh-TW", "agent-select-incognito");
    const en = getAnnouncement("en", "agent-select-incognito");
    expect(zh?.status).toBe("change");
    expect(zh?.sections.length).toBe(en?.sections.length);
    expect(zh?.sections.map((s) => s.paragraphs?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.paragraphs?.length ?? 0)
    );
    expect(zh?.sections.map((s) => s.bullets?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.bullets?.length ?? 0)
    );
    const zhQuotes = zh?.sections.flatMap((s) => (s.quote ? [s.quote] : [])) ?? [];
    const enQuotes = en?.sections.flatMap((s) => (s.quote ? [s.quote] : [])) ?? [];
    expect(zhQuotes.map((q) => q.href)).toEqual([
      "https://playvalorant.com/zh-tw/news/game-updates/valorant-patch-notes-13-05/",
    ]);
    expect(enQuotes.map((q) => q.href)).toEqual([
      "https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-05/",
    ]);
    // 對外文案不用破折號
    const allText = [zh, en].flatMap((item) => [
      item?.title ?? "",
      item?.summary ?? "",
      ...(item?.sections.flatMap((s) => [
        ...(s.paragraphs ?? []),
        ...(s.bullets ?? []),
        s.quote?.source ?? "",
      ]) ?? []),
    ]);
    expect(allText.filter((text) => /—|——/.test(text))).toEqual([]);
  });

  it("收藏分頁問題已在 3.1.0 修正，不再掛在首頁", () => {
    const published = new Date("2026-10-06T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", published)?.slug).not.toBe("collection-tabs-ios26");
    const item = getAnnouncement("zh-TW", "collection-tabs-ios26");
    expect(item?.status).toBe("resolved");
    expect(item?.updatedAt).toBe("2026-10-08");
  });

  it("收藏分頁公告兩種語系段落數一致", () => {
    const zh = getAnnouncement("zh-TW", "collection-tabs-ios26");
    const en = getAnnouncement("en", "collection-tabs-ios26");
    expect(zh?.sections.length).toBe(en?.sections.length);
    expect(zh?.sections.map((s) => s.bullets?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.bullets?.length ?? 0)
    );
    // 兩種語系放同一組截圖，只有說明文字不同
    expect(zh?.sections.map((s) => s.images?.map((image) => image.src) ?? [])).toEqual(
      en?.sections.map((s) => s.images?.map((image) => image.src) ?? [])
    );
    expect(zh?.sections.flatMap((s) => s.images ?? []).length).toBe(2);
  });

  it("死鬥閃退已解決並記了更新日期", () => {
    const item = getAnnouncement("zh-TW", "deathmatch-crash");
    expect(item?.status).toBe("resolved");
    expect(item?.updatedAt).toBe("2026-10-05");
  });

  it("3.0.0 更新公告兩種語系段落數一致", () => {
    const zh = getAnnouncement("zh-TW", "release-3-0-0");
    const en = getAnnouncement("en", "release-3-0-0");
    expect(zh?.sections.length).toBe(en?.sections.length);
    expect(zh?.sections.map((s) => s.bullets?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.bullets?.length ?? 0)
    );
  });

  it("3.1.0 更新公告兩種語系段落、條列與圖片一致", () => {
    const zh = getAnnouncement("zh-TW", "release-3-1-0");
    const en = getAnnouncement("en", "release-3-1-0");
    expect(zh?.status).toBe("released");
    expect(zh?.sections.length).toBe(en?.sections.length);
    expect(zh?.sections.map((s) => s.bullets?.length ?? 0)).toEqual(
      en?.sections.map((s) => s.bullets?.length ?? 0)
    );
    expect(zh?.sections.map((s) => s.images?.map((image) => image.src) ?? [])).toEqual(
      en?.sections.map((s) => s.images?.map((image) => image.src) ?? [])
    );
    expect(zh?.sections.flatMap((s) => s.bullets ?? []).length).toBe(12);
    expect(zh?.sections.flatMap((s) => s.images ?? []).length).toBe(3);
  });

  it("日期固定以 UTC 解讀，不會因時區少一天", () => {
    expect(formatAnnouncementDate("2026-09-06", "en")).toBe("September 6, 2026");
    expect(formatAnnouncementDate("2026-09-06", "zh-TW")).toBe("2026年9月6日");
  });
});
