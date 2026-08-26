"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import MatchCard from "@/components/esports/MatchCard";
import { ESPORTS_API_KEY } from "@/lib/esports/constants";
import {
  buildScheduleURL,
  mergeMatches,
  parseSchedule,
} from "@/lib/esports/schedule";
import { fetchSummariesLive } from "@/lib/esports/board-reads";
import type { EsportsMatch, RatingSummaryRow } from "@/lib/esports/types";

// 賽程瀏覽（/ratings/esports）：
// - 已完賽（預設）／進行中／即將開打 三個分頁＋聯賽 chip 過濾
// - 「載入更多」向過去翻頁：drain 直到目前過濾條件下出現新卡片
//   （上限 10 頁；token 沒前進＝到底）。每個請求都走同一個 URL
//   builder，sport/leagueId 不會在分頁時掉隊
// - 完賽卡片批次補評分摘要徽章（分塊 50）
// - 失敗的方向停用，等使用者按重試（不無限自動重打）

interface MatchScheduleBrowserProps {
  locale: string;
  initialMatches: EsportsMatch[];
  initialOlderToken: string | null;
}

type ScheduleTab = "completed" | "live" | "upcoming";

const DRAIN_PAGE_LIMIT = 10;

export default function MatchScheduleBrowser({
  locale,
  initialMatches,
  initialOlderToken,
}: MatchScheduleBrowserProps) {
  const t = useTranslations("esports.schedule");

  const [matches, setMatches] = useState<EsportsMatch[]>(initialMatches);
  const [olderToken, setOlderToken] = useState<string | null>(initialOlderToken);
  const [tab, setTab] = useState<ScheduleTab>("completed");
  const [leagueSlug, setLeagueSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, RatingSummaryRow>>({});
  const summariesRequested = useRef<Set<string>>(new Set());

  // 完賽卡片的摘要徽章（只補還沒要過的 id）
  const loadSummaries = useCallback(async (held: EsportsMatch[]) => {
    const ids = held
      .filter((match) => match.state === "completed")
      .map((match) => match.id)
      .filter((id) => !summariesRequested.current.has(id));
    if (ids.length === 0) return;
    for (const id of ids) summariesRequested.current.add(id);
    const fetched = await fetchSummariesLive(ids);
    setSummaries((previous) => ({ ...previous, ...fetched }));
  }, []);

  useEffect(() => {
    void loadSummaries(initialMatches);
  }, [initialMatches, loadSummaries]);

  const matchesFilter = useCallback(
    (match: EsportsMatch) =>
      match.state === tab && (leagueSlug === null || match.league.slug === leagueSlug),
    [tab, leagueSlug]
  );

  async function loadOlder() {
    if (loading || olderToken === null) return;
    setLoading(true);
    setFailed(false);
    try {
      let held = matches;
      let token: string | null = olderToken;
      let addedVisible = 0;

      for (let page = 0; page < DRAIN_PAGE_LIMIT && token && addedVisible === 0; page += 1) {
        const res = await fetch(buildScheduleURL(locale, token), {
          headers: { "x-api-key": ESPORTS_API_KEY },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const parsed = parseSchedule(await res.json());
        const merged = mergeMatches(held, parsed.matches, "older");
        addedVisible = parsed.matches.filter(
          (match) =>
            matchesFilter(match) && !held.some((existing) => existing.id === match.id)
        ).length;
        held = merged.matches;
        // token 沒前進＝這個方向到底了
        token = parsed.olderToken === token ? null : parsed.olderToken;
      }

      setMatches(held);
      setOlderToken(token);
      void loadSummaries(held);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // 聯賽 chip：依 feed 首次出現順序（順序不能跳動）
  const leagues: Array<{ slug: string; name: string }> = [];
  const seenLeagues = new Set<string>();
  for (const match of matches) {
    if (match.league.slug && !seenLeagues.has(match.league.slug)) {
      seenLeagues.add(match.league.slug);
      leagues.push({ slug: match.league.slug, name: match.league.name });
    }
  }

  const visible = matches
    .filter(matchesFilter)
    .sort((a, b) => (tab === "upcoming" ? a.startTime - b.startTime : b.startTime - a.startTime));

  const tabClass = (active: boolean) =>
    [
      "cut-sm px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest transition-colors",
      active
        ? "bg-val-red text-bg-base"
        : "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1",
    ].join(" ");

  const chipClass = (active: boolean) =>
    [
      "cut-sm px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-widest transition-colors",
      active
        ? "border border-jett-blue/40 bg-jett-blue/15 text-jett-blue"
        : "border border-border-med text-text-3 hover:text-text-1",
    ].join(" ");

  return (
    <section aria-label={t("listLabel")}>
      {/* 狀態分頁 */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {(["completed", "live", "upcoming"] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={tab === entry}
            onClick={() => setTab(entry)}
            className={tabClass(tab === entry)}
          >
            {t(`tabs.${entry}`)}
          </button>
        ))}
      </div>

      {/* 聯賽過濾 */}
      {leagues.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLeagueSlug(null)}
            aria-pressed={leagueSlug === null}
            className={chipClass(leagueSlug === null)}
          >
            {t("allLeagues")}
          </button>
          {leagues.map((league) => (
            <button
              key={league.slug}
              type="button"
              onClick={() => setLeagueSlug(league.slug)}
              aria-pressed={leagueSlug === league.slug}
              className={chipClass(leagueSlug === league.slug)}
            >
              {league.name}
            </button>
          ))}
        </div>
      )}

      {/* 卡片清單 */}
      {visible.length === 0 ? (
        <p className="py-14 text-center font-ui text-sm text-text-2">{t("empty")}</p>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {visible.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              summary={summaries[match.id] ?? null}
              locale={locale}
            />
          ))}
        </ul>
      )}

      {/* 向過去翻頁 */}
      <div className="mt-6 text-center">
        {failed && (
          <p role="alert" className="mb-3 font-ui text-xs text-text-2">
            {t("loadFailed")}
          </p>
        )}
        {olderToken !== null && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadOlder()}
            className="cut-sm border border-border-med px-6 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:border-border-bright hover:text-text-1 disabled:opacity-50"
          >
            {loading ? t("loading") : failed ? t("retry") : t("loadMore")}
          </button>
        )}
      </div>
    </section>
  );
}
