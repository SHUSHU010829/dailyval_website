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
}: PageSeoInput): Metadata {
  const resolvedLocale = SUPPORTED_LOCALES.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : "zh-TW";

  const canonicalUrl = `${BASE_URL}/${resolvedLocale}${path}`;
  const defaultOgImage = `${BASE_URL}/og-image.png`;
  const resolvedOgImage = ogImage ?? defaultOgImage;

  // 建立所有語系的 alternates（hreflang）
  const alternateLanguages = SUPPORTED_LOCALES.reduce(
    (acc, loc) => {
      acc[loc] = `${BASE_URL}/${loc}${path}`;
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...alternateLanguages,
        "x-default": `${BASE_URL}/zh-TW${path}`,
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
