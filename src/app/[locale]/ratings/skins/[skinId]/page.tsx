import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { APP_STORE_URL } from "@/lib/site-config";
import { getSkinById } from "@/lib/ratings/skin-catalog";
import { fetchSkinAggregate, fetchSkinComments } from "@/lib/ratings/skin-reads";
import { averageOf } from "@/lib/ratings/aggregate";
import { formatRating } from "@/lib/ratings/format";
import RatingStarsDisplay from "@/components/ratings/RatingStarsDisplay";
import SkinCommentList from "@/components/ratings/SkinCommentList";
import Icon from "@/components/Icon";

// 造型詳情：平均星等＋留言（PR 1 唯讀；星等輸入與留言發佈在 PR 3）。
export const revalidate = 60;

interface SkinDetailParams {
  locale: string;
  skinId: string;
}

/** 造型 UUID 的粗篩，擋掉垃圾路徑，避免無謂的上游請求 */
function isValidSkinID(id: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SkinDetailParams>;
}): Promise<Metadata> {
  const { locale, skinId } = await params;
  const t = await getTranslations({ locale, namespace: "meta.ratingsSkinDetail" });

  const skin = isValidSkinID(skinId) ? await getSkinById(locale, skinId) : null;
  return buildMetadata({
    locale,
    title: skin ? `${skin.name}｜${t("title")}` : t("title"),
    description: t("description"),
    path: `/ratings/skins/${skinId.toLowerCase()}`,
  });
}

export default async function SkinDetailPage({
  params,
}: {
  params: Promise<SkinDetailParams>;
}) {
  const { locale, skinId } = await params;
  setRequestLocale(locale);

  if (!isValidSkinID(skinId)) notFound();
  const skin = await getSkinById(locale, skinId);
  if (!skin) notFound();

  const t = await getTranslations({ locale, namespace: "ratings.skins" });
  const [aggregate, comments] = await Promise.all([
    fetchSkinAggregate(skin.id),
    fetchSkinComments(skin.id),
  ]);
  const average = averageOf(aggregate.ratingCount, aggregate.ratingSum);

  return (
    <div>
      <Link
        href={`/${locale}/ratings/skins`}
        className="inline-flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-text-2 transition-colors hover:text-text-1"
      >
        <Icon name="CaretLeft" size={13} aria-hidden />
        {t("backToLeaderboard")}
      </Link>

      {/* 造型主視覺＋評分摘要 */}
      <section className="cut mt-4 border border-border-med bg-bg-panel p-6 md:p-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
          <div className="flex h-32 w-full max-w-sm items-center justify-center md:h-40">
            {skin.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={skin.image}
                alt={skin.name}
                className="max-h-full w-auto max-w-full object-contain"
              />
            ) : (
              <div className="h-24 w-full bg-bg-elevated" />
            )}
          </div>

          <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
            <p className="flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3">
              {skin.tierIcon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={skin.tierIcon} alt="" className="h-4 w-4" />
              )}
              {skin.weaponName}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-text-1 md:text-3xl">
              {skin.name}
            </h2>

            <div className="mt-4 flex items-center gap-3">
              <span className="font-display text-4xl font-black tabular-nums text-gold">
                {aggregate.ratingCount > 0 ? formatRating(average) : "–"}
              </span>
              <div className="flex flex-col items-start gap-1">
                <RatingStarsDisplay value={average} size={18} />
                <span className="font-ui text-xs tracking-wide text-text-3">
                  {t("ratingCount", { count: aggregate.ratingCount })}
                </span>
              </div>
            </div>

            {/* 星等輸入（登入投票）由 PR 3 接手；先導去 App */}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cut-sm mt-6 inline-block bg-val-red px-5 py-2.5 font-ui text-xs font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110"
            >
              {t("rateInApp")}
            </a>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <SkinCommentList comments={comments} locale={locale} />
      </div>
    </div>
  );
}
