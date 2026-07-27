"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      callback();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

/**
 * rAF 節流的 scroll 監聽，回傳目前捲動距離是否超過 threshold px
 * 用 useSyncExternalStore 訂閱外部狀態，避免手刻 useEffect+setState 造成不必要的 re-render
 */
export function useScrolledPast(threshold: number): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    () => false
  );
}
