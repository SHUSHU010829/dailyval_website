import { routing } from "@/i18n/routing";

// 公告資料目前寫死在這裡（第一則是死鬥閃退說明）。
// App 端的公告走 Firestore `news`（title / url / thumbnail / creationDate /
// openLink），把 /<locale>/announcements/<slug> 填進 url 就能在 App 內開這一頁。
// 之後要改成從 Firestore 或其他來源讀，只需替換 ANNOUNCEMENTS 的來源，
// 頁面與元件只吃 getAnnouncements / getAnnouncement 的回傳型別。

type Locale = (typeof routing.locales)[number];

export type AnnouncementStatus = "investigating" | "fixPending" | "resolved" | "released";

export interface AnnouncementImage {
  src: string;
  alt: string;
  caption?: string;
  /** 原圖尺寸，讓版面在圖片載入前就留好位置 */
  width: number;
  height: number;
}

export interface AnnouncementSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** 截圖放在 R2（img.dailyval.com/announcement/），排在條列之後 */
  images?: AnnouncementImage[];
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
    slug: "collection-tabs-ios26",
    status: "fixPending",
    publishedAt: "2026-10-06",
    copy: {
      "zh-TW": {
        title: "「收藏」頁上方分頁看不到文字",
        summary:
          "在 iOS 26 以上的裝置，「收藏」頁上方的分頁可能看不到文字，但仍可點擊切換。我們已找到原因並完成修正，會在下一次 App 更新推出。",
        sections: [
          {
            heading: "發生什麼事",
            paragraphs: [
              "有玩家回報，在 DailyVal 3.0.0 打開「收藏」時，上方的「收藏」「玩家配置」「武器配置」分頁列一片空白，看不到文字和底線。點擊原本分頁的位置仍可以正常切換。",
              "這個問題只出現在 iOS 26 以上的裝置，iOS 18 及更早的版本顯示正常。",
            ],
          },
          {
            heading: "原因",
            paragraphs: [
              "收藏頁的下拉重新整理功能，也被套用到了上方的分頁列。從 iOS 26 開始，分頁列在這種情況下不會顯示內容。",
            ],
          },
          {
            heading: "修正狀態",
            paragraphs: [
              "修正已完成，會隨下一次 App 更新推出。更新上架後，我們會再更新這則公告。",
            ],
          },
          {
            heading: "在更新之前",
            bullets: [
              "分頁由左到右依序是「收藏」「玩家配置」「武器配置」，直接點擊對應位置就能切換，位置可以對照下方的圖。",
              "也可以在下方內容區左右滑動來切換分頁。",
            ],
            images: [
              {
                src: "https://img.dailyval.com/announcement/collection-tabs-ios26-normal.jpg",
                alt: "「收藏」頁正常顯示的畫面，上方分頁由左到右是「收藏」「玩家配置」「武器配置」。",
                caption: "正常顯示：分頁由左到右是「收藏」「玩家配置」「武器配置」。",
                width: 900,
                height: 865,
              },
              {
                src: "https://img.dailyval.com/announcement/collection-tabs-ios26-blank.jpg",
                alt: "iOS 26 以上的「收藏」頁，上方分頁列一片空白，空白處用白線圈起來。",
                caption: "iOS 26 以上：圈起來的地方是空白的。點擊和正常畫面相同的位置，一樣能切換分頁。",
                width: 900,
                height: 866,
              },
            ],
          },
          {
            paragraphs: ["造成不便很抱歉，也感謝回報問題的玩家。"],
          },
        ],
      },
      en: {
        title: "Collection tabs show no text",
        summary:
          "On iOS 26 and later, the tabs at the top of Collection may show no text, though tapping them still switches pages. We found the cause and have a fix ready for the next app update.",
        sections: [
          {
            heading: "What's happening",
            paragraphs: [
              "Some players reported that in DailyVal 3.0.0, the Collection, Player setup and Weapon setup tabs at the top of Collection are blank, with no text or underline. Tapping where a tab should be still switches pages.",
              "This only happens on iOS 26 and later. iOS 18 and earlier display the tabs normally.",
            ],
          },
          {
            heading: "Cause",
            paragraphs: [
              "Collection's pull-to-refresh was also applied to the tab bar at the top. Starting with iOS 26, the tab bar shows no content in that case.",
            ],
          },
          {
            heading: "Status",
            paragraphs: [
              "The fix is done and ships with the next app update. We will update this notice once it is on the App Store.",
            ],
          },
          {
            heading: "Until you update",
            bullets: [
              "From left to right the tabs are Collection, Player setup and Weapon setup. Tap that spot to switch; the screenshots below show where.",
              "You can also swipe left or right on the content below to switch tabs.",
            ],
            images: [
              {
                src: "https://img.dailyval.com/announcement/collection-tabs-ios26-normal.jpg",
                alt: "The Collection screen displayed normally, with the Collection, Player setup and Weapon setup tabs at the top from left to right.",
                caption: "Normal: from left to right the tabs are Collection, Player setup and Weapon setup.",
                width: 900,
                height: 865,
              },
              {
                src: "https://img.dailyval.com/announcement/collection-tabs-ios26-blank.jpg",
                alt: "The Collection screen on iOS 26 and later, with the blank tab bar circled in white.",
                caption: "iOS 26 and later: the circled area is blank. Tap the same spots as on the normal screen to switch tabs.",
                width: 900,
                height: 866,
              },
            ],
          },
          {
            paragraphs: ["Sorry for the trouble, and thank you to everyone who reported it."],
          },
        ],
      },
    },
  },
  {
    // 內文逐條照 release/app-store/3.0.0/metadata.json 的 zh-Hant whatsNew，不改字
    slug: "release-3-0-0",
    status: "released",
    publishedAt: "2026-10-05",
    copy: {
      "zh-TW": {
        title: "DailyVal 3.0.0 更新上架",
        summary:
          "揪團房間、準星工坊、遊戲話題、賽後評分、對戰紀錄與造型頁重新設計、補簽，以及死鬥／團隊死鬥戰績閃退修正，現已在 App Store 推出。",
        sections: [
          {
            heading: "社群與揪團",
            bullets: [
              "新增揪團房間，可依伺服器、遊戲模式、牌位與角色需求尋找隊友，並透過連結分享房間。",
              "新增準星工坊：預覽、發布、收藏與分享準星，一鍵複製設定代碼。",
              "新增遊戲話題專區，閱讀與分享遊戲相關文章。",
              "新增造型留言動態，更方便查看玩家對各款造型的討論。",
              "整合社群設定、封鎖名單與驗證申請，改善檢舉與封鎖操作。",
            ],
          },
          {
            heading: "電競觀賽與討論",
            bullets: [
              "新增賽後比賽與選手評分，分享你對場上表現的看法。",
              "新增電競留言按讚、最熱／最新排序與選手熱門回覆。",
              "新增比賽及選手評分分享卡，透過連結直接開啟對應賽事。",
            ],
          },
          {
            heading: "戰績與個人檔案",
            bullets: [
              "重新設計對戰紀錄卡片，更清楚呈現勝負、比分與牌位分數變化，並以顏色標示擊殺效率及爆頭率表現。",
              "支援表現分數與分數細項，重新整理計分板、表現分析及回合時間軸，方便回顧每場對戰。",
              "個人檔案整合當季牌位與生涯最高牌位，並顯示達成最高牌位的賽季。",
            ],
          },
          {
            heading: "遊戲工具與造型",
            bullets: [
              "新增技能 line up 影片，可依特務、地圖、攻守方、用途及語言篩選。",
              "重新設計造型詳細頁，集中查看造型、炫彩、等級特效影片、評分分布與留言。",
            ],
          },
          {
            heading: "簽到與 Premium",
            bullets: [
              "新增補簽功能，可補回最近 7 個商店日內符合條件的漏簽，延續連續簽到紀錄。",
              "一般用戶可透過獎勵廣告補簽，Premium 會員可免廣告補簽。",
            ],
          },
          {
            heading: "問題修正與效能改善",
            bullets: [
              "修正團隊死鬥等模式的戰績解析、比分與篩選顯示問題。",
              "改善遊戲版本更新後的資料請求相容性。",
              "修正貼文、留言與個人紀錄分頁可能卡住、重複或停止載入的問題。",
              "改善按讚、評分、留言及通知已讀狀態的同步。",
              "修正切換帳號或重新整理後，部分畫面仍顯示舊資料的問題。",
              "修正收藏庫裝備設定的儲存與更新問題。",
              "修正夜市統計重複計算同一活動天數的問題。",
              "改善快速切換分頁、返回頁面、圖片載入與分享操作的穩定性。",
            ],
          },
          {
            heading: "功能調整",
            bullets: [
              "藍勾勾驗證制度更新，原已驗證用戶需重新申請；既有待審申請保留。",
              "移除 App 內遠端選角與鎖定功能，保留選角階段資訊及隊伍組合建議。",
            ],
          },
          {
            paragraphs: ["請至 App Store 更新到 3.0.0，感謝大家的支持與回報。"],
          },
        ],
      },
      en: {
        title: "DailyVal 3.0.0 is now on the App Store",
        summary:
          "Team Up rooms, the Crosshair Workshop, Game Topics, post-match ratings, redesigned match history and skin pages, make-up check-ins, and the Deathmatch / Team Deathmatch crash fix are all live.",
        sections: [
          {
            heading: "Community and Team Up",
            bullets: [
              "Team Up rooms: find teammates by server, game mode, rank and role, and share a room by link.",
              "Crosshair Workshop: preview, publish, save and share crosshairs, and copy the settings code with one tap.",
              "Game Topics: read and share articles about the game.",
              "Skin comment feed: see what players are saying about each skin in one place.",
              "Community settings, the block list and verification requests now live together; reporting and blocking are easier.",
            ],
          },
          {
            heading: "Esports",
            bullets: [
              "Rate the match and the players after each game and share your take on the performance.",
              "Like esports comments, sort by Top or Newest, and see the top replies for each player.",
              "Share cards for match and player ratings that open the match directly from the link.",
            ],
          },
          {
            heading: "Match history and profile",
            bullets: [
              "Redesigned match cards: clearer result, score and rank rating change, with KDA and headshot rate colored by performance.",
              "Performance Score with its breakdown; the scoreboard, performance analysis and round timeline are reorganized for reviewing each match.",
              "Your profile shows the current act rank and your peak rank, with the act you reached it in.",
            ],
          },
          {
            heading: "Game tools and skins",
            bullets: [
              "Ability lineup videos, filterable by agent, map, attack or defense, purpose and language.",
              "Redesigned skin detail page: the skin, its variants, level effect videos, rating distribution and comments in one place.",
            ],
          },
          {
            heading: "Check-in and Premium",
            bullets: [
              "Make-up check-ins: recover eligible missed days within the last 7 store days and keep your streak.",
              "Free users make up a day by watching a rewarded ad; Premium members make up without ads.",
            ],
          },
          {
            heading: "Fixes and performance",
            bullets: [
              "Fixed match history parsing, scores and filters for Team Deathmatch and other modes (the Deathmatch crash).",
              "Better compatibility of data requests after game patches.",
              "Fixed post, comment and personal history pages that could get stuck, repeat or stop loading.",
              "Better sync of likes, ratings, comments and notification read state.",
              "Fixed stale data on some screens after switching accounts or refreshing.",
              "Fixed saving and updating loadout settings in the collection.",
              "Fixed Night Market stats counting the same event's days twice.",
              "Better stability when switching tabs quickly, going back, loading images and sharing.",
            ],
          },
          {
            heading: "Changes",
            bullets: [
              "Blue verification has been reworked; previously verified users need to apply again, and pending applications are kept.",
              "Remote agent select and lock-in are removed from the app; agent-select stage info and team composition suggestions stay.",
            ],
          },
          {
            paragraphs: ["Update to 3.0.0 on the App Store. Thank you for your support and your reports."],
          },
        ],
      },
    },
  },
  {
    slug: "deathmatch-crash",
    status: "resolved",
    publishedAt: "2026-09-06",
    updatedAt: "2026-10-05",
    copy: {
      "zh-TW": {
        title: "死鬥／團隊死鬥戰績閃退問題",
        summary:
          "在 App 內查看死鬥或團隊死鬥的對局紀錄時，可能會閃退或一直停在載入畫面。此問題已在 3.0.0 修正，請更新到最新版本。",
        sections: [
          {
            heading: "發生什麼事",
            paragraphs: [
              "有玩家回報，在 DailyVal 查看「死鬥」或「團隊死鬥」的對局時，App 會閃退，或畫面持續顯示載入中並跳出錯誤訊息。",
              "其他模式（積分、一般、超速衝點等）的戰績查詢不受影響。",
            ],
          },
          {
            heading: "原因",
            paragraphs: [
              "死鬥與團隊死鬥的對局資料，在回合欄位的格式上與其他模式不同，3.0.0 之前的版本沒有處理到這個差異，解析時會失敗。",
            ],
          },
          {
            heading: "修正狀態",
            paragraphs: [
              "3.0.0 已於 2026 年 10 月 5 日上架，更新後即可正常查看死鬥／團隊死鬥對局。",
            ],
          },
          {
            heading: "若尚未更新",
            bullets: [
              "請先到 App Store 更新到 3.0.0 或以上版本。",
              "更新前請避免點開死鬥／團隊死鬥的對局紀錄；若 App 已經閃退，重新開啟即可繼續使用其他功能。",
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
          "Opening a Deathmatch or Team Deathmatch match in the app can crash it or leave it stuck on the loading screen. This is fixed in 3.0.0; please update to the latest version.",
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
              "Deathmatch and Team Deathmatch match data formats its round fields differently from other modes. Versions before 3.0.0 did not handle that difference, so parsing failed.",
            ],
          },
          {
            heading: "Status",
            paragraphs: [
              "3.0.0 went live on the App Store on October 5, 2026. After updating, Deathmatch and Team Deathmatch matches open normally.",
            ],
          },
          {
            heading: "If you have not updated yet",
            bullets: [
              "Update to 3.0.0 or later on the App Store.",
              "Until then, avoid opening Deathmatch or Team Deathmatch matches; if the app has crashed, reopen it and everything else keeps working.",
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

/** 更新公告在首頁提示條上掛幾天 */
const RELEASE_NOTICE_DAYS = 14;

/**
 * 首頁提示條用：最新一則還在處理中的問題，或上架 14 天內的更新公告，
 * 依發布日新的優先。已解決的問題不掛；更新公告過了期限也自動下架。
 */
export function getActiveAnnouncement(locale: string, now: Date = new Date()): Announcement | null {
  return (
    getAnnouncements(locale).find((item) => {
      // 發布日之前都不掛，未來日期的公告不提早出現
      const age = now.getTime() - Date.parse(`${item.publishedAt}T00:00:00Z`);
      if (age < 0) return false;
      if (item.status === "investigating" || item.status === "fixPending") return true;
      // 更新公告上架滿 14 天就不掛
      if (item.status === "released") return age < RELEASE_NOTICE_DAYS * 24 * 60 * 60 * 1000;
      return false;
    }) ?? null
  );
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
