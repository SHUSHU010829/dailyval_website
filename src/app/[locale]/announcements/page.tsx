import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { getAnnouncements } from "@/lib/announcements";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.announcements" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/announcements",
  });
}

// 公告列表：服務狀態、已知問題與重要通知
export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("announcements");
  const common = await getTranslations("common");
  const announcements = getAnnouncements(locale);

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
          {"// NOTICE //"}
        </p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-2">{t("intro")}</p>
      </header>

      {announcements.length === 0 ? (
        <p className="text-sm text-text-2">{t("empty")}</p>
      ) : (
        <ul className="space-y-4" aria-label={t("heading")}>
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.slug} announcement={announcement} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  );
}
