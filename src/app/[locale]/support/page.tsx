import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { safeRaw } from "@/lib/safe-raw";
import { SUPPORT_EMAIL } from "@/lib/site-config";
import LegalLayout from "@/components/LegalLayout";

interface SupportItem {
  question: string;
  answer: string;
}

interface SupportCategory {
  heading: string;
  items: SupportItem[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.support" });

  return buildMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/support",
  });
}

// 內文含 <email> 標籤的字串一律用 t.rich() 渲染，統一產生 mailto 連結
function renderRich(t: Awaited<ReturnType<typeof getTranslations>>, key: string) {
  return t.rich(key, {
    email: (chunks) => <a href={`mailto:${SUPPORT_EMAIL}`}>{chunks}</a>,
  });
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("support");
  const categories = safeRaw(t, "categories", [] as SupportCategory[]);
  const common = await getTranslations("common");

  return (
    <LegalLayout
      title={t("heading")}
      lastUpdated={t("lastUpdated")}
      backLabel={common("backHome")}
      backHref={`/${locale}`}
    >
      <p>{t("intro")}</p>

      {categories.map((category, categoryIndex) => (
        <div key={category.heading}>
          <h2>{category.heading}</h2>
          {category.items.map((item, itemIndex) => (
            <div key={item.question}>
              <h3>{item.question}</h3>
              <p>{renderRich(t, `categories.${categoryIndex}.items.${itemIndex}.answer`)}</p>
            </div>
          ))}
        </div>
      ))}

      <h2>{t("contact.heading")}</h2>
      <p>{renderRich(t, "contact.body")}</p>
    </LegalLayout>
  );
}
