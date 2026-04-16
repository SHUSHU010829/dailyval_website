import { getTranslations } from "next-intl/server";
import Icon from "@/components/Icon";

type PhosphorIconName = Parameters<typeof Icon>[0]["name"];

/**
 * Features Section（Server Component）
 * - 3 張特色卡片：賽局分析 / 角色精通 / 每日任務
 * - icon 名稱從翻譯鍵取得（Features Section 三個卡片的資料組織決策）
 * - 響應式 grid：< 768px 單欄、≥ 768px 3 欄
 * - icon aria-hidden="true"（card title 提供文字標籤）
 */
export default async function FeaturesSection() {
  const t = await getTranslations("features");
  const items = t.raw("items") as Array<{
    icon: string;
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="cut group flex flex-col gap-4 border border-border-med bg-bg-surface p-8 transition-colors hover:border-val-red/50"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center border border-val-red/30 bg-val-red/10 text-val-red">
                <Icon
                  name={item.icon as PhosphorIconName}
                  size={24}
                  weight="bold"
                  aria-hidden="true"
                />
              </div>

              {/* 標題 */}
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-text-1">
                {item.title}
              </h3>

              {/* 描述 */}
              <p className="text-sm leading-relaxed text-text-2">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
