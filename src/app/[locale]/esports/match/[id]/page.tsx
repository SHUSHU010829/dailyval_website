import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { APP_STORE_URL } from "@/lib/site-config";
import {
  fetchEsportsMatch,
  type EsportsMatchTeam,
} from "@/lib/esports";
import {
  fetchPlayerAverages,
  fetchStatsSnapshot,
  fetchSummary,
  getAgentIconTable,
  getMapNameTable,
} from "@/lib/esports/server-reads";
import { buildStatsViewModel, matchFromSnapshot } from "@/lib/esports/snapshot";
import MatchTabs from "@/components/esports/MatchTabs";
import MatchScoreboard from "@/components/esports/MatchScoreboard";
import RatingSummaryPanel from "@/components/esports/RatingSummaryPanel";
import PlayerAveragesGrid from "@/components/esports/PlayerAveragesGrid";
import CommentsSection from "@/components/esports/CommentsSection";
import EsportsAuthProvider from "@/components/esports/EsportsAuthProvider";
import AccountControls from "@/components/esports/AccountControls";

// 電競比賽頁：計分板 + 社群評分 + 賽後留言。
// 同時是 universal link 的瀏覽器 fallback——裝了 App 的 iPhone 點外部
// 連結會直接開 App（AASA /* catch-all），這頁服務瀏覽器的人；投票與
// 留言發佈在登入 PR 接上，現在先完整呈現唯讀內容 + App CTA。
// 賽程 feed 查不到的老比賽（長壽分享連結）以快照內嵌的 Riot 識別合成
// 標頭，頁面永不 500，最壞退化成純 CTA。

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
    // 比賽專屬 OG 圖（隊徽＋比分＋評分）；抓不到比賽就留給預設品牌卡。
    // 相對路徑由 metadataBase 解析成絕對網址。
    ogImage: match
      ? `/og/esports-match?${new URLSearchParams({ id, locale }).toString()}`
      : undefined,
  });
}

/** feed 與快照 fallback 收斂成同一個標頭形狀 */
interface MatchHeader {
  leagueName: string;
  blockName: string | null;
  bestOf: number | null;
  started: boolean;
  teams: EsportsMatchTeam[];
}

export default async function EsportsMatchPage({
  params,
}: {
  params: Promise<MatchPageParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "esports.match" });

  const valid = isValidMatchID(id);
  const [match, summary, averages, snapshotRow] = valid
    ? await Promise.all([
        fetchEsportsMatch(id, locale),
        fetchSummary(id),
        fetchPlayerAverages(id),
        fetchStatsSnapshot(id),
      ])
    : [null, null, [], null];

  // 資產表只有在要渲染計分板時才需要
  const [agentIcons, mapNames] = snapshotRow
    ? await Promise.all([getAgentIconTable(), getMapNameTable(locale)])
    : [{}, {}];
  const statsVM = snapshotRow
    ? buildStatsViewModel(snapshotRow.payload, snapshotRow.is_final, agentIcons, mapNames)
    : null;

  // 標頭：feed 優先（官方在地化名稱）；feed 沒有但有快照 → 合成
  let header: MatchHeader | null = match
    ? {
        leagueName: match.leagueName,
        blockName: null,
        bestOf: match.bestOf,
        started: match.started,
        teams: match.teams,
      }
    : null;
  if (!header && snapshotRow) {
    const synthesized = matchFromSnapshot(
      snapshotRow.riot_match_id,
      snapshotRow.payload,
      snapshotRow.is_final,
      locale
    );
    header = {
      leagueName: synthesized.league.name,
      blockName: synthesized.blockName,
      bestOf: synthesized.bestOf,
      started: true,
      teams: synthesized.teams.map((team) => ({
        name: team.name,
        code: team.code,
        image: team.imageURL,
        gameWins: team.gameWins,
      })),
    };
  }

  // src=web：App 端的開啟來源 analytics 以此區分「landing page CTA」
  // 與掃 QR（src=qr）、點分享連結（無標記）。路由只讀 path，不受影響。
  const openInAppHref = `dailyval://esports/match/${id}?src=web`;

  // 留言選手 chip 的 key → 暱稱
  const playerNames: Record<string, string> = {};
  for (const team of statsVM?.teams ?? []) {
    for (const player of team.players) {
      playerNames[player.playerKey] = player.nickname;
    }
  }

  const upcoming = Boolean(header && !header.started && !summary && !statsVM);

  const ratingsPane = (
    <div className="space-y-6">
      {upcoming ? (
        <div className="cut border border-border-med bg-bg-panel p-6 text-center">
          <p className="font-ui text-sm text-text-2">{t("upcomingNote")}</p>
        </div>
      ) : (
        <RatingSummaryPanel summary={summary} locale={locale} />
      )}
      {statsVM && averages.length > 0 && (
        <PlayerAveragesGrid vm={statsVM} averages={averages} locale={locale} />
      )}
      {!upcoming && (
        <CommentsSection
          riotMatchID={id}
          playerNames={playerNames}
          commentCount={summary?.comment_count ?? 0}
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 md:py-14">
      {/* 標頭：聯賽 · Bo · 賽段 + 兩隊與比分 */}
      <section className="cut border border-border-med bg-bg-panel p-6 md:p-8">
        {header ? (
          <>
            <p className="text-center font-ui text-xs uppercase tracking-widest text-text-3">
              {header.leagueName}
              {header.bestOf ? ` · Bo${header.bestOf}` : ""}
              {header.blockName ? ` · ${header.blockName}` : ""}
            </p>
            <div className="mt-5 flex items-center justify-center gap-6">
              <TeamColumn team={header.teams[0]} />
              <p className="font-display text-4xl font-black tabular-nums text-text-1">
                {header.started
                  ? `${header.teams[0].gameWins} : ${header.teams[1].gameWins}`
                  : "vs"}
              </p>
              <TeamColumn team={header.teams[1]} />
            </div>
          </>
        ) : (
          <h1 className="text-center font-display text-2xl font-black uppercase tracking-tight text-text-1">
            {t("fallbackTitle")}
          </h1>
        )}

        {/* App CTA：外部連結在裝了 App 的手機上會直接開 App，這條給瀏覽器的人 */}
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <a
            href={openInAppHref}
            className="cut-sm bg-val-red px-5 py-2.5 text-center font-ui text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            {t("openInApp")}
          </a>
          <a
            href={APP_STORE_URL}
            className="font-ui text-xs uppercase tracking-widest text-text-2 underline-offset-4 transition-colors hover:text-text-1 hover:underline"
          >
            {t("getApp")}
          </a>
        </div>
      </section>

      <EsportsAuthProvider>
        <div className="mt-6 flex justify-end">
          <AccountControls />
        </div>
        <div className="mt-4">
          {statsVM ? (
            <MatchTabs
              ratingsLabel={t("tabs.ratings")}
              statsLabel={t("tabs.stats")}
              ratingsPane={ratingsPane}
              statsPane={<MatchScoreboard vm={statsVM} />}
            />
          ) : (
            ratingsPane
          )}
        </div>
      </EsportsAuthProvider>

      <p className="mt-10 text-center font-ui text-xs text-text-3">{t("tagline")}</p>
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
