import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { announcementSlugs } from "@/lib/announcements";
import { fetchArticleSlugs } from "@/lib/articles";

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
  "/announcements",
  // 公告寫死在 src/lib/announcements.ts，slug 跟著一起進 sitemap
  ...announcementSlugs().map((slug) => `/announcements/${slug}`),
  "/articles",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 文章是寫手隨時會發的，slug 要問資料庫；問不到就只少這幾條。
  const articlePaths = (await fetchArticleSlugs()).map((slug) => `/articles/${slug}`);
  return routing.locales.flatMap((locale) =>
    [...STATIC_PATHS, ...articlePaths].map((path) => ({
      url: `${BASE_URL}/${locale}${path === "/" ? "" : path}`,
    }))
  );
}
