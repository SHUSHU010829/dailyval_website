"use client";

import { useEffect, useRef, useState } from "react";
import { requestWindowSync } from "@/lib/esports/rating-service";
import { fetchSummaryLive } from "@/lib/esports/board-reads";
import type { RatingSummaryRow } from "@/lib/esports/types";

// 評分窗 kick：剛完賽的比賽還沒有摘要列時，請伺服器立刻重跑一輪
// Riot 賽程掃描，不讓第一個進來的人等 5 分鐘的 cron。
// 與 iOS 的差異：getEventDetails 沒有 startTime，「開賽 < 4 天」的
// 新鮮度門檻在網頁上拿不到——以「已完賽且沒有摘要」為準，靠本地
// 每場每分鐘（sessionStorage）＋伺服器 60s 全域冷卻兜住重複 kick。
// 快照 fallback（feed 查不到）的頁面 eligible=false——設計如此。

const KICK_MAX_ATTEMPTS = 3;
const KICK_REREAD_DELAY_MS = 2500;
/** 兩次嘗試之間等伺服器 60s 冷卻走完的一半再試（iOS ≈ 70s 總長） */
const KICK_RETRY_WAIT_MS = 30_000;
const KICK_LOCAL_COOLDOWN_MS = 60_000;

export function useWindowKick(options: {
  riotMatchID: string;
  /** feed 確認已完賽（快照合成的頁面必須傳 false） */
  eligible: boolean;
  hasSummary: boolean;
  onSummary(summary: RatingSummaryRow): void;
}): { kicking: boolean } {
  const { riotMatchID, eligible, hasSummary, onSummary } = options;
  const [kicking, setKicking] = useState(false);
  const startedRef = useRef(false);
  const onSummaryRef = useRef(onSummary);
  useEffect(() => {
    onSummaryRef.current = onSummary;
  }, [onSummary]);

  useEffect(() => {
    if (startedRef.current || hasSummary || !eligible) {
      return;
    }

    // 每場每分鐘一次的本地節流
    const throttleKey = `esportsKick:${riotMatchID}`;
    try {
      const last = Number(sessionStorage.getItem(throttleKey));
      if (Number.isFinite(last) && Date.now() - last < KICK_LOCAL_COOLDOWN_MS) return;
      sessionStorage.setItem(throttleKey, String(Date.now()));
    } catch {
      // sessionStorage 不可用就只靠伺服器端冷卻
    }

    startedRef.current = true;
    let cancelled = false;

    void (async () => {
      setKicking(true);
      try {
        for (let attempt = 0; attempt < KICK_MAX_ATTEMPTS; attempt += 1) {
          if (cancelled) return;
          await requestWindowSync();
          await new Promise((resolve) => setTimeout(resolve, KICK_REREAD_DELAY_MS));
          if (cancelled) return;
          const summary = await fetchSummaryLive(riotMatchID);
          if (summary !== "error" && summary !== null) {
            if (!cancelled) onSummaryRef.current(summary);
            return;
          }
          if (attempt < KICK_MAX_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, KICK_RETRY_WAIT_MS));
          }
        }
      } finally {
        if (!cancelled) setKicking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [riotMatchID, eligible, hasSummary]);

  return { kicking };
}
