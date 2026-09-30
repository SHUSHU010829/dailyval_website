// 文章後台在瀏覽器和伺服器之間共用的型別與常數。跟 articles schema
// （DailyVal/supabase/migrations/20260930180000_articles.sql）對齊。
// 這裡刻意沒有 server-only，也沒有任何機密。

export const ARTICLE_CATEGORIES = ["briefing", "esports", "strategy", "community"] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const ARTICLE_LANGS = ["zh-Hant", "zh-Hans", "en", "ja", "ko", "vi"] as const;
export type ArticleLang = (typeof ARTICLE_LANGS)[number];

export const ARTICLE_STATUSES = ["draft", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export type StaffRole = "admin" | "writer";

/** GET /api/admin/articles/me：這個 session 是誰、能做什麼。 */
export interface StaffMe {
  uid: string;
  role: StaffRole;
  display_name: string | null;
}

/** staff_list 的一列（沒有內文）。 */
export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  category: ArticleCategory;
  lang: ArticleLang;
  status: ArticleStatus;
  hidden: boolean;
  author_id: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** staff_get：編輯器打開的那一篇，含內文。 */
export interface ArticleDetail extends ArticleRow {
  body_md: string;
}

/** 編輯器送出去的東西。id 空 = 新文章。 */
export interface ArticleDraft {
  id: string | null;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  cover_url: string | null;
  category: ArticleCategory;
  lang: ArticleLang;
}

export interface WriterRow {
  user_id: string;
  display_name: string;
  active: boolean;
  note: string | null;
  article_count: number;
  created_at: string;
}

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  briefing: "遊戲快訊",
  esports: "電競故事",
  strategy: "攻略筆記",
  community: "社群",
};

export const LANG_LABELS: Record<ArticleLang, string> = {
  "zh-Hant": "繁體中文",
  "zh-Hans": "简体中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  vi: "Tiếng Việt",
};

/** RPC 用 raise exception 帶代號說「你做錯了什麼」；這裡翻成給人看的話。 */
const RPC_MESSAGES: Record<string, string> = {
  invalid_slug: "網址代稱只能用小寫英數字和連字號（例如 patch-11-1-notes），3 到 80 字。",
  invalid_title: "標題不能空白，最多 120 字。",
  summary_too_long: "摘要最多 300 字。",
  body_too_long: "內文最多 60,000 字。",
  invalid_cover_url: "封面必須是 https 開頭的圖片網址。",
  invalid_category: "請選一個分類。",
  invalid_lang: "請選一個語言。",
  slug_taken: "這個網址代稱已經有別的文章在用，換一個。",
  article_not_found: "找不到這篇文章，可能已經被刪除，或不是你的文章。",
  invalid_status: "狀態不合法。",
  unpublish_first: "已發布的文章要先撤回才能刪除。要整篇移除請找管理員。",
  invalid_display_name: "署名不能空白，最多 40 字。",
  note_too_long: "備註最多 500 字。",
  "no such user": "找不到這個使用者。對方要先在這個網站用 Apple 登入一次。",
  forbidden: "你沒有這個權限。",
  "not a writer": "你還不是寫手。",
  "not an admin": "只有管理員能做這件事。",
  upload_not_configured: "圖片上傳還沒設定好（缺 R2 環境變數）。先貼圖片網址。",
  unsupported_type: "只接受 JPEG、PNG、WebP、GIF。",
  too_large: "圖片最大 4 MB。",
};

export function humanizeRpcError(message: string): string {
  for (const [code, text] of Object.entries(RPC_MESSAGES)) {
    if (message.includes(code)) return text;
  }
  return message;
}

/** 新文章的預設網址代稱：日期加四個亂數字元，寫手想改再改。 */
export function defaultSlug(now: Date = new Date(), random: () => number = Math.random): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let tail = "";
  for (let i = 0; i < 4; i += 1) {
    tail += alphabet[Math.floor(random() * alphabet.length) % alphabet.length];
  }
  return `${y}${m}${d}-${tail}`;
}
