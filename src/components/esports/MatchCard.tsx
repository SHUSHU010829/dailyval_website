"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { hasConfirmedTeams } from "@/lib/esports/schedule";
import type { EsportsMatch, RatingSummaryRow } from "@/lib/esports/types";

// 賽程卡：聯賽、時間、兩隊與比分、live 脈動、完賽的評分徽章
// （有摘要顯示 平均·票數·留言；窗開著沒人評顯示「立即評分」）。

interface MatchCardProps {
  match: EsportsMatch;
  summary: RatingSummaryRow | null;
  locale: string;
}

export default function MatchCard({ match, summary, locale }: MatchCardProps) {
  const t = useTranslations("esports.schedule");
  const confirmed = hasConfirmedTeams(match);

  return (
    <li>
      <Link
        href={`/${locale}/esports/match/${match.id}`}
        className="cut block border border-border-med bg-bg-panel p-4 transition-colors hover:border-border-bright hover:bg-bg-panel-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
      >
        {/* 聯賽列 */}
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3">
            {match.league.imageURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.league.imageURL}
                alt=""
                loading="lazy"
                className="h-4 w-4 shrink-0 object-contain"
              />
            )}
            <span className="truncate">
              {match.league.name}
              {match.bestOf ? ` · Bo${match.bestOf}` : ""}
              {match.blockName ? ` · ${match.blockName}` : ""}
            </span>
          </p>
          {match.state === "live" ? (
            <span className="flex shrink-0 items-center gap-1.5 font-ui text-xs font-bold uppercase tracking-widest text-val-red">
              <span className="h-2 w-2 animate-pulse rounded-full bg-val-red" aria-hidden />
              {t("liveBadge")}
            </span>
          ) : (
            // SSR 用伺服器時區，hydration 後校正為讀者的當地時間
            <span suppressHydrationWarning className="shrink-0 font-ui text-xs tabular-nums text-text-3">
              {new Intl.DateTimeFormat(locale, {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(match.startTime))}
            </span>
          )}
        </div>

        {/* 對戰列 */}
        <div className="mt-3 flex items-center justify-center gap-5">
          <TeamSide team={match.teams[0]} align="right" />
          <span className="font-display text-xl font-black tabular-nums text-text-1">
            {match.state === "upcoming"
              ? "vs"
              : `${match.teams[0]?.gameWins ?? 0} : ${match.teams[1]?.gameWins ?? 0}`}
          </span>
          <TeamSide team={match.teams[1]} align="left" />
        </div>

        {/* 評分徽章（完賽限定） */}
        {match.state === "completed" && (
          <p className="mt-3 border-t border-border-dim pt-2.5 text-center font-ui text-xs tracking-wide">
            {summary && summary.match_avg !== null ? (
              <span className="text-text-2">
                <span className="font-display font-black text-rating-teal">
                  {summary.match_avg.toFixed(1)}
                </span>
                {" · "}
                {t("ratingLine", {
                  votes: summary.match_vote_count,
                  comments: summary.comment_count,
                })}
              </span>
            ) : summary?.window_open ? (
              <span className="font-bold uppercase tracking-widest text-viper-green">
                {t("rateNow")}
              </span>
            ) : (
              <span className="text-text-3">{t("noRatings")}</span>
            )}
          </p>
        )}

        {!confirmed && match.state === "upcoming" && (
          <p className="mt-2 text-center font-ui text-xs text-text-3">{t("tbd")}</p>
        )}
      </Link>
    </li>
  );
}

function TeamSide({
  team,
  align,
}: {
  team: EsportsMatch["teams"][number] | undefined;
  align: "left" | "right";
}) {
  if (!team) return <div className="w-24" />;
  return (
    <div
      className={`flex w-28 items-center gap-2 md:w-36 ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      {team.imageURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.imageURL}
          alt=""
          loading="lazy"
          className="h-8 w-8 shrink-0 object-contain"
        />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-md bg-bg-elevated" />
      )}
      <span className="min-w-0">
        <span className="block truncate font-ui text-sm font-bold tracking-wide text-text-1">
          {team.code}
        </span>
        {team.record && (
          <span className="block font-ui text-[11px] tabular-nums text-text-3">
            {team.record.wins}-{team.record.losses}
          </span>
        )}
      </span>
    </div>
  );
}
