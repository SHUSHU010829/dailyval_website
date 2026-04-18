import { getTranslations } from "next-intl/server";
import HeroCtaButton from "@/components/HeroCtaButton";

/**
 * Hero Section（Server Component）
 * - Section 元件為 Server Components 決策：不加 "use client"
 * - 背景使用 CSS 漸層 + SVG 裝飾，不引入 raster 圖片（目標 LCP ≤ 1.2s）
 * - aria-labelledby 指向 h1#hero-heading（landmark roles）
 */
export default async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center md:px-12"
    >
      {/* CSS 漸層背景 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        {/* 主漸層：深底色到微透明紅 */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base via-[#0f0a10] to-bg-base" />
        {/* 左上角光暈 */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-val-red/10 blur-3xl" />
        {/* 右下角光暈 */}
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-jett-blue/10 blur-3xl" />

        {/* SVG 掃描線裝飾 */}
        <svg
          className="absolute inset-0 h-full w-full opacity-5"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hero-scanlines"
              width="1"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <rect width="1" height="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#hero-scanlines)"
            className="text-white"
          />
        </svg>
      </div>

      {/* 內容 */}
      <div className="relative max-w-4xl">
        {/* HUD 標籤 */}
        <p
          className="mb-4 font-ui text-xs uppercase tracking-[0.3em] text-val-red"
          aria-hidden="true"
        >
          // DAILYVAL //
        </p>

        <h1
          id="hero-heading"
          className="font-display text-balance text-4xl font-black uppercase leading-none tracking-tight text-text-1 sm:text-5xl md:text-5xl lg:text-6xl"
        >
          {t("headline")}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-2 md:text-xl">
          {t("subheadline")}
        </p>

        <HeroCtaButton
          label={t("ctaLabel")}
          href="https://apps.apple.com/tw/app/dailyval/id1637782901"
        />
      </div>

      {/* 底部裝飾線 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-val-red/40 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
