import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import Icon from "@/components/Icon";
import CreatorApplicationForm from "@/components/creators/CreatorApplicationForm";
import { safeRaw } from "@/lib/safe-raw";

type PhosphorIconName = Parameters<typeof Icon>[0]["name"];

type TierColor = "viper-green" | "jett-blue" | "gold";

// 等級卡片配色（沿用 FeaturesSection 的 COLOR_MAP 模式）
const TIER_COLOR_MAP: Record<TierColor, { text: string; bg: string; border: string; cardBorder: string }> = {
  "viper-green": { text: "text-viper-green", bg: "bg-viper-green/10", border: "border-viper-green/30", cardBorder: "hover:border-viper-green/50" },
  "jett-blue":   { text: "text-jett-blue",   bg: "bg-jett-blue/10",   border: "border-jett-blue/30",   cardBorder: "hover:border-jett-blue/50" },
  "gold":        { text: "text-gold",        bg: "bg-gold/10",        border: "border-gold/30",        cardBorder: "hover:border-gold/50" },
};

interface Tier {
  icon: string;
  color: string;
  step: string;
  name: string;
  subtitle: string;
  price: string;
  slots: string;
  requirements: string[];
  rewards: string[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.creators" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/creators",
  });
}

export default async function CreatorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("creators");
  const stats = safeRaw(t, "hero.stats", [] as Array<{ value: string; label: string }>);
  const tiers = safeRaw(t, "tiers.items", [] as Tier[]);
  const steps = safeRaw(t, "how.steps", [] as Array<{ icon: string; title: string; description: string }>);
  const bonusRows = safeRaw(t, "bonus.rows", [] as Array<{ views: string; bonus: string }>);
  // 只顯示已填入 igCode（Instagram 貼文代碼）的影片；全部為空時整個區塊隱藏
  const exampleVideos = safeRaw(
    t,
    "examples.videos",
    [] as Array<{ igCode: string; caption: string }>
  ).filter((video) => video.igCode);
  const faqItems = safeRaw(t, "faq.items", [] as Array<{ q: string; a: string }>);

  // FAQPage JSON-LD：內容直接對應下方已渲染的 faqItems，不新增未展示的問答
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── Hero ── */}
      <section
        aria-labelledby="creators-hero-heading"
        className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center md:px-12"
      >
        {/* 背景：漸層 + 光暈（沿用首頁 Hero 手法） */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base via-[#0f0a10] to-bg-base" />
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-val-red/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-jett-blue/10 blur-3xl" />
        </div>

        <div className="relative max-w-4xl">
          <p className="mb-4 font-ui text-xs uppercase tracking-[0.3em] text-val-red" aria-hidden="true">
            {"// CREATOR PROGRAM //"}
          </p>

          <h1
            id="creators-hero-heading"
            data-text={t("hero.headline")}
            className="glitch font-display text-balance text-4xl font-black uppercase leading-none tracking-tight text-text-1 sm:text-5xl lg:text-6xl"
          >
            {t("hero.headline")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-2">
            {t("hero.subheadline")}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#apply"
              className="cut bg-val-red px-8 py-4 font-ui text-base font-bold uppercase tracking-widest text-bg-base transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-red"
            >
              {t("hero.ctaApply")}
            </a>
            <a
              href="#tiers"
              className="cut border border-border-bright px-8 py-4 font-ui text-base font-bold uppercase tracking-widest text-text-1 transition-colors hover:border-val-red/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jett-blue"
            >
              {t("hero.ctaTiers")}
            </a>
          </div>

          {/* 數據列 */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-black text-text-1">{stat.value}</p>
                <p className="mt-1 font-ui text-xs uppercase tracking-widest text-text-3">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-val-red/40 to-transparent"
          aria-hidden="true"
        />
      </section>

      {/* ── 合作等級 ── */}
      <section id="tiers" aria-labelledby="tiers-heading" className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <h2
            id="tiers-heading"
            className="text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
          >
            {t("tiers.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-text-2">
            {t("tiers.subtitle")}
          </p>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {tiers.map((tier) => {
              const c = TIER_COLOR_MAP[(tier.color as TierColor) ?? "viper-green"];
              return (
                <div
                  key={tier.name}
                  className={`cut flex flex-col gap-5 border border-border-med bg-bg-panel p-7 transition-colors ${c.cardBorder}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center border ${c.border} ${c.bg} ${c.text}`}>
                      <Icon name={tier.icon as PhosphorIconName} size={22} weight="bold" aria-hidden="true" />
                    </div>
                    <span className={`font-display text-[10px] font-bold uppercase tracking-widest ${c.text}`}>
                      {tier.step}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-text-1">
                      {tier.name}
                    </h3>
                    <p className="mt-1 font-ui text-xs uppercase tracking-widest text-text-3">{tier.subtitle}</p>
                  </div>

                  <div>
                    <p className={`font-display text-lg font-bold ${c.text}`}>{tier.price}</p>
                    <p className="mt-1 font-ui text-xs uppercase tracking-widest text-text-3">{tier.slots}</p>
                  </div>

                  <div>
                    <p className="mb-2 font-ui text-xs font-bold uppercase tracking-widest text-text-2">
                      {t("tiers.requirementsLabel")}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {tier.requirements.map((req) => (
                        <li key={req} className="flex gap-2 text-sm leading-relaxed text-text-2">
                          <span className={`${c.text} shrink-0`} aria-hidden="true">—</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-2 font-ui text-xs font-bold uppercase tracking-widest text-text-2">
                      {t("tiers.rewardsLabel")}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {tier.rewards.map((reward) => (
                        <li key={reward} className="flex gap-2 text-sm leading-relaxed text-text-2">
                          <span className={`${c.text} shrink-0`} aria-hidden="true">＋</span>
                          {reward}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 正式合約承諾 */}
          <div className="mt-8 flex items-center justify-center gap-3 border border-border-med bg-bg-panel px-6 py-4">
            <span className="text-jett-blue">
              <Icon name="FileText" size={20} weight="bold" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-text-2">{t("tiers.promotionNote")}</p>
          </div>
        </div>
      </section>

      {/* ── 運作方式 ── */}
      <section aria-labelledby="how-heading" className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <h2
            id="how-heading"
            className="mb-14 text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
          >
            {t("how.title")}
          </h2>

          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="cut flex flex-col gap-4 border border-border-med bg-bg-panel p-6">
                <div className="flex items-center justify-between">
                  <span className="text-val-red">
                    <Icon name={step.icon as PhosphorIconName} size={22} weight="bold" aria-hidden="true" />
                  </span>
                  <span className="font-display text-2xl font-black text-text-3" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold uppercase tracking-tight text-text-1">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-2">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 觀看數獎金 ── */}
      <section aria-labelledby="bonus-heading" className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl">
          <h2
            id="bonus-heading"
            className="text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
          >
            {t("bonus.title")}
          </h2>
          <p className="mt-4 text-center text-base leading-relaxed text-text-2">{t("bonus.subtitle")}</p>

          <div className="cut mt-10 overflow-hidden border border-border-med bg-bg-panel">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-med">
                  <th scope="col" className="px-6 py-4 text-left font-ui text-xs font-bold uppercase tracking-widest text-text-2">
                    {t("bonus.viewsLabel")}
                  </th>
                  <th scope="col" className="px-6 py-4 text-right font-ui text-xs font-bold uppercase tracking-widest text-text-2">
                    {t("bonus.bonusLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bonusRows.map((row) => (
                  <tr key={row.views} className="border-b border-border-dim last:border-b-0">
                    <td className="px-6 py-4 font-display text-lg font-bold text-text-1">{row.views}</td>
                    <td className="px-6 py-4 text-right font-display text-lg font-bold text-gold">{row.bonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center font-ui text-xs tracking-wider text-text-3">{t("bonus.note")}</p>
        </div>
      </section>

      {/* ── 影片舉例（橘毛合作 IG Reels；igCode 填入 messages 後才顯示） ── */}
      {exampleVideos.length > 0 && (
        <section aria-labelledby="examples-heading" className="px-6 py-24 md:px-12">
          <div className="mx-auto max-w-6xl">
            <h2
              id="examples-heading"
              className="text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
            >
              {t("examples.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-text-2">
              {t("examples.subtitle")}
            </p>

            <div className="mt-14 flex flex-wrap items-start justify-center gap-6">
              {exampleVideos.map((video) => (
                <a
                  key={video.igCode}
                  href={`https://www.instagram.com/p/${video.igCode}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cut group block w-full max-w-[320px] overflow-hidden border border-border-med bg-bg-panel transition-colors hover:border-val-red/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-val-red"
                >
                  {/* IG embed 裁切視窗：只露出媒體區，蓋掉 IG 自己的白色 header 與底部互動列，
                      改用下方自訂的 HUD 風格 caption + CTA。裁切像素值是估算，IG 若調整
                      embed markup 需要重新微調 -mt 與視窗高度 */}
                  <div className="relative h-[420px] overflow-hidden bg-black">
                    <iframe
                      src={`https://www.instagram.com/p/${video.igCode}/embed/`}
                      title={video.caption}
                      allow="encrypted-media; picture-in-picture"
                      loading="lazy"
                      scrolling="no"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-16 left-0 h-[700px] w-full border-0"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border-med px-4 py-3">
                    <span className="font-ui text-xs uppercase tracking-widest text-text-2">
                      {video.caption}
                    </span>
                    <Icon
                      name="ArrowSquareOut"
                      size={16}
                      weight="bold"
                      className="shrink-0 text-jett-blue transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section aria-labelledby="faq-heading" className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <h2
            id="faq-heading"
            className="mb-14 text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
          >
            {t("faq.title")}
          </h2>

          <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.q} className="cut border border-border-med bg-bg-panel p-6">
                <dt className="font-display text-base font-bold tracking-tight text-text-1">{item.q}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-text-2">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 申請表單 ── */}
      <section id="apply" aria-labelledby="apply-heading" className="relative px-6 py-24 md:px-12">
        {/* 底部紅色漸層，呼應首頁 FinalCta */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-t from-val-red/10 via-transparent to-transparent" />
        </div>

        <div className="mx-auto max-w-3xl">
          <h2
            id="apply-heading"
            className="text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
          >
            {t("form.title")}
          </h2>
          <p className="mt-4 text-center text-base leading-relaxed text-text-2">{t("form.subtitle")}</p>

          <div className="mt-12">
            <CreatorApplicationForm />
          </div>
        </div>
      </section>
    </>
  );
}
