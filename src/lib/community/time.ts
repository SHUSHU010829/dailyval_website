// 貼文／留言的相對時間顯示。時間字串來自 PostgREST（小數位數不定），
// 一律經 parsePostgresTimestamp 解析，解不了回空字串而不是丟例外。

import { parsePostgresTimestamp } from "@/lib/esports/timestamps";

const WEEK_SECONDS = 604_800;

export function formatRelativeTime(
  raw: string | null | undefined,
  locale: string,
  now: number = Date.now(),
): string {
  if (!raw) return "";
  const timestamp = parsePostgresTimestamp(raw);
  if (timestamp === null) return "";

  const diffSeconds = Math.floor((now - timestamp) / 1000);

  // 超過一週改顯示日期（使用觀看者的本地時區）
  if (diffSeconds >= WEEK_SECONDS) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffSeconds < 60) return rtf.format(0, "second");
  if (diffSeconds < 3600) {
    return rtf.format(-Math.floor(diffSeconds / 60), "minute");
  }
  if (diffSeconds < 86_400) {
    return rtf.format(-Math.floor(diffSeconds / 3600), "hour");
  }
  return rtf.format(-Math.floor(diffSeconds / 86_400), "day");
}
