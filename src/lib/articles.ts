// 遊戲話題（文章）的公開讀取：RSC 用，匿名 key + Accept-Profile: articles，
// 讀的是 articles.articles_public 這個 view（開關關著時一律空）。任一步失敗
// 回 null，頁面退化不 500。跟 esports/server-reads.ts 同一個模式。

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/esports/constants";

export const ARTICLE_CATEGORIES = ["briefing", "esports", "strategy", "community"] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export interface PublicArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  category: string;
  lang: string;
  author_name: string;
  published_at: string;
  updated_at: string;
}

export interface PublicArticleDetail extends PublicArticle {
  body_md: string;
}

export const ARTICLES_PAGE_SIZE = 20;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const LIST_COLUMNS = "id,slug,title,summary,cover_url,category,lang,author_name,published_at,updated_at";

async function select<T>(params: URLSearchParams, revalidateSeconds: number): Promise<T[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles_public?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Accept-Profile": "articles",
      },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows as T[]) : null;
  } catch {
    return null;
  }
}

/** 第 page 頁（1 起算），最新的在前。多讀一列判斷有沒有下一頁。 */
export async function fetchArticles(
  page: number
): Promise<{ items: PublicArticle[]; hasMore: boolean } | null> {
  const offset = (page - 1) * ARTICLES_PAGE_SIZE;
  const rows = await select<PublicArticle>(
    new URLSearchParams({
      select: LIST_COLUMNS,
      order: "published_at.desc,id.asc",
      offset: String(offset),
      limit: String(ARTICLES_PAGE_SIZE + 1),
    }),
    60
  );
  if (!rows) return null;
  return { items: rows.slice(0, ARTICLES_PAGE_SIZE), hasMore: rows.length > ARTICLES_PAGE_SIZE };
}

/** 一篇（含內文）。slug 不合法直接當不存在，不打資料庫。 */
export async function fetchArticle(slug: string): Promise<PublicArticleDetail | null> {
  if (!SLUG_RE.test(slug) || slug.length > 80) return null;
  const rows = await select<PublicArticleDetail>(
    new URLSearchParams({ select: `${LIST_COLUMNS},body_md`, slug: `eq.${slug}`, limit: "1" }),
    60
  );
  return rows?.[0] ?? null;
}

/** sitemap 用。失敗回空陣列：sitemap 少幾條比整個 500 好。 */
export async function fetchArticleSlugs(): Promise<string[]> {
  const rows = await select<{ slug: string }>(
    new URLSearchParams({ select: "slug", order: "published_at.desc", limit: "1000" }),
    3600
  );
  return rows?.map((r) => r.slug) ?? [];
}

/** ?page= → 1 起算的頁碼。壞值一律回第 1 頁。 */
export function parseArticlePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value ?? 1);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}

/** 文章時間以台灣時區顯示：讀者主要在台灣，寫手也是。 */
export function formatArticleDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Asia/Taipei" }).format(
    new Date(iso)
  );
}

export function isArticleCategory(value: string): value is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(value);
}
