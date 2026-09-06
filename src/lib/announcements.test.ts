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

  it("首頁提示條只挑還沒解決的公告", () => {
    const active = getActiveAnnouncement("zh-TW");
    expect(active === null || active.status !== "resolved").toBe(true);
  });

  it("日期固定以 UTC 解讀，不會因時區少一天", () => {
    expect(formatAnnouncementDate("2026-09-06", "en")).toBe("September 6, 2026");
    expect(formatAnnouncementDate("2026-09-06", "zh-TW")).toBe("2026年9月6日");
  });
});
