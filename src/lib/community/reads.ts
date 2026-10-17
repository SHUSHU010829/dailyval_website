// 匿名讀取（RSC 首屏、metadata、sitemap 共用）：純 raw fetch + publishable key，
// 不需要 supabase-js，也沒有 session——所以拿到的 my_reaction 一律是 null，
// 登入後的個人狀態由瀏覽器端 service.ts 再讀一次補上。
// 任一來源失敗回 null / 空陣列，頁面退化不 500。

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/esports/constants";
import { FEED_PAGE_SIZE } from "@/lib/community/constants";
import { isUUID, postFromRow, profileFromRow } from "@/lib/community/mapping";
import type {
  AuthorProfile,
  AuthorProfileRow,
  FeedCursor,
  PostRow,
  SocialPost,
} from "@/lib/community/types";

async function rpc<T>(
  name: string,
  params: Record<string, unknown>,
  revalidateSeconds: number,
): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Profile": "social",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`social.${name} failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`social.${name} failed:`, error);
    return null;
  }
}

export interface FeedPage {
  posts: SocialPost[];
  hasMore: boolean;
  /** 產生這一頁的時間；客戶端據此決定 SSR 資料還新不新鮮 */
  generatedAt: number;
}

/** 動態牆一頁（匿名；沒有觀看者狀態、沒有封鎖過濾） */
export async function fetchFeedPage(
  cursor: FeedCursor | null = null,
  limit = FEED_PAGE_SIZE,
  revalidateSeconds = 30,
): Promise<FeedPage | null> {
  const rows = await rpc<PostRow[]>(
    "feed",
    {
      // 可選參數一律明送 null：少了 key，PostgREST 會找不到同一個函式簽名
      p_before: cursor?.createdAt ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: limit,
    },
    revalidateSeconds,
  );
  if (!rows) return null;
  const posts = rows.map(postFromRow);
  return { posts, hasMore: rows.length >= limit, generatedAt: Date.now() };
}

/** 單篇（匿名）。不是 uuid 的路徑參數直接當找不到，不打伺服器。 */
export async function fetchPostDetail(
  id: string,
  revalidateSeconds = 30,
): Promise<SocialPost | null> {
  if (!isUUID(id)) return null;
  const rows = await rpc<PostRow[]>(
    "post_detail",
    { p_post_id: id },
    revalidateSeconds,
  );
  return rows?.[0] ? postFromRow(rows[0]) : null;
}

export async function fetchAuthorProfile(
  id: string,
  revalidateSeconds = 60,
): Promise<AuthorProfile | null> {
  if (!isUUID(id)) return null;
  const rows = await rpc<AuthorProfileRow[]>(
    "author_profile",
    { p_author_id: id },
    revalidateSeconds,
  );
  return rows?.[0] ? profileFromRow(rows[0]) : null;
}

export interface SitemapPostEntry {
  id: string;
  authorID: string | null;
  createdAt: string;
}

/** sitemap 用：沿著 keyset 游標往下翻，最多 maxPosts 筆 */
export async function fetchPostsForSitemap(
  maxPosts = 1000,
): Promise<SitemapPostEntry[]> {
  const entries: SitemapPostEntry[] = [];
  let cursor: FeedCursor | null = null;
  while (entries.length < maxPosts) {
    const page: FeedPage | null = await fetchFeedPage(cursor, 50, 3600);
    if (!page || page.posts.length === 0) break;
    for (const post of page.posts) {
      entries.push({
        id: post.id,
        authorID: post.author.id,
        createdAt: post.createdAt,
      });
    }
    if (!page.hasMore) break;
    const last = page.posts[page.posts.length - 1];
    cursor = { createdAt: last.createdAt, id: last.id };
  }
  return entries.slice(0, maxPosts);
}
