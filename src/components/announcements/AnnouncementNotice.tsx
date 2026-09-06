import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Icon from "@/components/Icon";
import { getActiveAnnouncement } from "@/lib/announcements";

interface AnnouncementNoticeProps {
  locale: string;
}

// 首頁頂端的公告提示條：只在有「還沒解決」的公告時出現，點了進公告內文
export default async function AnnouncementNotice({ locale }: AnnouncementNoticeProps) {
  const announcement = getActiveAnnouncement(locale);
  if (!announcement) return null;

  const t = await getTranslations("announcements.notice");

  return (
    <aside aria-label={t("label")} className="border-b border-gold/30 bg-gold/5 px-6 py-3 md:px-12">
      <Link
        href={`/${locale}/announcements/${announcement.slug}`}
        className="mx-auto flex max-w-6xl items-center gap-3 text-sm text-text-1 transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <Icon name="Megaphone" size={18} className="shrink-0 text-gold" aria-hidden="true" />
        <span className="shrink-0 font-ui text-xs font-bold uppercase tracking-widest text-gold">
          {t("label")}
        </span>
        <span className="min-w-0 truncate">{announcement.title}</span>
        <span className="ml-auto shrink-0 font-ui text-xs uppercase tracking-widest text-text-3">
          {t("cta")} →
        </span>
      </Link>
    </aside>
  );
}
