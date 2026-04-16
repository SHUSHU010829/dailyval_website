import { getTranslations } from "next-intl/server";

/**
 * Social Proof Section（Server Component）
 * - 至少 3 個數字統計
 * - aria-labelledby landmark
 */
export default async function SocialProofSection() {
  const t = await getTranslations("socialProof");

  // next-intl raw 取陣列
  const items = t.raw("items") as Array<{ value: string; label: string }>;

  return (
    <section
      aria-labelledby="social-proof-heading"
      className="border-y border-border-med bg-bg-surface px-6 py-16 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="social-proof-heading"
          className="mb-10 text-center font-ui text-xs uppercase tracking-[0.3em] text-text-3"
        >
          {t("title")}
        </h2>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-display text-4xl font-black text-val-red md:text-5xl">
                {item.value}
              </p>
              <p className="mt-2 font-ui text-xs uppercase tracking-widest text-text-3">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
