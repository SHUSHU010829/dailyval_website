"use client";

import { useEffect } from "react";
import { onLCP, onCLS, onINP, onFCP, onTTFB } from "web-vitals";

/**
 * 開發用：將 Web Vitals 輸出到 console
 * 上線前可直接刪除此元件
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    onFCP((m) => console.log(`[Web Vitals] FCP:`, Math.round(m.value), "ms"));
    onLCP((m) => console.log(`[Web Vitals] LCP:`, Math.round(m.value), "ms"));
    onCLS((m) => console.log(`[Web Vitals] CLS:`, m.value.toFixed(4)));
    onINP((m) => console.log(`[Web Vitals] INP:`, Math.round(m.value), "ms"));
    onTTFB((m) => console.log(`[Web Vitals] TTFB:`, Math.round(m.value), "ms"));
  }, []);

  return null;
}
