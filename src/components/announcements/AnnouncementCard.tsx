import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AnnouncementStatusBadge from "@/components/announcements/AnnouncementStatusBadge";
import { formatAnnouncementDate, type Announcement } from "@/lib/announcements";

interface AnnouncementCardProps {
  announcement: Announcement;
  locale: string;
}

// 公告列表的一列：狀態、日期、標題、摘要，整張卡可點
export default async function AnnouncementCard({ announcement, locale }: AnnouncementCardProps) {
  const t = await getTranslations("announcements");

  return (
    <li>
      <Link
        href={`/${locale}/announcements/${announcement.slug}`}
        className="cut block border border-border-med bg-bg-panel p-5 transition-colors hover:border-border-bright hover:bg-bg-panel-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AnnouncementStatusBadge
            status={announcement.status}
            label={t(`status.${announcement.status}`)}
          />
          <time
            dateTime={announcement.publishedAt}
            className="font-ui text-xs tabular-nums text-text-3"
          >
            {formatAnnouncementDate(announcement.publishedAt, locale)}
          </time>
        </div>
        <h2 className="mt-3 font-display text-lg font-bold text-text-1">{announcement.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-2">{announcement.summary}</p>
        <p className="mt-4 font-ui text-xs uppercase tracking-widest text-jett-blue">
          {t("readMore")} →
        </p>
      </Link>
    </li>
  );
}
