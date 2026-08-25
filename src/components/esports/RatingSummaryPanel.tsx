import { getTranslations } from "next-intl/server";
import { parsePostgresTimestamp } from "@/lib/esports/timestamps";
import { formatRelativeTime } from "@/lib/ratings/format";
import type { RatingSummaryRow } from "@/lib/esports/types";

// 全場評分摘要（server component）：平均、票數、評分窗狀態。
// summary 為 null 時顯示「暫無評分資料」——伺服器端的功能開關會讓
// 摘要整個消失，這時不能誤導成「還沒有人評分」。
// 星等輸入（1–10）在登入 PR 接上。

interface RatingSummaryPanelProps {
  summary: RatingSummaryRow | null;
  locale: string;
}

export default async function RatingSummaryPanel({
  summary,
  locale,
}: RatingSummaryPanelProps) {
  const t = await getTranslations({ locale, namespace: "esports.board" });

  if (!summary) {
    return (
      <div className="cut border border-border-med bg-bg-panel p-6 text-center">
        <p className="font-ui text-sm text-text-2">{t("unavailable")}</p>
      </div>
    );
  }

  // 動態頁每個 request 重渲染，這裡的「現在」最多舊 60 秒（fetch 快取）；
  // 倒數與到期硬停在互動 PR 由 client 端接手
  const nowMs = new Date().getTime();
  const closesAtMs = parsePostgresTimestamp(summary.window_closes_at);
  const windowOpen = summary.window_open && (closesAtMs === null || closesAtMs > nowMs);

  return (
    <div className="cut border border-border-med bg-bg-panel p-6">
      <p className="font-ui text-xs uppercase tracking-widest text-text-3">
        {t("overallRatings")}
      </p>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-5xl font-black tabular-nums text-rating-teal">
            {summary.match_avg !== null ? summary.match_avg.toFixed(1) : "–"}
          </span>
          <span className="font-ui text-sm text-text-3">/ 10</span>
        </div>
        <div className="text-right font-ui text-xs tracking-wide text-text-3">
          <p>{t("matchVotes", { count: summary.match_vote_count })}</p>
          <p className="mt-0.5">{t("commentTotal", { count: summary.comment_count })}</p>
        </div>
      </div>

      <p className="mt-4 border-t border-border-dim pt-3 font-ui text-xs tracking-wide">
        {windowOpen && closesAtMs !== null ? (
          <span className="text-viper-green">
            {t("closesIn", { time: formatRelativeTime(closesAtMs, locale, nowMs) })}
          </span>
        ) : (
          <span className="text-text-3">{t("closed")}</span>
        )}
      </p>
    </div>
  );
}
