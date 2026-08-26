"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MatchStatsTeam, MatchStatsViewModel } from "@/lib/esports/types";

// 戰報分頁：整場／各地圖的計分板。
// 資料是 server 端映射好的 view model；這裡只有地圖切換的 state。

interface MatchScoreboardProps {
  vm: MatchStatsViewModel;
}

export default function MatchScoreboard({ vm }: MatchScoreboardProps) {
  const t = useTranslations("esports.match");
  // 0 = 整場合計；1..n = 各地圖
  const [selected, setSelected] = useState(0);

  const teams = selected === 0 ? vm.teams : vm.maps[selected - 1]?.teams ?? vm.teams;

  const chipClass = (isActive: boolean) =>
    [
      "cut-sm px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-widest transition-colors",
      isActive
        ? "bg-jett-blue/15 text-jett-blue border border-jett-blue/40"
        : "border border-border-med text-text-3 hover:text-text-1",
    ].join(" ");

  return (
    <section aria-label={t("tabs.stats")}>
      {vm.maps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelected(0)} className={chipClass(selected === 0)}>
            {t("allMaps")}
          </button>
          {vm.maps.map((map, index) => (
            <button
              key={map.id}
              type="button"
              onClick={() => setSelected(index + 1)}
              className={chipClass(selected === index + 1)}
            >
              {map.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-6">
        {teams.map((team) => (
          <TeamTable key={team.id} team={team} />
        ))}
      </div>

      {!vm.isFinal && (
        <p className="mt-4 font-ui text-xs text-text-3">{t("liveSnapshotNote")}</p>
      )}
      {vm.mapsCovered < vm.mapsTotal && (
        <p className="mt-1 font-ui text-xs text-text-3">
          {t("partialCoverage", { covered: vm.mapsCovered, total: vm.mapsTotal })}
        </p>
      )}
    </section>
  );
}

function TeamTable({ team }: { team: MatchStatsTeam }) {
  const t = useTranslations("esports.match");

  return (
    <div className="cut border border-border-med bg-bg-panel">
      <div className="flex items-center justify-between border-b border-border-dim px-4 py-3">
        <p className="font-display text-sm font-black uppercase tracking-wide text-text-1">
          {team.title}
        </p>
        <p
          className={`font-display text-lg font-black tabular-nums ${
            team.didWin ? "text-viper-green" : "text-text-2"
          }`}
        >
          {team.score}
        </p>
      </div>

      {/* 寬表格自己捲，不撐破頁面 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left">
          <thead>
            <tr className="font-ui text-[11px] uppercase tracking-widest text-text-3">
              <th className="px-4 py-2 font-bold">{t("columns.player")}</th>
              <th className="px-2 py-2 font-bold">{t("columns.agents")}</th>
              <th className="px-2 py-2 text-right font-bold">{t("columns.rating")}</th>
              <th className="px-2 py-2 text-right font-bold">ACS</th>
              <th className="px-2 py-2 text-right font-bold">K / D / A</th>
              <th className="px-2 py-2 text-right font-bold">KAST</th>
              <th className="px-2 py-2 text-right font-bold">ADR</th>
              <th className="px-4 py-2 text-right font-bold">FK</th>
            </tr>
          </thead>
          <tbody className="font-body text-sm text-text-2">
            {team.players.map((player) => (
              <tr key={player.playerKey} className="border-t border-border-dim">
                <td className="px-4 py-2.5">
                  <span className="font-ui font-bold text-text-1">{player.nickname}</span>
                </td>
                <td className="px-2 py-2.5">
                  <span className="flex gap-1">
                    {player.agents.map((agent) =>
                      agent.iconURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={agent.name}
                          src={agent.iconURL}
                          alt={agent.name}
                          title={agent.name}
                          loading="lazy"
                          className="h-5 w-5 rounded-sm"
                        />
                      ) : (
                        <span key={agent.name} className="font-ui text-xs">
                          {agent.name}
                        </span>
                      )
                    )}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right font-ui font-bold tabular-nums text-text-1">
                  {player.rating !== null ? player.rating.toFixed(2) : "–"}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{player.acs ?? "–"}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {player.kills} / {player.deaths} / {player.assists}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {player.kastPercent !== null ? `${Math.round(player.kastPercent)}%` : "–"}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {player.adr !== null ? Math.round(player.adr) : "–"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{player.firstKills}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
