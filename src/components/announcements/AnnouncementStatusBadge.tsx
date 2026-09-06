import type { AnnouncementStatus } from "@/lib/announcements";

// 狀態顏色：調查中＝紅、修好等更新＝金、已解決＝綠
const STATUS_STYLE: Record<AnnouncementStatus, string> = {
  investigating: "border-val-red/50 text-val-red",
  fixPending: "border-gold/50 text-gold",
  resolved: "border-viper-green/50 text-viper-green",
};

interface AnnouncementStatusBadgeProps {
  status: AnnouncementStatus;
  label: string;
}

export default function AnnouncementStatusBadge({ status, label }: AnnouncementStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-ui text-xs font-bold uppercase tracking-widest ${STATUS_STYLE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
