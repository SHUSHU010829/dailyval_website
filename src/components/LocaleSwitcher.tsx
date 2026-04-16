"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * 語言切換按鈕
 * - 切換時保留當前 pathname
 * - 寫入 NEXT_LOCALE cookie 供後續請求使用
 */
export default function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const targetLocale = locale === "zh-TW" ? "en" : "zh-TW";

  function handleSwitch() {
    // 將路徑中的當前語系前綴替換為目標語系
    const newPath = pathname.replace(`/${locale}`, `/${targetLocale}`);

    // 寫入 cookie 讓後續訪問記住選擇
    document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;

    router.push(newPath);
  }

  // 確保 locales 列表存在（防禦性檢查）
  const isSupported = routing.locales.includes(
    targetLocale as (typeof routing.locales)[number]
  );
  if (!isSupported) return null;

  return (
    <button
      onClick={handleSwitch}
      aria-label={t("switchLocaleLabel")}
      className="cut-sm inline-flex items-center gap-1 border border-border-med px-3 py-1 font-ui text-sm uppercase tracking-widest text-text-2 transition-colors hover:border-val-red hover:text-text-1"
    >
      {locale === "zh-TW" ? "EN" : "中文"}
    </button>
  );
}
