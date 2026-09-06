import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import {
  announcementSlugs,
  formatAnnouncementDate,
  getAnnouncement,
} from "@/lib/announcements";
import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";

interface AnnouncementPageParams {
  locale: string;
  slug: string;
}

// 公告寫死，slug 在 build 時就全部產出
export function generateStaticParams() {
  return announcementSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<AnnouncementPageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const announcement = getAnnouncement(locale, slug);
  if (!announcement) return {};

  const t = await getTranslations({ locale, namespace: "meta.announcementDetail" });

  return buildMetadata({
    locale,
    title: t("title", { title: announcement.title }),
    description: announcement.summary,
    path: `/announcements/${slug}`,
  });
}

// 單則公告內文。App 內的公告連結會開到這一頁（Firestore news.url）
export default async function AnnouncementPage({
  params,
}: {
  params: Promise<AnnouncementPageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const announcement = getAnnouncement(locale, slug);
  if (!announcement) notFound();

  const t = await getTranslations("announcements");

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
      <Link
        href={`/${locale}/announcements`}
        className="mb-8 inline-flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3 transition-colors hover:text-text-1"
      >
        ← {t("backToList")}
      </Link>

      <header className="mb-10 border-b border-border-med pb-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <AnnouncementStatusBadge
            status={announcement.status}
            label={t(`status.${announcement.status}`)}
          />
          <time
            dateTime={announcement.publishedAt}
            className="font-ui text-xs uppercase tracking-widest text-text-3"
          >
            {t("publishedAt", { date: formatAnnouncementDate(announcement.publishedAt, locale) })}
          </time>
          {announcement.updatedAt && (
            <time
              dateTime={announcement.updatedAt}
              className="font-ui text-xs uppercase tracking-widest text-text-3"
            >
              {t("updatedAt", { date: formatAnnouncementDate(announcement.updatedAt, locale) })}
            </time>
          )}
        </div>
        <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-text-1 md:text-4xl">
          {announcement.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-2">{announcement.summary}</p>
      </header>

      <div className="prose-legal">
        {announcement.sections.map((section, index) => (
          <section key={index}>
            {section.heading && <h2>{section.heading}</h2>}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
