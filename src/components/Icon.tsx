"use client";

import * as PhosphorIcons from "@phosphor-icons/react";

type PhosphorIconName = keyof typeof PhosphorIcons;

interface IconProps {
  /** Phosphor icon 名稱（如 "Storefront"、"Star"） */
  name: PhosphorIconName;
  /** 圖示大小（預設 24） */
  size?: number;
  /** 圖示粗細（預設 bold，符合電競銳利感） */
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  /** 額外 CSS class */
  className?: string;
  /** 無障礙標籤（icon-only 用途時必填） */
  "aria-label"?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Phosphor Icons 統一 wrapper
 * - 預設 weight="bold"（電競風格）
 * - 繼承 currentColor（搭配父元素文字色）
 * - 禁止直接 import @phosphor-icons/react，統一透過此元件
 */
export default function Icon({
  name,
  size = 24,
  weight = "bold",
  className,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: IconProps) {
  const IconComponent = PhosphorIcons[name] as React.ComponentType<{
    size?: number;
    weight?: string;
    color?: string;
    className?: string;
    "aria-label"?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;

  if (!IconComponent) {
    // 開發期間警告
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Icon] "${name}" 不是有效的 Phosphor icon 名稱`);
    }
    return null;
  }

  return (
    <IconComponent
      size={size}
      weight={weight}
      color="currentColor"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
    />
  );
}
