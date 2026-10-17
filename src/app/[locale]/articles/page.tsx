import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { fetchArticles, parseArticlePage } from "@/lib/articles";
import ArticleCard from "@/components/articles/ArticleCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.articles" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/articles",
  });
}

// 遊戲話題列表：每日瓦寫手的文章。資料來自 Supabase articles_public（60 秒快取）。
export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = parseArticlePage((await searchParams).page);
  const t = await getTranslations("articles");
  const common = await getTranslations("common");
  const result = await fetchArticles(page);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
      <Link
        href={`/${locale}`}
        className="mb-8 inline-flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3 transition-colors hover:text-text-1"
      >
        ← {common("backHome")}
      </Link>

      <header className="mb-10 border-b border-border-med pb-8">
        <p className="mb-3 font-ui text-xs uppercase tracking-[0.3em] text-val-red" aria-hidden="true">
          {"// TOPICS //"}
        </p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-2">{t("intro")}</p>
      </header>

      {result === null ? (
        <p className="text-sm text-text-2">{t("unavailable")}</p>
      ) : (
        <>
          {result.items.length === 0 ? (
            // 第 2 頁以後也可能是空的（最後一篇被撤回了），下面的「較新的文章」要留著。
            <p className="text-sm text-text-2">{t("empty")}</p>
          ) : (
            <ul className="space-y-4" aria-label={t("heading")}>
              {result.items.map((article) => (
                <ArticleCard key={article.id} article={article} locale={locale} />
              ))}
            </ul>
          )}
          {(page > 1 || result.hasMore) && (
            <nav className="mt-10 flex justify-between font-ui text-xs uppercase tracking-widest" aria-label={t("pagination")}>
              {page > 1 ? (
                <Link
                  href={page === 2 ? `/${locale}/articles` : `/${locale}/articles?page=${page - 1}`}
                  className="text-text-3 transition-colors hover:text-text-1"
                >
                  ← {t("newer")}
                </Link>
              ) : (
                <span />
              )}
              {result.hasMore && (
                <Link
                  href={`/${locale}/articles?page=${page + 1}`}
                  className="text-text-3 transition-colors hover:text-text-1"
                >
                  {t("older")} →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
