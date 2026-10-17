import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dailyval.com";
const SUPPORTED_LOCALES = ["zh-TW", "en"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

interface PageSeoInput {
  locale: string;
  title: string;
  description: string;
  /** 相對路徑，如 "/tos"（不含語系前綴） */
  path?: string;
  ogImage?: string;
  /** 獨立分享網域可覆寫；一般頁面沿用網站網址。 */
  baseURL?: string;
}

/**
 * generateMetadata helper
 * 統一產生 Next.js Metadata：
 * - title / description
 * - openGraph（含 locale-specific og:image）
 * - twitter card
 * - alternates.languages（hreflang，含 x-default）
 */
export function buildMetadata({
  locale,
  title,
  description,
  path = "/",
  ogImage,
  baseURL = BASE_URL,
}: PageSeoInput): Metadata {
  const resolvedLocale = SUPPORTED_LOCALES.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : "zh-TW";

  const canonicalUrl = `${baseURL}/${resolvedLocale}${path}`;
  const ogParams = new URLSearchParams({ title, description, locale: resolvedLocale });
  const defaultOgImage = `${baseURL}/og?${ogParams.toString()}`;
  // Twitter summary_large_image 卡片建議 2:1 圖片，與 OG 共用同一張橫圖
  const resolvedOgImage = ogImage ?? defaultOgImage;

  // 建立所有語系的 alternates（hreflang）
  const alternateLanguages = SUPPORTED_LOCALES.reduce(
    (acc, loc) => {
      acc[loc] = `${baseURL}/${loc}${path}`;
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    title,
    description,
    metadataBase: new URL(baseURL),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...alternateLanguages,
        "x-default": `${baseURL}/zh-TW${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "DailyVal",
      locale: resolvedLocale,
      type: "website",
      images: [
        {
          url: resolvedOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [resolvedOgImage],
    },
  };
}
