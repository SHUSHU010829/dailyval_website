"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import Script from "next/script";

const STORAGE_KEY = "ad-consent";
const CONSENT_EVENT = "ad-consent-change";
type Consent = "granted" | "denied";

function getSnapshot(): Consent | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : null;
}

// SSR 階段沒有 localStorage 可讀，一律視為「尚未決定」，避免 hydration mismatch
function getServerSnapshot(): Consent | null {
  return null;
}

function setConsent(next: Consent) {
  window.localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * AdSense 同意閘門：載入前需使用者明確同意，取代先前無條件載入的做法
 * - 尚無同意紀錄：顯示同意/拒絕橫幅，不載入 adsbygoogle.js
 * - 同意：掛載 adsbygoogle.js，並把選擇存進 localStorage
 * - 拒絕：不載入 script，同樣把選擇存進 localStorage，往後不再顯示橫幅
 * - 用 useSyncExternalStore 讀取 localStorage，避免在 effect 內直接 setState
 */
export default function AdConsentGate() {
  const t = useTranslations("adConsent");
  const consent = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      window.addEventListener(CONSENT_EVENT, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(CONSENT_EVENT, callback);
      };
    },
    getSnapshot,
    getServerSnapshot
  );

  if (consent === "granted") {
    return (
      <Script
        id="adsbygoogle-init"
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1773132783019070"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    );
  }

  // SSR（consent 恆為 null）或使用者已拒絕：暫不顯示橫幅
  if (consent === "denied") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label={t("message")}
      className="cut-sm fixed bottom-4 left-4 right-4 z-[90] flex flex-col gap-3 border border-border-bright bg-bg-panel p-4 text-sm text-text-2 shadow-lg md:left-auto md:right-4 md:max-w-md md:flex-row md:items-center"
    >
      <p className="flex-1">{t("message")}</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="cut-sm border border-border-med px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:border-border-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
        >
          {t("decline")}
        </button>
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="cut-sm bg-val-red px-4 py-2 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-val-red"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
