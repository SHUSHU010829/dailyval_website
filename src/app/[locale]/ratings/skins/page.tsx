import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { getSkinCatalog } from "@/lib/ratings/skin-catalog";
import { fetchAllSkinAggregates } from "@/lib/ratings/skin-reads";
import {
  buildLeaderboard,
  DEFAULT_LEADERBOARD_SORT,
  filterAndSortLeaderboard,
  leaderboardPage,
  weaponOptions,
} from "@/lib/ratings/leaderboard";
import SkinLeaderboard from "@/components/ratings/SkinLeaderboard";

// 造型評分排行榜。
// CloudKit query 是 POST（fetch cache 不適用），快取放在頁面層 ISR。
export const revalidate = 300;

interface SkinsPageParams {
  locale: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SkinsPageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.ratingsSkins" });
  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/ratings/skins",
  });
}

export default async function SkinsRatingPage({
  params,
}: {
  params: Promise<SkinsPageParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [catalog, aggregates] = await Promise.all([
    getSkinCatalog(locale),
    fetchAllSkinAggregates(),
  ]);

  const leaderboard = buildLeaderboard(catalog, aggregates);
  const sorted = filterAndSortLeaderboard(leaderboard, {
    sort: DEFAULT_LEADERBOARD_SORT,
    locale,
  });
  const firstPage = leaderboardPage(sorted, 1);

  return (
    <SkinLeaderboard
      locale={locale}
      initialItems={firstPage.items}
      initialHasMore={firstPage.hasMore}
      weapons={weaponOptions(leaderboard)}
    />
  );
}
