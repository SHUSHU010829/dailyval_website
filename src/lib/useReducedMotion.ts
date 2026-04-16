"use client";

import { useEffect, useState } from "react";

/**
 * useReducedMotion hook
 * 返回 true 表示用戶偏好減少動態效果（prefers-reduced-motion: reduce）
 *
 * 用法：
 * const reduced = useReducedMotion();
 * if (reduced) return; // 跳過動畫
 */
export function useReducedMotion(): boolean {
  // 使用 lazy initializer 避免 SSR 不一致（server 無 window）
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    // 初始值透過 setState callback 設定，避免觸發 cascading render
    if (mql.matches !== reducedMotion) {
      setReducedMotion(mql.matches);
    }

    // 監聽系統設定變更
    function handleChange(e: MediaQueryListEvent) {
      setReducedMotion(e.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在 mount 時執行一次

  return reducedMotion;
}
