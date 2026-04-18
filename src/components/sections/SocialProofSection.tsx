import { getTranslations } from "next-intl/server";
import CountUpNumber from "@/components/CountUpNumber";

export default async function SocialProofSection() {
  const t = await getTranslations("socialProof");
  const raw = t.raw("items");
  const items = Array.isArray(raw) ? (raw as Array<{ value: string; label: string }>) : [];

  return (
    <section
      aria-labelledby="social-proof-heading"
      className="border-y border-border-med bg-bg-panel px-6 py-16 md:px-12"
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
              <CountUpNumber
                value={item.value}
                className="font-display text-2xl font-black text-val-red md:text-5xl"
              />
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
