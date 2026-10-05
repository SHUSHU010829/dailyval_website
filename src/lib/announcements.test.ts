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
    const dayAfterRelease = new Date("2026-10-06T00:00:00Z");
    expect(getActiveAnnouncement("zh-TW", dayAfterRelease)?.slug).toBe("release-3-0-0");
    const twoWeeksLater = new Date("2026-10-19T00:00:00Z");
    const later = getActiveAnnouncement("zh-TW", twoWeeksLater);
    expect(later?.slug).not.toBe("release-3-0-0");
    expect(later === null || later.status !== "resolved").toBe(true);
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

  it("日期固定以 UTC 解讀，不會因時區少一天", () => {
    expect(formatAnnouncementDate("2026-09-06", "en")).toBe("September 6, 2026");
    expect(formatAnnouncementDate("2026-09-06", "zh-TW")).toBe("2026年9月6日");
  });
});
