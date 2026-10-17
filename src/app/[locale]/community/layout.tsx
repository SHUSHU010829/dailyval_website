import { getTranslations, setRequestLocale } from "next-intl/server";
import CommunityNoticeProvider from "@/components/community/CommunityNoticeProvider";
import CommunitySessionProvider from "@/components/community/CommunitySessionProvider";
import EsportsAuthProvider from "@/components/esports/EsportsAuthProvider";
import AuthButton from "@/components/ratings/AuthButton";

// 社群板的殼層：標題＋Apple 登入（動態牆、貼文頁、作者頁共用）。
// 登入走與電競評分、造型評分同一個 Supabase session（EsportsAuthProvider），
// 社群板只在上面多載入作者署名（CommunitySessionProvider）。

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: "communityBoard.header",
  });

  return (
    <EsportsAuthProvider>
      <CommunitySessionProvider>
        <CommunityNoticeProvider>
          <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
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
          </div>
        </CommunityNoticeProvider>
      </CommunitySessionProvider>
    </EsportsAuthProvider>
  );
}
