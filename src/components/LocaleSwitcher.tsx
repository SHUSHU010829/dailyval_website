"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * 語言切換按鈕
 * - 用 next-intl 的 createNavigation 處理路徑切換與 NEXT_LOCALE cookie（不再手刻字串替換與手寫 cookie）
 */
export default function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const targetLocale = locale === "zh-TW" ? "en" : "zh-TW";

  function handleSwitch() {
    router.replace(pathname, { locale: targetLocale });
  }

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
