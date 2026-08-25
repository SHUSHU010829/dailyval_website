import { getTranslations, setRequestLocale } from "next-intl/server";
import RatingsTabs from "@/components/ratings/RatingsTabs";
import CloudKitProvider from "@/components/ratings/CloudKitProvider";
import AuthButton from "@/components/ratings/AuthButton";

// 評分區的共用殼層：標題、Skins/Esports 分段導覽、CloudKit 登入。
// CloudKitProvider 只掛在這層，cloudkit.js 不進行銷頁的 bundle。

export default async function RatingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "ratings" });

  return (
    <CloudKitProvider>
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <header>
          <p className="font-ui text-xs uppercase tracking-[0.3em] text-val-red">
            {t("kicker")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-text-2 md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <RatingsTabs
            locale={locale}
            skinsLabel={t("tabs.skins")}
            esportsLabel={t("tabs.esports")}
            comingSoonLabel={t("tabs.comingSoon")}
          />
          <AuthButton />
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </CloudKitProvider>
  );
}
