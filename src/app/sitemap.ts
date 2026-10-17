import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { announcementSlugs } from "@/lib/announcements";
import { fetchArticleSlugs } from "@/lib/articles";
import { fetchPostsForSitemap } from "@/lib/community/reads";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";

// 所有語系皆有的靜態頁面路徑（不含語系前綴）
const STATIC_PATHS = [
  "/",
  "/creators",
  "/tos",
  "/privacy",
  "/support",
  "/ratings/skins",
  "/ratings/esports",
  "/rooms",
  "/announcements",
  "/community",
  // 公告寫死在 src/lib/announcements.ts，slug 跟著一起進 sitemap
  ...announcementSlugs().map((slug) => `/announcements/${slug}`),
  "/articles",
];

// 社群貼文隨時間增加：每小時重算一次，不要每次請求都打資料庫
export const revalidate = 3600;

/** 社群貼文數量上限（fetchPostsForSitemap 每頁 50 筆，最多約 20 次 RPC） */
const COMMUNITY_SITEMAP_LIMIT = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 文章是寫手隨時會發的，slug 要問資料庫；問不到就只少這幾條。
  const articlePaths = (await fetchArticleSlugs()).map(
    (slug) => `/articles/${slug}`
  );
  const staticEntries = routing.locales.flatMap((locale) =>
    [...STATIC_PATHS, ...articlePaths].map((path) => ({
      url: `${BASE_URL}/${locale}${path === "/" ? "" : path}`,
    }))
  );

  // 失敗時 fetchPostsForSitemap 回傳空陣列：sitemap 退化成只有靜態頁，不會 500
  const posts = await fetchPostsForSitemap(COMMUNITY_SITEMAP_LIMIT);
  const authorIDs = new Set(
    posts.flatMap((post) => (post.authorID ? [post.authorID] : []))
  );

  const communityEntries = routing.locales.flatMap((locale) => [
    ...posts.map((post) => ({
      url: `${BASE_URL}/${locale}/community/post/${post.id}`,
      lastModified: post.createdAt,
    })),
    ...[...authorIDs].map((id) => ({
      url: `${BASE_URL}/${locale}/community/user/${id}`,
    })),
  ]);

  return [...staticEntries, ...communityEntries];
}
