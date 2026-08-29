"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import RatingStarsDisplay from "@/components/ratings/RatingStarsDisplay";
import { useEsportsSession } from "@/components/esports/EsportsAuthProvider";
import { EsportsServiceError } from "@/lib/esports/rating-service";
import {
  fetchMyRating,
  fetchSkinAggregateLive,
  submitSkinRating,
  VOTE_COOLDOWN_SECONDS,
} from "@/lib/ratings/skin-service";
import { averageOf } from "@/lib/ratings/leaderboard";
import { formatRating } from "@/lib/ratings/format";

// 造型評分面板：平均分＋票數＋我的 1–5 星投票。
// SSR 帶進初始彙總；登入後抓我的票；送出走 skins.submit_rating RPC
// （expectedUID 在點擊當下捕捉），成功後重讀伺服器的權威彙總。

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
  const session = useEsportsSession();
  // session 的 ref 鏡像：await 之後的所有權檢查要讀「現在」的值
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [totals, setTotals] = useState({ count: initialCount, sum: initialSum });
  // 我的票綁著它所屬的帳號；登出／換帳號時衍生值自動歸零，
  // 慢回應的發佈也因為帶著自己的 uid 而對新帳號隱形
  const [ratingState, setRatingState] = useState<{
    user: string | null;
    value: number | null;
  }>({ user: null, value: null });
  const myRating = ratingState.user === session.uid ? ratingState.value : null;
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // 登入後抓我的現有投票（登出的歸零由上面的衍生值處理）
  useEffect(() => {
    let cancelled = false;
    const user = session.uid;
    if (session.status !== "signedIn" || !user) {
      return () => {
        cancelled = true;
      };
    }
    fetchMyRating(skinID)
      .then((existing) => {
        // null 也是權威答案（沒投過、或開關關閉時 RLS 回空）——必須
        // 照樣發布，否則登出再登回的同帳號會看到殘留的舊星星
        if (!cancelled) {
          setRatingState({ user, value: existing });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.status, session.uid, skinID]);

  const average = useMemo(() => averageOf(totals.count, totals.sum), [totals]);

  async function handleRate(value: number) {
    if (submitting) return;
    // expectedUID 在點擊當下捕捉：伺服器在帳號半路換人時拒絕寫入
    const actingUID = session.uid;
    if (session.status !== "signedIn" || !actingUID) {
      void session.signInWithApple();
      return;
    }
    // 同值重投是 no-op（iOS 同款防呆）
    if (myRating === value) return;

    const previousRating = myRating;
    const previousTotals = totals;

    setSubmitting(true);
    setFeedback(null);
    setRatingState({ user: actingUID, value });

    try {
      await submitSkinRating({ skinID, value, expectedUID: actingUID });
      // 票已落地：重讀伺服器的權威彙總；讀不到就就地套 delta 樂觀顯示。
      // 發布只屬於發起的 session——帳號換人後 A 的慢完成不得在 B 的
      // 畫面上發布狀態或彈提示（活引用檢查，閉包快照永遠等於自己）
      const fresh = await fetchSkinAggregateLive(skinID);
      if (sessionRef.current.uid !== actingUID) return;
      if (fresh) {
        setTotals({ count: fresh.ratingCount, sum: fresh.ratingSum });
      } else if (previousRating === null) {
        setTotals({ count: previousTotals.count + 1, sum: previousTotals.sum + value });
      } else {
        setTotals({
          count: previousTotals.count,
          sum: previousTotals.sum + value - previousRating,
        });
      }
      setFeedback({ kind: "saved" });
    } catch (error) {
      if (sessionRef.current.uid !== actingUID) return;
      setRatingState({ user: actingUID, value: previousRating });
      if (error instanceof EsportsServiceError && error.kind === "rate_limited") {
        setFeedback({ kind: "throttled", seconds: VOTE_COOLDOWN_SECONDS });
      } else {
        setFeedback({ kind: "failed" });
      }
    } finally {
      // 早退（session 換人）也要解鎖送出；卡住的 true 會癱瘓整組星星
      setSubmitting(false);
    }
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

      {/* 我的投票（滑過預覽、點擊送出；未登入點擊會帶出 Apple 登入） */}
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
