import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import TacticalCursor from "@/components/TacticalCursor";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// 靜態生成所有支援語系的路由
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 注入 hreflang alternates — Task 2.5
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params; // locale 由各頁面的 generateMetadata 覆寫；此層提供 alternates 基底
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";

  return {
    alternates: {
      languages: {
        "zh-TW": `${baseUrl}/zh-TW`,
        en: `${baseUrl}/en`,
        "x-default": `${baseUrl}/zh-TW`,
      },
    },
  };
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

  return (
    // 提供 i18n context 給所有 Client Components
    <NextIntlClientProvider messages={messages}>
      {/* 開發用 Web Vitals 監控（上線前刪除） */}
      <WebVitalsReporter />
      {/* 戰術游標（client-side，prefers-reduced-motion 內部自動判斷） */}
      <TacticalCursor />

      {/* 全域導覽列 */}
      <header>
        <SiteNav />
      </header>

      {/* 主要內容區域 */}
      <main>{children}</main>

      {/* 全域頁尾 */}
      <SiteFooter />
    </NextIntlClientProvider>
  );
}
