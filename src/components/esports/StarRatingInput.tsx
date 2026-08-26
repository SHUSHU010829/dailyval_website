"use client";

import { useState } from "react";

// 1–10 分的評分輸入：十格 HUD 分段條（滑過預覽、點擊送出），
// 比五顆星切半的觸控體驗好，分數也一眼可讀。

interface StarRatingInputProps {
  /** 我目前的分數（null＝還沒投） */
  value: number | null;
  disabled?: boolean;
  onRate(value: number): void;
  ariaLabel: string;
  /** 每格的 aria-label（{score} 進 ICU） */
  segmentLabel(score: number): string;
  size?: "sm" | "md";
}

export default function StarRatingInput({
  value,
  disabled,
  onRate,
  ariaLabel,
  segmentLabel,
  size = "md",
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value ?? 0;

  const heightClass = size === "md" ? "h-6" : "h-4";

  return (
    <div className="inline-flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="flex gap-0.5"
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={segmentLabel(score)}
            disabled={disabled}
            onMouseEnter={() => setHovered(score)}
            onFocus={() => setHovered(score)}
            onBlur={() => setHovered(null)}
            onClick={() => onRate(score)}
            className={`${heightClass} w-3 border transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:w-4 ${
              score <= active
                ? "border-rating-teal bg-rating-teal/80"
                : "border-border-med bg-bg-elevated hover:border-border-bright"
            }`}
            style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)" }}
          />
        ))}
      </div>
      <span
        className={`font-display font-black tabular-nums ${
          size === "md" ? "text-lg" : "text-sm"
        } ${active > 0 ? "text-rating-teal" : "text-text-3"}`}
      >
        {active > 0 ? active : "–"}
      </span>
    </div>
  );
}
