"use client";

import { useState, type ReactNode } from "react";

// 評分／戰報 兩個分頁。pane 內容由 server component 先渲染好傳進來
// （client 只負責切換），計分板與留言的 SEO 內容都留在 HTML 裡。

interface MatchTabsProps {
  ratingsLabel: string;
  statsLabel: string;
  ratingsPane: ReactNode;
  statsPane: ReactNode;
}

export default function MatchTabs({
  ratingsLabel,
  statsLabel,
  ratingsPane,
  statsPane,
}: MatchTabsProps) {
  const [active, setActive] = useState<"ratings" | "stats">("ratings");

  const tabClass = (isActive: boolean) =>
    [
      "cut-sm px-5 py-2.5 font-ui text-sm font-bold uppercase tracking-widest transition-colors",
      isActive
        ? "bg-val-red text-bg-base"
        : "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1",
    ].join(" ");

  return (
    <div>
      <div role="tablist" className="flex gap-3">
        <button
          type="button"
          role="tab"
          aria-selected={active === "ratings"}
          onClick={() => setActive("ratings")}
          className={tabClass(active === "ratings")}
        >
          {ratingsLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "stats"}
          onClick={() => setActive("stats")}
          className={tabClass(active === "stats")}
        >
          {statsLabel}
        </button>
      </div>

      {/* 兩個 pane 都掛著（hidden 切換），切換不重抓資料 */}
      <div className={active === "ratings" ? "mt-6" : "hidden"}>{ratingsPane}</div>
      <div className={active === "stats" ? "mt-6" : "hidden"}>{statsPane}</div>
    </div>
  );
}
