import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CommunityFeed from "@/components/community/CommunityFeed";
import { fetchFeedPage } from "@/lib/community/reads";
import { buildMetadata } from "@/lib/seo";

// 首屏用 ISR：SSR shell 每 30 秒重新驗證一次，兼顧 TTFB 與資料新鮮度。
// 需與 feed-state.ts 的 INITIAL_DATA_STALE_MS 對齊。
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.community" });
  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/community",
  });
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 首屏在伺服器端先撈第一頁（匿名視角），爬蟲與首繪不只看到空殼加骨架屏
  const initialData = await fetchFeedPage(null);

  return <CommunityFeed initialData={initialData} />;
}
