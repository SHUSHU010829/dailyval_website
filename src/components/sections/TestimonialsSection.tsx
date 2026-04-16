import { getTranslations } from "next-intl/server";

/**
 * Testimonials Section（Server Component）
 * - 靜態渲染語錄（Testimonials 靜態資料結構決策）
 * - 無輪播動畫，prefers-reduced-motion: reduce 下保持靜態（spec：testimonials are readable without motion）
 * - 若日後需要輪播，僅在 "use client" 子元件中加 motion-safe: 動畫
 */
export default async function TestimonialsSection() {
  const t = await getTranslations("testimonials");
  const items = t.raw("items") as Array<{
    quote: string;
    author: string;
    rank: string;
  }>;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="border-y border-border-med bg-bg-surface px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="testimonials-heading"
          className="mb-16 text-center font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl"
        >
          {t("title")}
        </h2>

        {/* 靜態語錄網格 — 無 carousel，確保 reduced-motion 完全相容 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item) => (
            <figure
              key={item.author}
              className="cut flex flex-col gap-4 border border-border-med bg-bg-base p-8"
            >
              {/* 引號裝飾 */}
              <span
                className="font-display text-5xl leading-none text-val-red/40"
                aria-hidden="true"
              >
                &ldquo;
              </span>

              <blockquote>
                <p className="text-sm leading-relaxed text-text-2">
                  {item.quote}
                </p>
              </blockquote>

              <figcaption className="mt-auto">
                <p className="font-ui text-sm font-bold uppercase tracking-wider text-text-1">
                  {item.author}
                </p>
                <p className="mt-1 font-ui text-xs uppercase tracking-widest text-val-red">
                  {item.rank}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
