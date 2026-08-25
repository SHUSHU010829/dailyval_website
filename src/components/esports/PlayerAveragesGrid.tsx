import { getTranslations } from "next-intl/server";
import type { MatchStatsViewModel, PlayerAverageRow } from "@/lib/esports/types";

// 選手評分（server component，唯讀）：兩隊並列，每位選手的照片、
// 特務、K/D/A 與社群平均分。個人投票的星等輸入在登入 PR 接上。

interface PlayerAveragesGridProps {
  vm: MatchStatsViewModel;
  averages: PlayerAverageRow[];
  locale: string;
}

export default async function PlayerAveragesGrid({
  vm,
  averages,
  locale,
}: PlayerAveragesGridProps) {
  const t = await getTranslations({ locale, namespace: "esports.board" });
  const averagesByKey = new Map(averages.map((row) => [row.player_key, row]));

  return (
    <section aria-label={t("playerRatings")}>
      <h3 className="font-display text-base font-black uppercase tracking-tight text-text-1">
        {t("playerRatings")}
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {vm.teams.map((team) => (
          <div key={team.id} className="cut border border-border-med bg-bg-panel">
            <p className="border-b border-border-dim px-4 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-text-2">
              {team.title}
            </p>
            <ul className="divide-y divide-border-dim">
              {team.players.map((player) => {
                const average = averagesByKey.get(player.playerKey);
                return (
                  <li key={player.playerKey} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-bg-elevated">
                      {player.photoURL && (
                        // 選手照多為直式人像；上緣對齊裁切（iOS 同款規則）
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.photoURL}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5">
                        <span className="truncate font-ui text-sm font-bold text-text-1">
                          {player.nickname}
                        </span>
                        {player.agents.map((agent) =>
                          agent.iconURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={agent.name}
                              src={agent.iconURL}
                              alt={agent.name}
                              title={agent.name}
                              loading="lazy"
                              className="h-4 w-4 shrink-0 rounded-sm"
                            />
                          ) : null
                        )}
                      </p>
                      <p className="mt-0.5 font-ui text-xs tabular-nums text-text-3">
                        {player.kills} / {player.deaths} / {player.assists}
                        {player.acs !== null && <span className="ml-2">ACS {player.acs}</span>}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {average ? (
                        <>
                          <p className="font-display text-lg font-black tabular-nums text-rating-teal">
                            {average.avg_score.toFixed(1)}
                          </p>
                          <p className="font-ui text-[11px] tracking-wide text-text-3">
                            {t("voteCount", { count: average.vote_count })}
                          </p>
                        </>
                      ) : (
                        <p className="font-ui text-xs text-text-3">{t("notRated")}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
