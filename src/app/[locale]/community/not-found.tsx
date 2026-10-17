import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function CommunityNotFound() {
  const t = useTranslations("communityBoard.notFound");

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="font-display text-6xl font-black text-val-red">
        {t("title")}
      </p>
      <p className="mt-2 font-ui text-sm uppercase tracking-widest text-text-2">
        {t("subtitle")}
      </p>
      <Link
        href="/community"
        className="cut-sm mt-8 border border-border-bright bg-bg-elevated px-5 py-2 font-ui text-xs font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red"
      >
        {t("backToBoard")}
      </Link>
    </div>
  );
}
