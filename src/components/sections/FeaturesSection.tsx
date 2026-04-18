import { getTranslations } from "next-intl/server";
import Icon from "@/components/Icon";

type PhosphorIconName = Parameters<typeof Icon>[0]["name"];

type FeatureColor = "val-red" | "jett-blue" | "viper-green" | "omen-purple" | "gold";
type BadgeType = "PREMIUM" | "NEW" | "COMING SOON";

const COLOR_MAP: Record<FeatureColor, { text: string; bg: string; border: string }> = {
  "val-red":     { text: "text-val-red",     bg: "bg-val-red/10",     border: "border-val-red/30" },
  "jett-blue":   { text: "text-jett-blue",   bg: "bg-jett-blue/10",   border: "border-jett-blue/30" },
  "viper-green": { text: "text-viper-green", bg: "bg-viper-green/10", border: "border-viper-green/30" },
  "omen-purple": { text: "text-omen-purple", bg: "bg-omen-purple/10", border: "border-omen-purple/30" },
  "gold":        { text: "text-gold",        bg: "bg-gold/10",        border: "border-gold/30" },
};

const BADGE_MAP: Record<BadgeType, { bg: string; text: string }> = {
  "PREMIUM":     { bg: "bg-omen-purple", text: "text-white" },
  "NEW":         { bg: "bg-viper-green", text: "text-bg-base" },
  "COMING SOON": { bg: "bg-jett-blue",  text: "text-bg-base" },
};

export default async function FeaturesSection() {
  const t = await getTranslations("features");
  const items = t.raw("items") as Array<{
    icon: string;
    color?: string;
    badge?: string;
    title: string;
    description: string;
  }>;

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="features-heading"
          className="mb-16 text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
        >
          {t("title")}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => {
            const color = (item.color as FeatureColor) ?? "val-red";
            const badge = item.badge as BadgeType | undefined;
            const c = COLOR_MAP[color];
            const b = badge ? BADGE_MAP[badge] : null;

            return (
              <div
                key={item.title}
                className="cut group relative flex flex-col gap-4 border border-border-med bg-bg-panel p-6 transition-colors hover:border-val-red/50"
              >
                {/* 標籤 */}
                {b && (
                  <span
                    className={`cut absolute right-3 top-3 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-widest ${b.bg} ${b.text}`}
                  >
                    {badge}
                  </span>
                )}

                {/* Icon */}
                <div className={`flex h-11 w-11 items-center justify-center border ${c.border} ${c.bg} ${c.text}`}>
                  <Icon
                    name={item.icon as PhosphorIconName}
                    size={22}
                    weight="bold"
                    aria-hidden="true"
                  />
                </div>

                {/* 標題 */}
                <h3 className="font-display text-base font-bold uppercase tracking-tight text-text-1">
                  {item.title}
                </h3>

                {/* 描述 */}
                <p className="text-sm leading-relaxed text-text-2">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
