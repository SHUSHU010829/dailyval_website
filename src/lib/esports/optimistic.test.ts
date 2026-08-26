import { describe, expect, it } from "vitest";
import {
  adjustCommentCount,
  applyMatchVote,
  applyPlayerVote,
  recompute,
} from "./optimistic";
import type { PlayerAverageRow, RatingSummaryRow } from "./types";

// iOS EsportsOptimisticVote.recompute 的 1:1 移植驗證

describe("recompute", () => {
  it("第一票：(0,0) → (score,1)", () => {
    expect(recompute(0, 0, null, 8)).toEqual({ avg: 8, count: 1 });
  });

  it("改票：count 不變，總分換值", () => {
    // avg 7.0 × 4 票 = 28；把自己的 6 改成 10 → 32 / 4 = 8.0
    expect(recompute(7, 4, 6, 10)).toEqual({ avg: 8, count: 4 });
  });

  it("oldScore 有值但 count 為 0：走追加路徑（防禦性，與 iOS 同）", () => {
    expect(recompute(0, 0, 5, 9)).toEqual({ avg: 9, count: 1 });
  });

  it("新票追加：count +1", () => {
    // avg 6.0 × 2 票 = 12；加一張 9 → 21 / 3 = 7.0
    expect(recompute(6, 2, null, 9)).toEqual({ avg: 7, count: 3 });
  });
});

const summary: RatingSummaryRow = {
  riot_match_id: "115581244955660707",
  window_open: true,
  window_closes_at: "2026-08-27T12:00:00+00:00",
  match_avg: null,
  match_vote_count: 0,
  comment_count: 2,
};

describe("applyMatchVote", () => {
  it("match_avg null 視為 0（第一票）", () => {
    const next = applyMatchVote(summary, null, 9);
    expect(next.match_avg).toBe(9);
    expect(next.match_vote_count).toBe(1);
    expect(next.comment_count).toBe(2);
  });
});

describe("applyPlayerVote", () => {
  it("選手平均的改票", () => {
    const row: PlayerAverageRow = {
      riot_match_id: "1",
      player_key: "42",
      avg_score: 8,
      vote_count: 2,
    };
    const next = applyPlayerVote(row, 6, 10);
    expect(next.avg_score).toBe(10);
    expect(next.vote_count).toBe(2);
  });
});

describe("adjustCommentCount", () => {
  it("下限為 0", () => {
    expect(adjustCommentCount(summary, -5).comment_count).toBe(0);
    expect(adjustCommentCount(summary, 3).comment_count).toBe(5);
  });
});
