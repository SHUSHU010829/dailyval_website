// 投票的樂觀更新數學——iOS EsportsOptimisticVote.recompute 的 1:1 移植。
// oldScore 是使用者對同一目標的前一票（假設已含在平均裡）；
// commit 後的看板重載會收斂任何飄移。

import type { PlayerAverageRow, RatingSummaryRow } from "@/lib/esports/types";

export function recompute(
  avg: number,
  count: number,
  oldScore: number | null,
  newScore: number
): { avg: number; count: number } {
  if (oldScore !== null && count > 0) {
    const total = avg * count - oldScore + newScore;
    return { avg: total / count, count };
  }
  const newCount = count + 1;
  const total = avg * count + newScore;
  return { avg: total / newCount, count: newCount };
}

export function applyMatchVote(
  summary: RatingSummaryRow,
  oldScore: number | null,
  newScore: number
): RatingSummaryRow {
  const next = recompute(summary.match_avg ?? 0, summary.match_vote_count, oldScore, newScore);
  return { ...summary, match_avg: next.avg, match_vote_count: next.count };
}

export function applyPlayerVote(
  average: PlayerAverageRow,
  oldScore: number | null,
  newScore: number
): PlayerAverageRow {
  const next = recompute(average.avg_score, average.vote_count, oldScore, newScore);
  return { ...average, avg_score: next.avg, vote_count: next.count };
}

export function adjustCommentCount(
  summary: RatingSummaryRow,
  delta: number
): RatingSummaryRow {
  return { ...summary, comment_count: Math.max(0, summary.comment_count + delta) };
}
