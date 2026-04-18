import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import HeroSection from "@/components/sections/HeroSection";
import SocialProofSection from "@/components/sections/SocialProofSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import CommunitySection from "@/components/sections/CommunitySection";
import FinalCtaSection from "@/components/sections/FinalCtaSection";

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
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <CommunitySection />
      <FinalCtaSection />
    </>
  );
}
