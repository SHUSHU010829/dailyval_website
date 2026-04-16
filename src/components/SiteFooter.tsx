import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Icon from "@/components/Icon";
import LocaleSwitcher from "@/components/LocaleSwitcher";

/**
 * 全域頁尾（Server Component）
 * - Product / Legal 兩組連結
 * - 社群圖示（Discord / Twitter / GitHub）
 * - 動態版權年份
 * - LocaleSwitcher 整合
 * - 響應式：< 768px 單欄，≥ 768px 多欄
 */
export default async function SiteFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  const productLinks = [
    { href: "#features", label: t("productGroup.links.features") },
    { href: "#community", label: t("productGroup.links.community") },
    { href: "#waitlist", label: t("productGroup.links.waitlist") },
  ];

  const legalLinks = [
    { href: "/tos", label: t("legalGroup.links.tos") },
    { href: "/privacy", label: t("legalGroup.links.privacy") },
    { href: "/support", label: t("legalGroup.links.support") },
  ];

  const socialLinks = [
    {
      href: "#",
      icon: "DiscordLogo" as const,
      label: t("social.discord"),
    },
    {
      href: "#",
      icon: "TwitterLogo" as const,
      label: t("social.twitter"),
    },
    {
      href: "#",
      icon: "GithubLogo" as const,
      label: t("social.github"),
    },
  ];

  return (
    <footer className="border-t border-border-med bg-bg-base px-6 py-12 md:px-12">
      {/* 主要內容：多欄網格 */}
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* 品牌欄 */}
          <div className="md:col-span-2">
            <p className="font-display text-lg font-bold uppercase tracking-widest text-val-red">
              DailyVal
            </p>
            <p className="mt-2 text-sm text-text-3">
              {/* 副標文字固定，日後可抽至翻譯鍵 */}
              Your Daily Valorant Companion
            </p>
            {/* 社群圖示 */}
            <div className="mt-4 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-text-3 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
                >
                  <Icon
                    name={social.icon}
                    size={20}
                    weight="bold"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Product 連結組 */}
          <nav aria-label={t("productGroup.title")}>
            <p className="mb-3 font-ui text-xs uppercase tracking-widest text-text-3">
              {t("productGroup.title")}
            </p>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-2 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal 連結組 */}
          <nav aria-label={t("legalGroup.title")}>
            <p className="mb-3 font-ui text-xs uppercase tracking-widest text-text-3">
              {t("legalGroup.title")}
            </p>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-2 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* 底部：版權 + LocaleSwitcher */}
        <div className="mt-10 flex flex-col items-start gap-4 border-t border-border-med pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-text-3">
            {t("copyright", { year })}
          </p>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
