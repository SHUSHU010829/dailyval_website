"use client";

import { useEffect } from "react";
import { clearScroll, peekScroll } from "@/lib/community/scroll-memory";

/**
 * 列表頁（動態牆、作者頁）內容就緒後，還原「點進貼文前」記下的捲動位置。
 * 等兩個 animation frame 再捲：Next.js 換頁後會自己把視窗捲到最上面，
 * 要排在它後面才不會被蓋掉。還原完才清除記憶（StrictMode 會把 effect 跑兩次，
 * 取消掉的那一次不能先把記憶吃掉）。
 */
export function useRestoreScroll(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const saved = peekScroll(window.location.pathname);
    if (!saved) return;

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        window.scrollTo({ top: saved.y, behavior: "instant" });
        clearScroll();
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [ready]);
}
