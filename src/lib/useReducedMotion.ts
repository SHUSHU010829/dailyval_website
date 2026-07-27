"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// SSR 無法得知使用者偏好，預設為 false（不減少動態），與 CSS 的 no-preference 預設一致
function getServerSnapshot() {
  return false;
}

/**
 * useReducedMotion hook
 * 返回 true 表示用戶偏好減少動態效果（prefers-reduced-motion: reduce）
 *
 * 用法：
 * const reduced = useReducedMotion();
 * if (reduced) return; // 跳過動畫
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
