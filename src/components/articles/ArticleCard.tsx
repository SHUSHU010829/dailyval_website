import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatArticleDate, isArticleCategory, type PublicArticle } from "@/lib/articles";

interface ArticleCardProps {
  article: PublicArticle;
  locale: string;
}

// 文章列表的一列：封面、分類、日期、標題、摘要、署名，整張卡可點
export default async function ArticleCard({ article, locale }: ArticleCardProps) {
  const t = await getTranslations("articles");
  const category = isArticleCategory(article.category) ? t(`category.${article.category}`) : article.category;

  return (
    <li>
      {/* 切角的 clip-path 會把 focus outline 一起裁掉，所以切角放在內層 */}
      <Link
        href={`/${locale}/articles/${article.slug}`}
        className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
      >
        <article className="cut border border-border-med bg-bg-panel transition-colors group-hover:border-border-bright group-hover:bg-bg-panel-hover md:flex">
          {article.cover_url && (
            <div className="w-full shrink-0 overflow-hidden bg-bg-elevated md:w-56 md:self-start">
              {/* 封面照原比例整張顯示，直式、方形也不裁，跟 App 的列表一樣 */}
              {/* 封面來自 R2 或寫手貼的網址，網域不固定，所以不走 next/image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.cover_url}
                alt=""
                loading="lazy"
                className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-xs uppercase tracking-widest text-text-3">
              <span className="text-val-red">{category}</span>
              <time dateTime={article.published_at} className="tabular-nums">
                {formatArticleDate(article.published_at, locale)}
              </time>
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-text-1">{article.title}</h2>
            {article.summary && (
              <p className="mt-2 text-sm leading-relaxed text-text-2">{article.summary}</p>
            )}
            <p className="mt-4 font-ui text-xs uppercase tracking-widest text-text-3">
              {t("by", { name: article.author_name })}
              <span className="ml-3 text-jett-blue">{t("readMore")} →</span>
            </p>
          </div>
        </article>
      </Link>
    </li>
  );
}
