"use client";

import { useState } from "react";

interface HeroCtaButtonProps {
  label: string;
  href: string;
}

/**
 * Hero CTA 按鈕（Client Component）
 * - Hover：四角 HUD 瞄準框展開、shimmer 掃光、「LOCKED」標籤
 * - 點擊：data-cta 觸發 TacticalCursor hitmarker
 */
export default function HeroCtaButton({ label, href }: HeroCtaButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative inline-block">
      {/* 四角瞄準框 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute transition-all duration-200"
        style={{
          top: hovered ? -8 : -2,
          left: hovered ? -8 : -2,
          width: 14,
          height: 14,
          borderTop: "2px solid #ff4655",
          borderLeft: "2px solid #ff4655",
          opacity: hovered ? 1 : 0,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute transition-all duration-200"
        style={{
          top: hovered ? -8 : -2,
          right: hovered ? -8 : -2,
          width: 14,
          height: 14,
          borderTop: "2px solid #ff4655",
          borderRight: "2px solid #ff4655",
          opacity: hovered ? 1 : 0,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute transition-all duration-200"
        style={{
          bottom: hovered ? -8 : -2,
          left: hovered ? -8 : -2,
          width: 14,
          height: 14,
          borderBottom: "2px solid #ff4655",
          borderLeft: "2px solid #ff4655",
          opacity: hovered ? 1 : 0,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute transition-all duration-200"
        style={{
          bottom: hovered ? -8 : -2,
          right: hovered ? -8 : -2,
          width: 14,
          height: 14,
          borderBottom: "2px solid #ff4655",
          borderRight: "2px solid #ff4655",
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* LOCKED 標籤 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-0 font-ui text-[10px] uppercase tracking-[0.25em] text-val-red transition-all duration-150"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? "translateY(0)" : "translateY(4px)" }}
      >
        // LOCKED //
      </span>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-cta
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="cut relative inline-flex overflow-hidden items-center gap-2 bg-val-red px-8 py-4 font-ui text-sm font-bold uppercase tracking-widest text-white transition-all duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-red"
      >
        {/* shimmer 掃光 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform"
          style={{ transform: hovered ? "translateX(200%)" : "translateX(-100%)", transitionDuration: hovered ? "400ms" : "0ms" }}
        />
        {label}
      </a>
    </div>
  );
}
