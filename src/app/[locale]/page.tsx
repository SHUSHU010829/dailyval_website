import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import HeroSection from "@/components/sections/HeroSection";
import SocialProofSection from "@/components/sections/SocialProofSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import CommunitySection from "@/components/sections/CommunitySection";
import FinalCtaSection from "@/components/sections/FinalCtaSection";
import { APP_STORE_URL } from "@/lib/site-config";

// SoftwareApplication JSON-LD：ratingValue/ratingCount 對應頁面 socialProof 區塊
// 已公開展示的「4.7★ App Store 評分」「15,600+ 五星好評」文案
const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DailyVal",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "iOS",
  url: APP_STORE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.7",
    ratingCount: "15600",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.home" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/",
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <CommunitySection />
      <FinalCtaSection />
    </>
  );
}
