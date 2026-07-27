import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import TacticalCursor from "@/components/TacticalCursor";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import MobileDownloadBar from "@/components/MobileDownloadBar";
import AdConsentGate from "@/components/AdConsentGate";

// 靜態生成所有支援語系的路由
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Locale layout：注入 i18n provider 與 Nav/Footer slot
// 不渲染 html/body（由 root layout 統一處理）
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 若 locale 不在支援清單內，回傳 404
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // 啟用靜態渲染（Static Rendering）
  setRequestLocale(locale);

  // 取得當前語系的所有翻譯字串
  const messages = await getMessages();
  const t = await getTranslations("nav");

  return (
    // 提供 i18n context 給所有 Client Components
    <NextIntlClientProvider messages={messages}>
      {/* Skip-to-content：鍵盤使用者可跳過重複的導覽列，直達主要內容 */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:cut-sm focus-visible:bg-val-red focus-visible:px-4 focus-visible:py-2 focus-visible:font-ui focus-visible:text-sm focus-visible:font-bold focus-visible:uppercase focus-visible:tracking-widest focus-visible:text-bg-base"
      >
        {t("skipToContent")}
      </a>

      {/* 開發用 Web Vitals 監控（上線前刪除） */}
      <WebVitalsReporter />
      {/* 戰術游標（client-side，prefers-reduced-motion 內部自動判斷） */}
      <TacticalCursor />

      {/* 全域導覽列 */}
      <header className="sticky top-0 z-50">
        <SiteNav />
      </header>

      {/* 主要內容區域：pb-20 避免行動版 MobileDownloadBar 蓋住頁尾 */}
      <main id="main-content" className="pb-20 md:pb-0">
        {children}
      </main>

      {/* 全域頁尾 */}
      <SiteFooter />

      {/* 手機版懸浮下載按鈕（捲過 Hero 後出現） */}
      <MobileDownloadBar />

      {/* AdSense 同意閘門：使用者同意前不載入 adsbygoogle.js */}
      <AdConsentGate />
    </NextIntlClientProvider>
  );
}
