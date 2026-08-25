// 排行榜完整資料（目錄 × CloudKit 彙總 join 後的 JSON）。
// 頁面 SSR 只鑲第一頁進 HTML；client island 需要排序／搜尋／過濾時
// 再來這裡拿完整清單。locale 走路徑參數（query string 會讓 route
// 變 dynamic，失去 ISR 快取）。

import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getSkinCatalog } from "@/lib/ratings/skin-catalog";
import { fetchAllSkinAggregates } from "@/lib/ratings/skin-reads";
import { buildLeaderboard } from "@/lib/ratings/leaderboard";

export const dynamic = "force-static";
export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const [catalog, aggregates] = await Promise.all([
    getSkinCatalog(locale),
    fetchAllSkinAggregates(),
  ]);
  return NextResponse.json({ items: buildLeaderboard(catalog, aggregates) });
}
