"use client";

import { useEffect, useState } from "react";
import { parsePostgresTimestamp } from "@/lib/esports/timestamps";

// 評分窗倒數＋本地到期硬停。
// 到期的瞬間先在本地關閉（收斂重載可能失敗，控件不能靠一個過期的
// 快照維持開啟）；更晚的新截止時間會重新武裝。

export interface WindowCountdown {
  /** 本地判定窗仍開（server 旗標 && 未過本地截止） */
  effectiveOpen: boolean;
  /** 剩餘秒數（無截止時間或已過期為 null） */
  remainingSeconds: number | null;
}

export function useWindowCountdown(
  serverOpen: boolean,
  closesAtRaw: string | null
): WindowCountdown {
  const closesAtMs = closesAtRaw ? parsePostgresTimestamp(closesAtRaw) : null;
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!serverOpen || closesAtMs === null) return;
    // 掛載後才起表（SSR 與首次 client render 一致，避免 hydration 抖動）
    const tick = () => setNowMs(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverOpen, closesAtMs]);

  if (!serverOpen) return { effectiveOpen: false, remainingSeconds: null };
  if (closesAtMs === null) return { effectiveOpen: true, remainingSeconds: null };
  if (nowMs === null) {
    // 首次 render（含 SSR）：信 server 旗標
    return { effectiveOpen: true, remainingSeconds: null };
  }

  // +1s 的緩衝：顯示的倒數走到 0 才真的關
  const remaining = Math.floor((closesAtMs - nowMs) / 1000);
  if (remaining < 0) return { effectiveOpen: false, remainingSeconds: null };
  return { effectiveOpen: true, remainingSeconds: remaining };
}

export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}
