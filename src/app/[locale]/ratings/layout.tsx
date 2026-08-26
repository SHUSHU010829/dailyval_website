import { setRequestLocale } from "next-intl/server";

// 評分區的共用容器（只管版心寬度）。造型與電競是兩個獨立的
// 頂層分頁，各自的標題、登入控制在各自的 layout／page 裡。

export default async function RatingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">{children}</div>
  );
}
