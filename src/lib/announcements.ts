import { routing } from "@/i18n/routing";

// 公告資料目前寫死在這裡（第一則是死鬥閃退說明）。
// App 端的公告走 Firestore `news`（title / url / thumbnail / creationDate /
// openLink），把 /<locale>/announcements/<slug> 填進 url 就能在 App 內開這一頁。
// 之後要改成從 Firestore 或其他來源讀，只需替換 ANNOUNCEMENTS 的來源，
// 頁面與元件只吃 getAnnouncements / getAnnouncement 的回傳型別。

type Locale = (typeof routing.locales)[number];

export type AnnouncementStatus = "investigating" | "fixPending" | "resolved";

export interface AnnouncementSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface AnnouncementCopy {
  title: string;
  summary: string;
  sections: AnnouncementSection[];
}

interface AnnouncementRecord {
  slug: string;
  status: AnnouncementStatus;
  /** 發布日期（YYYY-MM-DD） */
  publishedAt: string;
  /** 最後更新日期（YYYY-MM-DD），沒改過就不填 */
  updatedAt?: string;
  copy: Record<Locale, AnnouncementCopy>;
}

/** 已依語系解析完文案的公告，頁面只吃這個型別 */
export interface Announcement extends AnnouncementCopy {
  slug: string;
  status: AnnouncementStatus;
  publishedAt: string;
  updatedAt?: string;
}

const ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    slug: "deathmatch-crash",
    status: "fixPending",
    publishedAt: "2026-09-06",
    copy: {
      "zh-TW": {
        title: "死鬥／團隊死鬥戰績閃退問題",
        summary:
          "在 App 內查看死鬥或團隊死鬥的對局紀錄時，可能會閃退或一直停在載入畫面。問題已修正完成，將隨下一版更新推出。",
        sections: [
          {
            heading: "發生什麼事",
            paragraphs: [
              "有玩家回報，在 DailyVal 查看「死鬥」或「團隊死鬥」的對局時，App 會閃退，或畫面持續顯示載入中並跳出錯誤訊息。",
              "其他模式（競技、一般、輪替等）的戰績查詢不受影響。",
            ],
          },
          {
            heading: "原因",
            paragraphs: [
              "死鬥與團隊死鬥的對局資料，在回合欄位的格式上與其他模式不同，目前上架的版本沒有處理到這個差異，解析時會失敗。",
            ],
          },
          {
            heading: "目前進度",
            paragraphs: [
              "修正已經完成並通過測試，會包含在下一版更新中。更新上架後我們會在這裡更新公告。",
            ],
          },
          {
            heading: "更新前的暫時做法",
            bullets: [
              "請先避免點開死鬥／團隊死鬥的對局紀錄。",
              "若 App 已經閃退，重新開啟即可繼續使用其他功能。",
            ],
          },
          {
            paragraphs: ["造成困擾很抱歉，也感謝所有回報問題的玩家。"],
          },
        ],
      },
      en: {
        title: "Deathmatch and Team Deathmatch match history crash",
        summary:
          "Opening a Deathmatch or Team Deathmatch match in the app can crash it or leave it stuck on the loading screen. The fix is complete and ships with the next update.",
        sections: [
          {
            heading: "What's happening",
            paragraphs: [
              "Some players reported that opening a Deathmatch or Team Deathmatch match in DailyVal crashes the app, or leaves the screen loading with an error message.",
              "Match history for every other mode (Competitive, Unrated, Swiftplay and so on) is unaffected.",
            ],
          },
          {
            heading: "Cause",
            paragraphs: [
              "Deathmatch and Team Deathmatch match data formats its round fields differently from other modes. The version currently on the App Store does not handle that difference, so parsing fails.",
            ],
          },
          {
            heading: "Status",
            paragraphs: [
              "The fix is complete and tested, and will be included in the next update. We will update this notice once it is live on the App Store.",
            ],
          },
          {
            heading: "Until the update",
            bullets: [
              "Avoid opening Deathmatch or Team Deathmatch matches for now.",
              "If the app has crashed, reopen it and everything else keeps working.",
            ],
          },
          {
            paragraphs: ["Sorry for the trouble, and thank you to everyone who reported it."],
          },
        ],
      },
    },
  },
];

function resolveLocale(locale: string): Locale {
  return (routing.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : routing.defaultLocale;
}

function resolve(record: AnnouncementRecord, locale: string): Announcement {
  const { copy, ...meta } = record;
  return { ...meta, ...copy[resolveLocale(locale)] };
}

/** 全部公告，新的在前 */
export function getAnnouncements(locale: string): Announcement[] {
  return [...ANNOUNCEMENTS]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((record) => resolve(record, locale));
}

export function getAnnouncement(locale: string, slug: string): Announcement | null {
  const record = ANNOUNCEMENTS.find((item) => item.slug === slug);
  return record ? resolve(record, locale) : null;
}

/** 首頁提示條用：最新一則還沒解決的公告 */
export function getActiveAnnouncement(locale: string): Announcement | null {
  return getAnnouncements(locale).find((item) => item.status !== "resolved") ?? null;
}

/** 靜態產生與 sitemap 用 */
export function announcementSlugs(): string[] {
  return ANNOUNCEMENTS.map((item) => item.slug);
}

/** 日期字串是純日期，固定用 UTC 解讀，避免伺服器時區把日期往前推一天 */
export function formatAnnouncementDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`)
  );
}
