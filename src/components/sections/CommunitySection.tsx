import { getTranslations } from "next-intl/server";
import Icon from "@/components/Icon";

/**
 * Community Hub Section（Server Component）
 * - 社群加入引導
 * - 外部連結 target="_blank" rel="noopener noreferrer"
 * - aria-label 描述性文字
 */
export default async function CommunitySection() {
  const t = await getTranslations("community");

  return (
    <section
      id="community"
      aria-labelledby="community-heading"
      className="relative overflow-hidden px-6 py-24 md:px-12"
    >
      {/* 背景裝飾 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-jett-blue/5 via-transparent to-val-red/5" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* HUD 標籤 */}
        <p
          className="mb-4 font-ui text-xs uppercase tracking-[0.3em] text-jett-blue"
          aria-hidden="true"
        >
          // COMMUNITY //
        </p>

        <h2
          id="community-heading"
          className="font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
        >
          {t("title")}
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-2">
          {t("description")}
        </p>

        <a
          href={t("joinUrl")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("joinLabel")}
          className="cut mt-10 inline-flex items-center gap-3 border border-jett-blue/60 bg-jett-blue/10 px-8 py-4 font-ui text-sm uppercase tracking-widest text-jett-blue transition-all hover:bg-jett-blue/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue"
        >
          <Icon
            name="DiscordLogo"
            size={20}
            weight="bold"
            aria-hidden="true"
          />
          {t("joinLabel")}
        </a>
      </div>
    </section>
  );
}
