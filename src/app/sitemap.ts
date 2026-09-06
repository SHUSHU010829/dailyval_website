import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { announcementSlugs } from "@/lib/announcements";

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
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${BASE_URL}/${locale}${path === "/" ? "" : path}`,
    }))
  );
}
