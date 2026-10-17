import { routing } from "@/i18n/routing";

// 公告資料目前寫死在這裡（第一則是死鬥閃退說明）。
// App 端的公告走 Firestore `news`（title / url / thumbnail / creationDate /
// openLink），把 /<locale>/announcements/<slug> 填進 url 就能在 App 內開這一頁。
// 之後要改成從 Firestore 或其他來源讀，只需替換 ANNOUNCEMENTS 的來源，
// 頁面與元件只吃 getAnnouncements / getAnnouncement 的回傳型別。

type Locale = (typeof routing.locales)[number];

/** change＝App 功能調整的說明（拿掉或改變某個功能），首頁提示條跟更新公告一樣掛 14 天 */
export type AnnouncementStatus = "investigating" | "fixPending" | "resolved" | "released" | "change";

export interface AnnouncementImage {
  src: string;
  alt: string;
  caption?: string;
  /** 原圖尺寸，讓版面在圖片載入前就留好位置 */
  width: number;
  height: number;
}

/** 引用外部公告的原文（例如 Riot 的版本更新公告），逐字照抄並附出處連結 */
export interface AnnouncementQuote {
  text: string;
  /** 出處名稱，例如「《特戰英豪》13.05版本更新公告」 */
  source: string;
  href: string;
}

export interface AnnouncementSection {
  heading?: string;
  paragraphs?: string[];
  /** 排在段落之後、條列之前 */
  quote?: AnnouncementQuote;
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
    // 兩項改動都在 3.0.0（10/5 上架）：DailyVal 4ad70e3c 拿掉選角、7a093dbe 隱身玩家不給個人頁。
    // 引文逐字照 Riot 13.05 版本更新公告（2026-09-01）的「玩家行為更新」，中英文各引該語系原文
    slug: "agent-select-incognito",
    status: "change",
    publishedAt: "2026-10-13",
    copy: {
      "zh-TW": {
        title: "移除 App 內選角，並保護隱身玩家的生涯紀錄",
        summary:
          "從 3.0.0 起，DailyVAL 不再提供在 App 內選擇或鎖定特務，選角與對戰畫面中的隱身玩家也只顯示特務與牌位，任何人都無法從這裡查看他們的生涯。Riot 已表示會懲處秒鎖工具與直播狙擊，這兩項調整都是為了保護大家的帳號與遊戲體驗。",
        sections: [
          {
            heading: "調整內容",
            paragraphs: ["以下改動從 3.0.0（10 月 5 日上架）開始生效。"],
            bullets: [
              "移除 App 內選角：選角階段不能再從 App 選擇或鎖定特務，請直接在遊戲內選角。選角畫面仍會顯示地圖、隊友選的特務、鎖定人數、倒數與陣容建議。",
              "隱身玩家只顯示特務與牌位：選角與對戰畫面中，開啟隱身的玩家不顯示名稱，也沒有個人頁入口。Premium 會員也一樣，原本 Premium 可查看隱身玩家的功能已經移除。",
            ],
          },
          {
            heading: "Riot 官方的說法",
            paragraphs: ["Riot 在 9 月 1 日發布的《特戰英豪》13.05版本更新公告中，於「玩家行為更新」寫道："],
            quote: {
              text: "我們已開始對偵測到的直播狙擊或使用秒鎖工具的行為進行懲處。玩家若被發現使用這些工具將暫時遭到停權，多次違規則會永久停權。",
              source: "Riot Games《特戰英豪》13.05版本更新公告，玩家行為更新",
              href: "https://playvalorant.com/zh-tw/news/game-updates/valorant-patch-notes-13-05/",
            },
          },
          {
            heading: "為什麼拿掉選角",
            paragraphs: [
              "App 內選角是在遊戲外替你送出選擇與鎖定特務的指令，做法和秒鎖工具一樣，也一直有人拿它來秒鎖搶角，讓隊友來不及溝通。",
              "Riot 已經開始懲處秒鎖工具，被偵測到會暫時停權，多次違規會永久停權。繼續提供這個功能，等於讓使用的玩家承擔停權風險，所以我們決定把它整個拿掉。",
            ],
          },
          {
            heading: "為什麼看不到隱身玩家的生涯",
            paragraphs: [
              "開啟隱身，是玩家選擇不讓隊伍以外的人知道自己是誰。如果選角或對戰時還能從第三方工具查到名稱和生涯，就可能被有心人士拿來狙擊實況主，或在對局中、對局後騷擾特定玩家。",
              "直播狙擊同樣是 Riot 這次點名懲處的行為。玩家選擇了隱身，DailyVAL 就尊重這個選擇，Premium 會員也不例外。",
            ],
          },
          {
            heading: "還在用舊版的玩家",
            paragraphs: [
              "3.0.0 之前的版本仍保留 App 內選角。為了帳號安全，請不要再使用，並到 App Store 更新到最新版本。",
            ],
          },
          {
            paragraphs: ["謝謝大家的理解與支持。"],
          },
        ],
      },
      en: {
        title: "In-app agent select is gone, and incognito players' careers stay private",
        summary:
          "Since 3.0.0, DailyVAL no longer lets you pick or lock an agent from the app, and incognito players in agent select and live matches show only their agent and rank, so nobody can open their career from there. Riot has said it penalizes instalock tools and stream sniping. Both changes are there to protect your account and your games.",
        sections: [
          {
            heading: "What changed",
            paragraphs: ["These changes took effect in 3.0.0, released on October 5."],
            bullets: [
              "In-app agent select removed: during agent select you can no longer pick or lock an agent from the app, so pick in the game. The agent select screen still shows the map, your teammates' picks, the lock count, the countdown and comp suggestions.",
              "Incognito players show agent and rank only: in agent select and live matches, a player with incognito on shows no name and has no profile link. This applies to Premium members too, and the Premium option to view incognito players has been removed.",
            ],
          },
          {
            heading: "What Riot said",
            paragraphs: ["In VALORANT Patch Notes 13.05, published on September 1, Riot wrote under Player Behavior Updates:"],
            quote: {
              text: "We've started rolling out penalties if we detect usage of stream sniping and instalock tools. Players found using these tools will be subject to temporary game bans that will escalate to permanent with repeated usage.",
              source: "Riot Games, VALORANT Patch Notes 13.05, Player Behavior Updates",
              href: "https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-05/",
            },
          },
          {
            heading: "Why we removed agent select",
            paragraphs: [
              "In-app agent select sends the pick and lock commands for you from outside the game, the same way instalock tools do, and people kept using it to instalock and grab agents before their teammates could talk it over.",
              "Riot now penalizes instalock tools: detected use leads to temporary bans that become permanent with repeated use. Keeping the feature would leave everyone who used it exposed to a ban, so we removed it entirely.",
            ],
          },
          {
            heading: "Why incognito players' careers are hidden",
            paragraphs: [
              "Turning on incognito is a player's choice not to let people outside their party know who they are. If their name and career could still be looked up in a third-party tool during agent select or a match, people could use that to snipe streamers or to harass specific players during and after a game.",
              "Stream sniping is the other behavior Riot named for penalties. When a player chooses incognito, DailyVAL respects that choice, Premium members included.",
            ],
          },
          {
            heading: "If you are still on an older version",
            paragraphs: [
              "Versions before 3.0.0 still include in-app agent select. To keep your account safe, please stop using it and update to the latest version on the App Store.",
            ],
          },
          {
            paragraphs: ["Thank you for your understanding and support."],
          },
        ],
      },
    },
  },
  {
    // 條列逐字照 App Store 3.1.0 的 What's New（zh-Hant），只分段不改字
    slug: "release-3-1-0",
    status: "released",
    publishedAt: "2026-10-08",
    copy: {
      "zh-TW": {
        title: "DailyVAL 3.1.0 更新上架",
        summary:
          "常用功能集中到「日常」分頁、社群分類重新整理、貼文與留言翻譯、記分板隊伍配色，以及 iOS 26 收藏分頁等多項問題修正，現已在 App Store 推出。",
        sections: [
          {
            heading: "「日常」分頁與社群",
            bullets: [
              "調整功能入口，將每日商店、收藏配置、我的戰績、造型評分與商店歷史集中至「日常」分頁，並改善帳號切換操作。",
              "整理社群分類與導覽，方便查找遊戲新聞、話題與合作夥伴；準心工坊移至「遊戲」分頁。",
            ],
            images: [
              {
                src: "https://img.dailyval.com/announcement/release-3-1-0-daily-1080x1350.png",
                alt: "「日常」分頁示意圖：下方分頁列的「配對」換成「日常」，頁面上方是帳號切換，下面依序是每日商城、造型收藏、我的戰績、造型評分與商城紀錄。",
                caption: "「日常」分頁：每日商城、造型收藏、我的戰績、造型評分與商城紀錄都在這裡。",
                width: 1080,
                height: 1350,
              },
              {
                src: "https://img.dailyval.com/announcement/release-3-1-0-community-1080x1350.png",
                alt: "社群分頁示意圖：上方分頁依序是最新、造型動態、遊戲新聞、遊戲話題與合作夥伴，下面是每日配對的報名倒數。",
                caption: "社群分頁：最新、造型動態、遊戲新聞、遊戲話題與合作夥伴。",
                width: 1080,
                height: 1350,
              },
            ],
          },
          {
            heading: "閱讀與戰績",
            bullets: [
              "改善跨語言閱讀體驗，貼文與留言可直接在原文下方查看翻譯（需 iOS 18 以上）。",
              "改善戰績表敵我隊伍配色，修正查看他人戰績時「你」與隊伍歸屬標示不正確的情況。",
            ],
            images: [
              {
                src: "https://img.dailyval.com/announcement/release-3-1-0-scoreboard-1080x1350.png",
                alt: "記分板示意圖：我方整排藍色底、敵方整排紅色底，自己那一列標示「你」。",
                caption: "記分板以底色區分我方與敵方，自己那一列標示「你」（示意圖）。",
                width: 1080,
                height: 1350,
              },
            ],
          },
          {
            heading: "問題修正",
            bullets: [
              "修正 iOS 26 收藏分類列與 Line up 地圖選項可能消失的問題。",
              "修正每日配對在非報名時段顯示錯誤倒數，以及跨時段未即時更新的問題。",
              "修正商店歷史頁面跨日後，今日標記、每日任務與連續紀錄未更新的問題。",
              "修正直式文章封面遭裁切或比例不正確的問題。",
              "修正下拉選手數據卡時，意外刷新後方賽事頁面的問題。",
              "修正快速重複點擊 Apple 登入時可能驗證失敗的問題。",
              "修正部分 Riot Tag Line 與多語文字造成玩家名稱、頭像及牌位同步失敗的問題。",
              "修正英文通知與部分介面顯示程式代碼、單複數不正確，以及英文介面仍載入中文遊戲資料的問題。",
            ],
          },
          {
            paragraphs: ["請至 App Store 更新到 3.1.0，感謝大家的支持與回報。"],
          },
        ],
      },
      en: {
        title: "DailyVAL 3.1.0 is now on the App Store",
        summary:
          "Everyday features gathered in the new Daily tab, reorganized Community categories, translation for posts and comments, scoreboard team colors, and fixes including the iOS 26 Collection tabs are now live.",
        sections: [
          {
            heading: "Daily tab and Community",
            bullets: [
              "The Daily Store, your collection and loadouts, My stats, Skin ratings and Store History now live together in the Daily tab, and switching accounts is easier.",
              "Community categories and navigation are reorganized so Game News, Game topics and Partners are easier to find; the Crosshair Workshop moved to the Game tab.",
            ],
            images: [
              {
                src: "https://img.dailyval.com/announcement/release-3-1-0-daily-1080x1350.png",
                alt: "Illustration of the Daily tab: Daily replaces Match in the bottom tab bar, with the account switcher at the top followed by Daily Store, Skin Collection, My stats, Skin ratings and Store History.",
                caption: "The Daily tab: Daily Store, Skin Collection, My stats, Skin ratings and Store History in one place.",
                width: 1080,
                height: 1350,
              },
              {
                src: "https://img.dailyval.com/announcement/release-3-1-0-community-1080x1350.png",
                alt: "Illustration of the Community tabs Latest, Skin activity, Game News, Game topics and Partners, with the Daily Match sign-up countdown below.",
                caption: "Community tabs: Latest, Skin activity, Game News, Game topics and Partners.",
                width: 1080,
                height: 1350,
              },
            ],
          },
          {
            heading: "Reading and match stats",
            bullets: [
              "Posts and comments in other languages can show a translation right below the original (iOS 18 or later).",
              "Clearer team colors on the scoreboard, and the You label and team marking are now correct when viewing someone else's match.",
            ],
            images: [
              {
                src: "https://img.dailyval.com/announcement/release-3-1-0-scoreboard-1080x1350.png",
                alt: "Illustration of the scoreboard: your team's rows in blue, the enemy team's rows in red, and your own row marked You.",
                caption: "The scoreboard colors your team and the enemy team, and marks your own row as You (illustration).",
                width: 1080,
                height: 1350,
              },
            ],
          },
          {
            heading: "Fixes",
            bullets: [
              "Fixed the Collection tab bar and the Lineups map options that could disappear on iOS 26.",
              "Fixed Daily Match showing the wrong countdown outside the sign-up window, and not updating when the window changes.",
              "Fixed Store History not updating the today marker, daily tasks and streak after the day rolls over.",
              "Fixed portrait article covers being cropped or shown at the wrong aspect ratio.",
              "Fixed pulling down on a player stats card also refreshing the match page behind it.",
              "Fixed Sign in with Apple sometimes failing verification when tapped repeatedly.",
              "Fixed player names, avatars and ranks failing to sync for some Riot tag lines and text in other languages.",
              "Fixed English notifications and some screens showing code identifiers or the wrong singular or plural, and the English interface still loading Chinese game data.",
            ],
          },
          {
            paragraphs: ["Update to 3.1.0 on the App Store. Thank you for your support and your reports."],
          },
        ],
      },
    },
  },
  {
    slug: "collection-tabs-ios26",
    status: "resolved",
    publishedAt: "2026-10-06",
    updatedAt: "2026-10-08",
    copy: {
      "zh-TW": {
        title: "「收藏」頁上方分頁看不到文字",
        summary:
          "在 iOS 26 以上的裝置，「收藏」頁上方的分頁可能看不到文字，但仍可點擊切換。此問題已在 3.1.0 修正，請更新到最新版本。",
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
              "3.1.0 已於 2026 年 10 月 8 日上架，更新後分頁文字即可正常顯示。",
            ],
          },
          {
            heading: "若尚未更新",
            bullets: [
              "請先到 App Store 更新到 3.1.0 或以上版本。",
              "更新前，分頁由左到右依序是「收藏」「玩家配置」「武器配置」，直接點擊對應位置就能切換，位置可以對照下方的圖。",
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
          "On iOS 26 and later, the tabs at the top of Collection may show no text, though tapping them still switches pages. This is fixed in 3.1.0; please update to the latest version.",
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
              "3.1.0 went live on the App Store on October 8, 2026. After updating, the tab text shows normally.",
            ],
          },
          {
            heading: "If you have not updated yet",
            bullets: [
              "Update to 3.1.0 or later on the App Store.",
              "Until then, the tabs from left to right are Collection, Player setup and Weapon setup. Tap that spot to switch; the screenshots below show where.",
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
 * 首頁提示條用：最新一則還在處理中的問題，或發布 14 天內的更新公告與功能調整說明，
 * 依發布日新的優先。已解決的問題不掛；更新公告與功能調整過了期限也自動下架。
 */
export function getActiveAnnouncement(locale: string, now: Date = new Date()): Announcement | null {
  return (
    getAnnouncements(locale).find((item) => {
      // 發布日之前都不掛，未來日期的公告不提早出現
      const age = now.getTime() - Date.parse(`${item.publishedAt}T00:00:00Z`);
      if (age < 0) return false;
      if (item.status === "investigating" || item.status === "fixPending") return true;
      // 更新公告與功能調整發布滿 14 天就不掛
      if (item.status === "released" || item.status === "change") {
        return age < RELEASE_NOTICE_DAYS * 24 * 60 * 60 * 1000;
      }
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
