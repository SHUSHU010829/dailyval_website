"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import StarRatingInput from "@/components/esports/StarRatingInput";
import {
  formatCountdown,
  useWindowCountdown,
} from "@/components/esports/hooks/useWindowCountdown";
import { useWindowKick } from "@/components/esports/hooks/useWindowKick";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import {
  castMatchVote,
  castPlayerVote,
  myVotes as fetchMyVotes,
  EsportsServiceError,
  type MyVotes,
} from "@/lib/esports/rating-service";
import {
  fetchPlayerAveragesLive,
  fetchSummaryLive,
} from "@/lib/esports/board-reads";
import {
  fetchCommentsByIds,
  fetchHotPlayerComments,
} from "@/lib/esports/comment-reads";
import { applyMatchVote, applyPlayerVote, recompute } from "@/lib/esports/optimistic";
import { HOT_MIN_LIKES } from "@/lib/esports/constants";
import type {
  CommentRow,
  PlayerAverageRow,
  RatingSummaryRow,
} from "@/lib/esports/types";
import type { EsportsRatingError } from "@/lib/esports/errors";

// 評分看板：全場評分（1–10）＋每位選手的評分卡＋亮回覆槽位。
// 語意承襲 iOS EsportsRatingManager／EsportsRatingBoardView：
// - 樂觀更新走 EsportsOptimisticVote.recompute 的移植
// - 每個投票目標一條送出鏈：新的點按「取代」還沒上線的舊值，
//   settle 後只送最終分數；commit 後 700ms 合併重載收斂
// - uid 在點按當下捕捉（p_expected_uid）；session 世代變了，任何
//   在途回應都不得發佈
// - 本地到期硬停先於收斂重載（見 useWindowCountdown）

export interface BoardTeamPlayer {
  playerKey: string;
  nickname: string;
  photoURL: string | null;
  agents: Array<{ name: string; iconURL: string | null }>;
  kills: number;
  deaths: number;
  assists: number;
  acs: number | null;
}

export interface BoardTeam {
  id: number;
  title: string;
  players: BoardTeamPlayer[];
}

interface RatingBoardProps {
  riotMatchID: string;
  initialSummary: RatingSummaryRow | null;
  initialAverages: PlayerAverageRow[];
  /** 快照缺席時 null（只剩全場評分） */
  teams: BoardTeam[] | null;
  /** feed 確認已完賽（kick 門檻；快照 fallback 頁必須是 false） */
  matchCompleted: boolean;
}

interface HotSlot {
  comment: CommentRow;
  likeCount: number;
  parent: CommentRow | null;
}

const RELOAD_DEBOUNCE_MS = 700;

export default function RatingBoard({
  riotMatchID,
  initialSummary,
  initialAverages,
  teams,
  matchCompleted,
}: RatingBoardProps) {
  const t = useTranslations("esports.board");
  const tError = useTranslations("esports.errors");
  const session = useEsportsSession();

  const [summary, setSummary] = useState<RatingSummaryRow | null>(initialSummary);
  const [averages, setAverages] = useState<Record<string, PlayerAverageRow>>(() =>
    Object.fromEntries(initialAverages.map((row) => [row.player_key, row]))
  );
  // 我的票綁著帳號世代；世代變了衍生歸零
  const [votesState, setVotesState] = useState<{ generation: number; votes: MyVotes }>({
    generation: -1,
    votes: { matchScore: null, playerScores: {} },
  });
  const myVotes =
    votesState.generation === session.generation
      ? votesState.votes
      : { matchScore: null, playerScores: {} };
  const [errorKey, setErrorKey] = useState<EsportsRatingError | null>(null);
  // session 的 ref 鏡像：送出鏈的 async 接續要讀「當下」的帳號，
  // 不能用 render 時捕捉的舊 closure
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const countdown = useWindowCountdown(
    summary?.window_open ?? false,
    summary?.window_closes_at ?? null
  );
  const votingOpen = summary !== null && countdown.effectiveOpen;

  const { kicking } = useWindowKick({
    riotMatchID,
    eligible: matchCompleted,
    hasSummary: summary !== null,
    onSummary: setSummary,
  });

  // ---------- 我的票（登入後載入，世代柵欄） ----------
  useEffect(() => {
    const generation = session.generation;
    if (!session.uid) return;
    let cancelled = false;
    fetchMyVotes(riotMatchID)
      .then((votes) => {
        if (!cancelled && generation === session.generation) {
          setVotesState({ generation, votes });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.uid, session.generation, riotMatchID]);

  // ---------- 收斂重載（700ms 合併） ----------
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      void (async () => {
        const [nextSummary, nextAverages] = await Promise.all([
          fetchSummaryLive(riotMatchID),
          fetchPlayerAveragesLive(riotMatchID),
        ]);
        // 讀取失敗保留現值（樂觀狀態仍在，下次互動再收斂）
        if (nextSummary !== "error") setSummary(nextSummary);
        if (nextAverages !== null) {
          setAverages(Object.fromEntries(nextAverages.map((row) => [row.player_key, row])));
        }
      })();
    }, RELOAD_DEBOUNCE_MS);
  }, [riotMatchID]);
  useEffect(() => () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
  }, []);

  // ---------- 投票送出鏈（每目標一條；新的點按取代未送出的舊值） ----------
  const desiredRef = useRef<Record<string, { score: number; uid: string }>>({});
  const sentRef = useRef<Record<string, number>>({});
  const runningRef = useRef<Set<string>>(new Set());

  // 帳號世代轉換：sender 狀態整組退場。A 送過 8 分的 sentRef 絕不能讓
  // B 點 8 分時被當成「已送出」而跳過 RPC；在途的 chain 讀不到 desired
  // 就會自然收束（p_expected_uid 已擋掉伺服器端的錯帳號寫入）。
  useEffect(() => {
    desiredRef.current = {};
    sentRef.current = {};
  }, [session.generation]);

  const runChain = useCallback(
    (targetKey: string, playerKey: string | null) => {
      if (runningRef.current.has(targetKey)) return;
      runningRef.current.add(targetKey);
      void (async () => {
        try {
          for (;;) {
            const desired = desiredRef.current[targetKey];
            if (!desired || sentRef.current[targetKey] === desired.score) return;
            try {
              if (playerKey === null) {
                await castMatchVote(riotMatchID, desired.score, desired.uid);
              } else {
                await castPlayerVote(riotMatchID, playerKey, desired.score, desired.uid);
              }
              sentRef.current[targetKey] = desired.score;
              scheduleReload();
            } catch (error) {
              const kind =
                error instanceof EsportsServiceError ? error.kind : ("network" as const);
              delete desiredRef.current[targetKey];
              // 樂觀狀態回滾：伺服器沒收的票不能繼續掛在畫面上。
              // 只在這筆 desired 仍屬於目前帳號時動 UI（換帳號的話
              // 衍生歸零已經處理掉了）
              const current = sessionRef.current;
              if (current.uid === desired.uid) {
                setErrorKey(kind);
                // 平均與窗狀態交給強制重載收斂（window_closed 會讀回 false）
                scheduleReload();
                const generationAtFailure = current.generation;
                fetchMyVotes(riotMatchID)
                  .then((votes) => {
                    if (sessionRef.current.generation === generationAtFailure) {
                      setVotesState({ generation: generationAtFailure, votes });
                    }
                  })
                  .catch(() => {});
              }
              return;
            }
          }
        } finally {
          runningRef.current.delete(targetKey);
        }
      })();
    },
    [riotMatchID, scheduleReload]
  );

  function handleVote(playerKey: string | null, score: number) {
    if (!votingOpen) return;
    if (session.status !== "signedIn" || !session.uid) {
      void session.signInWithApple().catch(() => {});
      return;
    }
    const uid = session.uid;
    const generation = session.generation;
    setErrorKey(null);

    // 樂觀更新（recompute 的移植）
    if (playerKey === null) {
      const oldScore = myVotes.matchScore;
      setSummary((current) => (current ? applyMatchVote(current, oldScore, score) : current));
      setVotesState({ generation, votes: { ...myVotes, matchScore: score } });
    } else {
      const oldScore = myVotes.playerScores[playerKey] ?? null;
      setAverages((current) => {
        const existing = current[playerKey];
        const nextRow = existing
          ? applyPlayerVote(existing, oldScore, score)
          : {
              riot_match_id: riotMatchID,
              player_key: playerKey,
              ...(() => {
                const next = recompute(0, 0, oldScore, score);
                return { avg_score: next.avg, vote_count: next.count };
              })(),
            };
        return { ...current, [playerKey]: nextRow };
      });
      setVotesState({
        generation,
        votes: { ...myVotes, playerScores: { ...myVotes.playerScores, [playerKey]: score } },
      });
    }

    const targetKey = playerKey === null ? "match" : `player:${playerKey}`;
    desiredRef.current[targetKey] = { score, uid };
    runChain(targetKey, playerKey);
  }

  // ---------- 亮回覆槽位 ----------
  const [hotSlots, setHotSlots] = useState<Record<string, HotSlot>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchHotPlayerComments(riotMatchID, HOT_MIN_LIKES);
        if (rows.length === 0) return;
        const bodies = await fetchCommentsByIds(rows.map((row) => row.comment_id));
        const byID = new Map(bodies.map((row) => [row.id, row]));
        const parentIDs = bodies
          .map((row) => row.parent_id)
          .filter((id): id is string => Boolean(id));
        const parents = parentIDs.length > 0 ? await fetchCommentsByIds(parentIDs) : [];
        const parentsByID = new Map(parents.map((row) => [row.id, row]));
        if (cancelled) return;
        const slots: Record<string, HotSlot> = {};
        for (const row of rows) {
          const comment = byID.get(row.comment_id);
          if (!comment) continue;
          slots[row.player_key] = {
            comment,
            likeCount: row.like_count,
            parent: comment.parent_id ? parentsByID.get(comment.parent_id) ?? null : null,
          };
        }
        setHotSlots(slots);
      } catch {
        // 槽位載不到不致命；卡片照常渲染
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [riotMatchID]);

  /** 亮回覆的作者（或引用的父留言作者）被封鎖就整格隱藏 */
  function visibleHotSlot(playerKey: string): HotSlot | null {
    const slot = hotSlots[playerKey];
    if (!slot) return null;
    if (session.blockedIDs.has(slot.comment.user_id)) return null;
    if (slot.parent && session.blockedIDs.has(slot.parent.user_id)) return null;
    return slot;
  }

  return (
    <div className="space-y-6">
      {/* 全場評分 */}
      <div className="cut border border-border-med bg-bg-panel p-6">
        {summary === null ? (
          <p className="text-center font-ui text-sm text-text-2" role="status">
            {kicking ? t("windowOpening") : t("unavailable")}
          </p>
        ) : (
          <>
            <p className="font-ui text-xs uppercase tracking-widest text-text-3">
              {t("overallRatings")}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-5xl font-black tabular-nums text-rating-teal">
                  {summary.match_avg !== null ? summary.match_avg.toFixed(1) : "–"}
                </span>
                <span className="font-ui text-sm text-text-3">/ 10</span>
              </div>
              <div className="text-right font-ui text-xs tracking-wide text-text-3">
                <p>{t("matchVotes", { count: summary.match_vote_count })}</p>
                <p className="mt-0.5">{t("commentTotal", { count: summary.comment_count })}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-border-dim pt-4">
              <p className="font-ui text-xs uppercase tracking-widest text-text-3">
                {votingOpen
                  ? myVotes.matchScore !== null
                    ? t("yourRating")
                    : t("castYourRating")
                  : t("closed")}
              </p>
              {votingOpen && (
                <div className="mt-2">
                  <StarRatingInput
                    value={myVotes.matchScore}
                    onRate={(score) => handleVote(null, score)}
                    ariaLabel={t("castYourRating")}
                    segmentLabel={(score) => t("rateScore", { score })}
                  />
                </div>
              )}
              <p className="mt-2 font-ui text-xs tracking-wide">
                {votingOpen && countdown.remainingSeconds !== null ? (
                  <span className="text-viper-green">
                    {t("closesCountdown", {
                      time: formatCountdown(countdown.remainingSeconds),
                    })}
                  </span>
                ) : !votingOpen ? (
                  <span className="text-text-3">{t("closedNote")}</span>
                ) : null}
              </p>
              {errorKey && (
                <p role="alert" className="mt-2 font-ui text-xs text-val-red">
                  {tError(errorKey)}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* 選手評分卡 */}
      {teams && teams.length > 0 && (
        <section aria-label={t("playerRatings")}>
          <h3 className="font-display text-base font-black uppercase tracking-tight text-text-1">
            {t("playerRatings")}
          </h3>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="cut border border-border-med bg-bg-panel">
                <p className="border-b border-border-dim px-4 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-text-2">
                  {team.title}
                </p>
                <ul className="divide-y divide-border-dim">
                  {team.players.map((player) => {
                    const average = averages[player.playerKey];
                    const hot = visibleHotSlot(player.playerKey);
                    return (
                      <li key={player.playerKey} className="px-4 py-3">
                        <div className="flex items-center gap-3">
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
                              {player.acs !== null && (
                                <span className="ml-2">ACS {player.acs}</span>
                              )}
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
                        </div>

                        {votingOpen && (
                          <div className="mt-2 pl-[3.25rem]">
                            <StarRatingInput
                              size="sm"
                              value={myVotes.playerScores[player.playerKey] ?? null}
                              onRate={(score) => handleVote(player.playerKey, score)}
                              ariaLabel={t("ratePlayer", { name: player.nickname })}
                              segmentLabel={(score) => t("rateScore", { score })}
                            />
                          </div>
                        )}

                        {hot && (
                          <p className="mt-2 flex items-start gap-1.5 pl-[3.25rem] font-body text-xs text-text-2">
                            <span className="cut-sm mt-0.5 shrink-0 bg-val-red/15 px-1.5 py-0.5 font-ui text-[10px] font-bold uppercase tracking-widest text-val-red">
                              {t("hotQuote")}
                            </span>
                            <span className="min-w-0 truncate">
                              {hot.comment.body}
                              <span className="ml-1 text-text-3">
                                ♥ {hot.likeCount}
                              </span>
                            </span>
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
