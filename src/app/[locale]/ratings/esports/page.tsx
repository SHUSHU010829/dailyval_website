import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { fetchSchedulePage } from "@/lib/esports/server-reads";
import MatchScheduleBrowser from "@/components/esports/MatchScheduleBrowser";
import EsportsAuthProvider from "@/components/esports/EsportsAuthProvider";
import AccountControls from "@/components/esports/AccountControls";

// 電競評分（獨立頂層分頁）：tier-1 聯賽的比賽卡＋評分徽章，點卡片
// 進比賽頁（評分、留言、戰報都在那裡）。登入是 Supabase 的 SIWA
// （與造型評分的 CloudKit 登入互不相干）。首頁由 RSC 抓（60s 重驗），
// 翻頁在瀏覽器端直連 Riot（CORS 開放）。

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
  const [tHeader, tSchedule] = await Promise.all([
    getTranslations({ locale, namespace: "ratings.esportsHeader" }),
    getTranslations({ locale, namespace: "esports.schedule" }),
  ]);

  const schedule = await fetchSchedulePage(locale);

  return (
    <EsportsAuthProvider>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-ui text-xs uppercase tracking-[0.3em] text-val-red">
            {tHeader("kicker")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">
            {tHeader("title")}
          </h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-text-2 md:text-base">
            {tHeader("subtitle")}
          </p>
        </div>
        <AccountControls />
      </header>

      <div className="mt-8">
        {schedule ? (
          <MatchScheduleBrowser
            locale={locale}
            initialMatches={schedule.matches}
            initialOlderToken={schedule.olderToken}
          />
        ) : (
          <p role="alert" className="py-14 text-center font-ui text-sm text-text-2">
            {tSchedule("loadFailed")}
          </p>
        )}
      </div>
    </EsportsAuthProvider>
  );
}
