"use client";

import { useRef, useState } from "react";
import Icon from "@/components/Icon";

// Google Apps Script webhook（設定方式見 DailyVal repo 的
// docs/esports-moderation-runbook.md §5.0）。未設定時不渲染表單，
// 直接顯示信箱申請的備援說明 —— 頁面可以先上線。
const ENDPOINT = process.env.NEXT_PUBLIC_DELETION_FORM_ENDPOINT;
// 防機器人：低於此秒數即送出視為 spam。表單很短，門檻比創作者表單低；
// 誤殺真實申請的代價高（對方以為會被處理），所以只設 3 秒。
const MIN_SUBMIT_SECONDS = 3;

type Status = "idle" | "submitting" | "success" | "error";

const inputClass =
  "cut-sm w-full border border-border-med bg-bg-elevated px-4 py-3 text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none";
const labelClass =
  "mb-2 block font-ui text-xs font-bold uppercase tracking-widest text-text-2";

/**
 * 刪除帳號申請表單（Client Component）
 * - 與創作者申請表單同一套後端模式：text/plain 送 JSON 至 Apps Script
 *   避免 CORS preflight，蜜罐欄位 + 最短填答時間防濫用
 * - payload：email | note | locale（locale 讓客服知道用哪個語言回信）
 */
export default function AccountDeletionForm({ locale }: { locale: string }) {
  const isZh = locale === "zh-TW";
  const [status, setStatus] = useState<Status>("idle");
  // 掛載時間，用於最短填答時間檢查
  const mountedAt = useRef(Date.now());

  const mailtoFallback = (
    <p>
      {isZh ? (
        <>
          請寄信至{" "}
          <a href="mailto:support@dailyval.com?subject=刪除電競評分帳號">
            support@dailyval.com
          </a>
          ，主旨註明「刪除電競評分帳號」，內文附上步驟一查到的登入信箱。
        </>
      ) : (
        <>
          Email{" "}
          <a href="mailto:support@dailyval.com?subject=Delete%20esports%20rating%20account">
            support@dailyval.com
          </a>{" "}
          with the subject &ldquo;Delete esports rating account&rdquo; and the
          sign-in email from step 1.
        </>
      )}
    </p>
  );

  // webhook 未設定 → 只顯示信箱備援
  if (!ENDPOINT) return mailtoFallback;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    // 蜜罐有值或填答過快 → 視為機器人，假裝成功、不送出
    const elapsedSeconds = (Date.now() - mountedAt.current) / 1000;
    if (data.get("website") || elapsedSeconds < MIN_SUBMIT_SECONDS) {
      setStatus("success");
      return;
    }

    const payload = {
      email: data.get("email"),
      note: data.get("note"),
      locale,
    };

    setStatus("submitting");
    try {
      // 不設 Content-Type header：預設 text/plain 可略過 CORS preflight
      const res = await fetch(ENDPOINT as string, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="cut my-6 border border-viper-green/40 bg-viper-green/5 p-8 text-center">
        <div className="mb-4 flex justify-center text-viper-green">
          <Icon name="CheckCircle" size={40} weight="bold" aria-hidden />
        </div>
        <h3 className="font-display text-lg font-bold uppercase tracking-tight text-text-1">
          {isZh ? "已收到您的刪除申請" : "Deletion request received"}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-text-2">
          {isZh
            ? "轉發信箱我們會直接處理；一般信箱請留意收件匣的確認信。完成時會回信通知您。"
            : "Relay addresses are processed directly; for regular addresses, watch your inbox for a confirmation email. We will email you when deletion is complete."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="my-6 grid grid-cols-1 gap-6">
      {/* 蜜罐欄位：一般使用者看不到也不會填 */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      <div>
        <label htmlFor="deletion-email" className={labelClass}>
          {isZh ? "Apple 登入信箱" : "Apple sign-in email"}
        </label>
        <input
          id="deletion-email"
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder={isZh ? "example@privaterelay.appleid.com" : "example@privaterelay.appleid.com"}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="deletion-note" className={labelClass}>
          {isZh ? "備註（選填）" : "Note (optional)"}
        </label>
        <textarea
          id="deletion-note"
          name="note"
          rows={3}
          maxLength={1000}
          className={inputClass}
        />
      </div>

      {status === "error" && (
        <div className="cut-sm border border-val-red/40 bg-val-red/5 p-4">
          <p className="font-ui text-sm font-bold uppercase tracking-wider text-val-red">
            {isZh ? "送出失敗" : "Submission failed"}
          </p>
          <div className="mt-1 text-sm text-text-2">{mailtoFallback}</div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="cut w-full bg-val-red px-8 py-4 font-ui text-base font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-red md:w-auto"
        >
          {isZh
            ? status === "submitting"
              ? "送出中…"
              : "送出刪除申請"
            : status === "submitting"
              ? "Submitting…"
              : "Submit deletion request"}
        </button>
      </div>
    </form>
  );
}
