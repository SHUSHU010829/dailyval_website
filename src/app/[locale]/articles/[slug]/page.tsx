import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { fetchArticle, formatArticleDate, isArticleCategory } from "@/lib/articles";
import ArticleBody from "@/components/articles/ArticleBody";

interface ArticlePageParams {
  locale: string;
  slug: string;
}

// 文章是寫手隨時會發的，slug 在 build 時不知道：每個 slug 第一次被要求時
// 才產生，之後照 fetch 的 60 秒快取更新。
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticlePageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return {};

  const t = await getTranslations({ locale, namespace: "meta.articleDetail" });

  return buildMetadata({
    locale,
    title: t("title", { title: article.title }),
    description: article.summary || article.title,
    path: `/articles/${slug}`,
    // 有封面就拿封面當分享圖；沒有就退回品牌卡（buildMetadata 的預設）。
    ...(article.cover_url ? { ogImage: article.cover_url } : {}),
  });
}

// 單篇文章。App 的話題頁也讀同一筆資料，這裡是它的網頁版。
export default async function ArticlePage({ params }: { params: Promise<ArticlePageParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await fetchArticle(slug);
  if (!article) notFound();

  const t = await getTranslations("articles");
  const category = isArticleCategory(article.category) ? t(`category.${article.category}`) : article.category;
  const updated = article.updated_at.slice(0, 10) !== article.published_at.slice(0, 10);

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24" lang={article.lang}>
      <Link
        href={`/${locale}/articles`}
        className="mb-8 inline-flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3 transition-colors hover:text-text-1"
      >
        ← {t("backToList")}
      </Link>

      <header className="mb-10 border-b border-border-med pb-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-ui text-xs uppercase tracking-widest text-text-3">
          <span className="text-val-red">{category}</span>
          <time dateTime={article.published_at}>
            {t("publishedAt", { date: formatArticleDate(article.published_at, locale) })}
          </time>
          {updated && (
            <time dateTime={article.updated_at}>
              {t("updatedAt", { date: formatArticleDate(article.updated_at, locale) })}
            </time>
          )}
        </div>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-text-1 md:text-4xl">
          {article.title}
        </h1>
        {article.summary && (
          <p className="mt-4 text-base leading-relaxed text-text-2">{article.summary}</p>
        )}
        <p className="mt-4 font-ui text-xs uppercase tracking-widest text-text-3">
          {t("by", { name: article.author_name })}
        </p>
      </header>

      {article.cover_url && (
        <figure className="mb-10 overflow-hidden border border-border-med bg-bg-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.cover_url} alt="" className="w-full object-cover" />
        </figure>
      )}

      <ArticleBody markdown={article.body_md} />
    </article>
  );
}
