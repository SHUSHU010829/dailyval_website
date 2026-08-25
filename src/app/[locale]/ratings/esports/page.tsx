import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { fetchSchedulePage } from "@/lib/esports/server-reads";
import MatchScheduleBrowser from "@/components/esports/MatchScheduleBrowser";

// 電競賽程瀏覽：tier-1 聯賽的比賽卡＋評分徽章，點卡片進比賽頁
// （評分、留言、戰報都在那裡）。首頁由 RSC 抓（60s 重驗），翻頁在
// 瀏覽器端直連 Riot（CORS 開放）。

interface EsportsRatingsParams {
  locale: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<EsportsRatingsParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.ratingsEsports" });
  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/ratings/esports",
  });
}

export default async function EsportsRatingsPage({
  params,
}: {
  params: Promise<EsportsRatingsParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "esports.schedule" });

  const schedule = await fetchSchedulePage(locale);

  if (!schedule) {
    return (
      <p role="alert" className="py-14 text-center font-ui text-sm text-text-2">
        {t("loadFailed")}
      </p>
    );
  }

  return (
    <MatchScheduleBrowser
      locale={locale}
      initialMatches={schedule.matches}
      initialOlderToken={schedule.olderToken}
    />
  );
}
