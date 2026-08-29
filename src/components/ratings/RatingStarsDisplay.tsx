import Icon from "@/components/Icon";

// 唯讀星等（支援小數，如 4.3 顆星）。
// 兩層星星疊圖：底層空心、上層實心依比例裁切寬度。
// 互動式的 1–5 星輸入（登入後投票）在 PR 3 加入。

interface RatingStarsDisplayProps {
  /** 0–5，可帶小數 */
  value: number;
  size?: number;
  className?: string;
}

export default function RatingStarsDisplay({
  value,
  size = 16,
  className,
}: RatingStarsDisplayProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const fillPercent = (clamped / 5) * 100;

  const row = (weight: "bold" | "fill", colorClass: string) => (
    // w-max：實心排在被裁窄的 overlay 裡必須保持天然寬度，讓
    // overflow-hidden 裁切它——否則五顆星會「擠扁」進百分比寬度
    <div className={`flex w-max shrink-0 gap-0.5 ${colorClass}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon key={star} name="Star" size={size} weight={weight} aria-hidden />
      ))}
    </div>
  );

  return (
    <div className={`relative inline-flex ${className ?? ""}`} aria-hidden>
      {row("bold", "text-border-bright")}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${fillPercent}%` }}
      >
        {row("fill", "text-gold")}
      </div>
    </div>
  );
}
