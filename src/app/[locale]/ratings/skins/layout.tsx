import { getTranslations, setRequestLocale } from "next-intl/server";
import EsportsAuthProvider from "@/components/esports/EsportsAuthProvider";
import AuthButton from "@/components/ratings/AuthButton";

// 造型評分的殼層：標題＋Apple 登入（排行榜與詳情頁共用）。
// 登入走與電競評分同一個 Supabase SIWA session（EsportsAuthProvider），
// 造型的投票／留言身分就是 esports.profiles——iOS 端同一套。

export default async function SkinRatingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "ratings.skinsHeader" });

  return (
    <EsportsAuthProvider>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-ui text-xs uppercase tracking-[0.3em] text-val-red">
            {t("kicker")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl font-body text-sm text-text-2 md:text-base">
            {t("subtitle")}
          </p>
        </div>
        <AuthButton />
      </header>

      <div className="mt-8">{children}</div>
    </EsportsAuthProvider>
  );
}
