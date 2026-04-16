import { getTranslations } from "next-intl/server";

/**
 * Final CTA Section（Server Component）
 * - 強化轉換行動呼籲
 * - 位置在 SiteFooter 之前
 * - CTA 連結 #waitlist
 */
export default async function FinalCtaSection() {
  const t = await getTranslations("finalCta");

  return (
    <section
      id="waitlist"
      aria-labelledby="final-cta-heading"
      className="relative overflow-hidden px-6 py-32 text-center md:px-12"
    >
      {/* 背景裝飾 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-val-red/10 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-val-red/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl">
        <p
          className="mb-4 font-ui text-xs uppercase tracking-[0.3em] text-val-red"
          aria-hidden="true"
        >
          // JOIN NOW //
        </p>

        <h2
          id="final-cta-heading"
          className="font-display text-4xl font-black uppercase leading-none tracking-tight text-text-1 md:text-6xl"
        >
          {t("headline")}
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-2">
          {t("description")}
        </p>

        <a
          href="#waitlist"
          className="cut mt-10 inline-flex items-center gap-2 bg-val-red px-10 py-5 font-ui text-base font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-red"
        >
          {t("ctaLabel")}
        </a>
      </div>
    </section>
  );
}
