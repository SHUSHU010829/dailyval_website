import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";

// 所有語系皆有的靜態頁面路徑（不含語系前綴）
const STATIC_PATHS = ["/", "/creators", "/tos", "/privacy", "/support"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${BASE_URL}/${locale}${path === "/" ? "" : path}`,
    }))
  );
}
