import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  Backpack,
  CaretDown,
  CaretLeft,
  ChartBar,
  ChatCircle,
  ChatCircleDots,
  CheckCircle,
  Crown,
  DotsThree,
  FileText,
  Flag,
  Handshake,
  Heart,
  ImageSquare,
  InstagramLogo,
  Lightning,
  LinkSimple,
  MagnifyingGlass,
  Medal,
  Megaphone,
  PaperPlaneTilt,
  Plant,
  Play,
  Plus,
  Prohibit,
  SealCheck,
  ShareNetwork,
  SpeakerHigh,
  SpeakerSlash,
  Star,
  ThreadsLogo,
  ThumbsDown,
  ThumbsUp,
  Trash,
  TrendUp,
  UsersThree,
  VideoCamera,
  Warning,
  X,
} from "@phosphor-icons/react/ssr";

// 全站實際用到的 Phosphor icon 靜態對照表（取代 import * 讓 bundler 可以 tree-shake）
const ICON_MAP = {
  ArrowLeft,
  ArrowSquareOut,
  ArrowsClockwise,
  Backpack,
  CaretDown,
  CaretLeft,
  ChartBar,
  ChatCircle,
  ChatCircleDots,
  CheckCircle,
  Crown,
  DotsThree,
  FileText,
  Flag,
  Handshake,
  Heart,
  ImageSquare,
  InstagramLogo,
  Lightning,
  LinkSimple,
  MagnifyingGlass,
  Medal,
  Megaphone,
  PaperPlaneTilt,
  Plant,
  Play,
  Plus,
  Prohibit,
  SealCheck,
  ShareNetwork,
  SpeakerHigh,
  SpeakerSlash,
  Star,
  ThreadsLogo,
  ThumbsDown,
  ThumbsUp,
  Trash,
  TrendUp,
  UsersThree,
  VideoCamera,
  Warning,
  X,
} satisfies Record<string, PhosphorIcon>;

type PhosphorIconName = keyof typeof ICON_MAP;

interface IconProps {
  /** Phosphor icon 名稱（如 "Storefront"、"Star"） */
  name: PhosphorIconName;
  /** 圖示大小（預設 24） */
  size?: number;
  /** 圖示粗細（預設 bold，符合電競銳利感） */
  weight?: IconWeight;
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
 * - 從 /ssr 子模組 import（不依賴 IconContext），本身無需 "use client"，
 *   可直接被 Server Component 引用而不拖入 client boundary
 * - 禁止直接 import @phosphor-icons/react，統一透過此元件（新增圖示時要一併加進 ICON_MAP）
 */
export default function Icon({
  name,
  size = 24,
  weight = "bold",
  className,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: IconProps) {
  const IconComponent = ICON_MAP[name];

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
