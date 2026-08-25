"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import RatingStarsDisplay from "@/components/ratings/RatingStarsDisplay";
import { useCloudKitSession } from "@/components/ratings/CloudKitProvider";
import { fetchMyRating, submitRating } from "@/lib/ratings/skin-ratings-client";
import { averageOf, computeDelta } from "@/lib/ratings/aggregate";
import { formatRating } from "@/lib/ratings/format";

// 造型評分面板：平均分＋票數＋我的 1–5 星投票。
// SSR 帶進初始彙總；登入後抓我的票；送出走 skin-ratings-client 的
// CAS 流程，UI 樂觀更新，失敗回滾。

interface SkinRatingPanelProps {
  skinID: string;
  initialCount: number;
  initialSum: number;
}

type Feedback =
  | { kind: "saved" }
  | { kind: "throttled"; seconds: number }
  | { kind: "failed" }
  | null;

export default function SkinRatingPanel({
  skinID,
  initialCount,
  initialSum,
}: SkinRatingPanelProps) {
  const t = useTranslations("ratings.skins");
  const session = useCloudKitSession();

  const [totals, setTotals] = useState({ count: initialCount, sum: initialSum });
  // 我的票綁著它所屬的帳號；登出（userRecordName 變 null）衍生值自動歸零
  const [ratingState, setRatingState] = useState<{
    user: string | null;
    value: number | null;
  }>({ user: null, value: null });
  const myRating = ratingState.user === session.userRecordName ? ratingState.value : null;
  const setMyRating = (value: number | null) =>
    setRatingState({ user: session.userRecordName, value });
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // 登入後抓我的現有投票（登出的歸零由上面的衍生值處理）
  useEffect(() => {
    let cancelled = false;
    const user = session.userRecordName;
    if (session.status !== "signedIn" || !user) {
      return () => {
        cancelled = true;
      };
    }
    fetchMyRating(user, skinID)
      .then((existing) => {
        if (!cancelled && existing) {
          setRatingState({ user, value: existing.value });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.status, session.userRecordName, skinID]);

  const average = useMemo(() => averageOf(totals.count, totals.sum), [totals]);

  async function handleRate(value: number) {
    if (submitting) return;
    if (session.status !== "signedIn") {
      session.signIn();
      return;
    }
    // 同值重投是 no-op（iOS 同款防呆）
    if (myRating === value) return;

    const previousRating = myRating;
    const previousTotals = totals;

    setSubmitting(true);
    setFeedback(null);
    setMyRating(value);

    const result = await submitRating({
      userRecordName: session.userRecordName,
      skinID,
      value,
    });

    switch (result.outcome) {
      case "ok": {
        if (result.totals) {
          setTotals({ count: result.totals.ratingCount, sum: result.totals.ratingSum });
        } else {
          // 票已計但彙總沒讀到新值：就地套 delta 樂觀顯示
          const delta = computeDelta(previousRating, value);
          if (delta) {
            setTotals({
              count: previousTotals.count + delta.countDelta,
              sum: previousTotals.sum + delta.sumDelta,
            });
          }
        }
        setFeedback({ kind: "saved" });
        break;
      }
      case "noop":
        break;
      case "throttled":
        setMyRating(previousRating);
        setFeedback({ kind: "throttled", seconds: result.retryAfterSeconds });
        break;
      default:
        setMyRating(previousRating);
        setFeedback({ kind: "failed" });
        break;
    }
    setSubmitting(false);
  }

  const interactive = session.status === "signedIn" || session.status === "signedOut";
  const displayValue = hovered ?? myRating ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="font-display text-4xl font-black tabular-nums text-gold">
          {totals.count > 0 ? formatRating(average) : "–"}
        </span>
        <div className="flex flex-col items-start gap-1">
          <RatingStarsDisplay value={average} size={18} />
          <span className="font-ui text-xs tracking-wide text-text-3">
            {t("ratingCount", { count: totals.count })}
          </span>
        </div>
      </div>

      {/* 我的投票（滑過預覽、點擊送出） */}
      {interactive && (
        <div className="mt-5">
          <p className="font-ui text-xs uppercase tracking-widest text-text-3">
            {session.status === "signedIn" ? t("rating.yourRating") : t("rating.signInToRate")}
          </p>
          <div
            className="mt-1.5 flex gap-1"
            role="radiogroup"
            aria-label={t("rating.yourRating")}
            onMouseLeave={() => setHovered(null)}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={myRating === value}
                aria-label={t("rating.rateAction", { count: value })}
                disabled={submitting}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(null)}
                onClick={() => void handleRate(value)}
                className={`p-0.5 transition-transform hover:scale-110 disabled:opacity-60 ${
                  value <= displayValue ? "text-gold" : "text-border-bright"
                }`}
              >
                <Icon
                  name="Star"
                  size={26}
                  weight={value <= displayValue ? "fill" : "bold"}
                  aria-hidden
                />
              </button>
            ))}
          </div>

          {feedback && (
            <p
              role="status"
              className={`mt-2 font-ui text-xs ${
                feedback.kind === "saved" ? "text-viper-green" : "text-val-red"
              }`}
            >
              {feedback.kind === "saved" && t("rating.saved")}
              {feedback.kind === "throttled" && t("rating.throttled", { seconds: feedback.seconds })}
              {feedback.kind === "failed" && t("rating.failed")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
