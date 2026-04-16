import type { Metadata } from "next";
import { Orbitron, Rajdhani, Noto_Sans_TC } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

// ============================================================
// 字型載入 — Task 4.2
// 透過 next/font 載入，自動加入 preconnect 與 display=swap
// ============================================================

// 電競科技感標題字型（英文 Display / HUD 標籤）
const orbitron = Orbitron({
  subsets: ["latin"],
  // 只載入實際使用的 weight：700 標題、900 超粗展示
  weight: ["700", "900"],
  variable: "--font-orbitron",
  display: "swap",
  preload: true,
});

// 銳利幾何 UI 標籤字型（英文 UI / 標籤 uppercase）
const rajdhani = Rajdhani({
  subsets: ["latin"],
  // 只載入 600（標籤）、700（強調）
  weight: ["600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
  preload: false,
});

// CJK 內文字型（中文正文，預設 body 字型）
const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  // 只載入 400（內文）、700（粗體）
  weight: ["400", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // 各頁面透過 generateMetadata 覆寫
  title: {
    template: "%s — DailyVal",
    default: "DailyVal",
  },
};

// Root layout：負責 HTML shell（html / body）與字型變數注入
// lang 屬性由 next-intl 的 getLocale() 讀取，確保 <html lang> 正確
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${orbitron.variable} ${rajdhani.variable} ${notoSansTC.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
