// 評分區的小工具：分數格式、相對時間、牌位圖示。

/** 平均分固定一位小數（iOS formattedRating 同款） */
export function formatRating(average: number): string {
  return average.toFixed(1);
}

/**
 * 相對時間（Intl.RelativeTimeFormat，跟著頁面語系）。
 * 超過 30 天直接顯示日期，避免「87 天前」這種沒人在讀的字串。
 */
export function formatRelativeTime(timestampMs: number, locale: string, nowMs: number = Date.now()): string {
  const diffSeconds = Math.round((timestampMs - nowMs) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds >= 30 * 86400) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(timestampMs)
    );
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
  if (absSeconds < 60) return formatter.format(diffSeconds, "second");
  if (absSeconds < 3600) return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (absSeconds < 86400) return formatter.format(Math.round(diffSeconds / 3600), "hour");
  return formatter.format(Math.round(diffSeconds / 86400), "day");
}

/** 目前賽季的 competitive tier 圖示（與 dailyval_social 的 rankMapping 同一組資源） */
const COMPETITIVE_TIER_SET = "03621f52-342b-cf4e-4f86-9350a49c6d04";

export function rankIconURL(rankTier: number): string | null {
  if (!Number.isInteger(rankTier) || rankTier < 0 || rankTier > 27) return null;
  return `https://media.valorant-api.com/competitivetiers/${COMPETITIVE_TIER_SET}/${rankTier}/smallicon.png`;
}
