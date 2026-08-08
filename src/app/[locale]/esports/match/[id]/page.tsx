import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { APP_STORE_URL } from "@/lib/site-config";
import {
  fetchEsportsMatch,
  fetchMatchRating,
  type EsportsMatchTeam,
} from "@/lib/esports";

// 電競比賽 landing page：universal link 的瀏覽器 fallback。
// 裝了 App 的 iPhone 點同一條連結會直接開 App 進比賽評分頁（AASA 的 /*
// catch-all 已涵蓋這個路徑）；這頁服務沒裝 App 的人——顯示比分與社群
// 評分，然後把人導向 App。

interface MatchPageParams {
  locale: string;
  id: string;
}

/** Riot 的 match id 是純數字；擋掉垃圾路徑，避免無謂的上游請求 */
function isValidMatchID(id: string): boolean {
  return /^\d{1,25}$/.test(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<MatchPageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "meta.esportsMatch" });

  const match = isValidMatchID(id)
    ? await fetchEsportsMatch(id, locale)
    : null;
  const title = match
    ? `${match.teams[0].code} ${
        match.started
          ? `${match.teams[0].gameWins}:${match.teams[1].gameWins}`
          : "vs"
      } ${match.teams[1].code}｜${t("title")}`
    : t("title");

  return buildMetadata({
    locale,
    title,
    description: t("description"),
    path: `/esports/match/${id}`,
  });
}

export default async function EsportsMatchPage({
  params,
}: {
  params: Promise<MatchPageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const isZh = locale === "zh-TW";
  const valid = isValidMatchID(id);
  const [match, rating] = valid
    ? await Promise.all([fetchEsportsMatch(id, locale), fetchMatchRating(id)])
    : [null, null];

  const openInAppHref = `dailyval://esports/match/${id}`;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 md:py-24">
      <section className="w-full rounded-2xl border border-border-med bg-bg-panel p-8 md:p-10">
        {match ? (
          <>
            <p className="text-center font-ui text-xs uppercase tracking-widest text-text-3">
              {match.leagueName}
              {match.bestOf ? ` · Bo${match.bestOf}` : ""}
            </p>

            <div className="mt-6 flex items-center justify-center gap-6">
              <TeamColumn team={match.teams[0]} />
              <p className="font-display text-4xl font-black tabular-nums text-text-1">
                {match.started
                  ? `${match.teams[0].gameWins} : ${match.teams[1].gameWins}`
                  : "vs"}
              </p>
              <TeamColumn team={match.teams[1]} />
            </div>
          </>
        ) : (
          <h1 className="text-center font-display text-2xl font-black uppercase tracking-tight text-text-1">
            {isZh ? "電競賽後評分" : "Esports Match Ratings"}
          </h1>
        )}

        {rating && rating.avg !== null && (
          <div className="mt-8 rounded-xl bg-[#30b0c7]/10 py-4 text-center">
            <p className="font-display text-4xl font-black text-[#30b0c7]">
              {rating.avg.toFixed(1)}
            </p>
            <p className="mt-1 font-ui text-xs uppercase tracking-widest text-text-2">
              {isZh
                ? `${rating.voteCount} 人評分 · ${rating.commentCount} 則留言`
                : `${rating.voteCount} ratings · ${rating.commentCount} comments`}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href={openInAppHref}
            className="w-full rounded-lg bg-val-red px-6 py-3 text-center font-ui text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            {isZh ? "在 App 中開啟" : "Open in the App"}
          </a>
          <a
            href={APP_STORE_URL}
            className="font-ui text-xs uppercase tracking-widest text-text-2 underline-offset-4 transition-colors hover:text-text-1 hover:underline"
          >
            {isZh ? "還沒有 DailyVal？前往 App Store 下載" : "Don't have DailyVal? Get it on the App Store"}
          </a>
        </div>

        <p className="mt-8 text-center font-ui text-xs text-text-3">
          {isZh
            ? "不吹不黑，上 DailyVal 貢獻你的評分。"
            : "No hype, no hate. Cast your rating on DailyVal."}
        </p>
      </section>
    </div>
  );
}

function TeamColumn({ team }: { team: EsportsMatchTeam }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      {team.image ? (
        // 外部隊徽（Riot CDN），單張小圖不走 next/image 最佳化
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.image}
          alt={team.name}
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
      ) : (
        <div className="h-14 w-14 rounded-lg bg-bg-elevated" />
      )}
      <p className="font-ui text-sm font-bold tracking-wide text-text-1">
        {team.code}
      </p>
    </div>
  );
}
