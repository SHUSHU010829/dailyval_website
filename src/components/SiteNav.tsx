"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "@/components/LocaleSwitcher";

/**
 * 全域導覽列
 * - 桌機（≥ 768px）：橫排連結 + LocaleSwitcher
 * - 行動端（< 768px）：漢堡按鈕展開/收合垂直選單
 * - Escape 鍵收合、展開時 focus 移至第一個連結
 * - 動畫以 motion-safe: variant 控制
 */
export default function SiteNav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 展開時將 focus 移至第一個連結
  useEffect(() => {
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

  // Escape 鍵收合選單
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const navLinks = [
    { href: `/${locale}#features`, label: t("features") },
    { href: `/${locale}#community`, label: t("community") },
    { href: `/${locale}#about`, label: t("about") },
  ];

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="relative flex items-center justify-between px-6 py-4 md:px-12"
    >
      {/* Logo */}
      <Link
        href={`/${locale}`}
        className="font-display text-xl font-bold uppercase tracking-widest text-val-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-val-red"
        aria-label={t("logoAlt")}
      >
        DailyVal
      </Link>

      {/* 桌機導覽連結 */}
      <div className="hidden items-center gap-8 md:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-ui text-sm uppercase tracking-widest text-text-2 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
          >
            {link.label}
          </Link>
        ))}
        <LocaleSwitcher />
      </div>

      {/* 行動端漢堡按鈕 */}
      <button
        className="inline-flex items-center justify-center p-2 text-text-2 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue md:hidden"
        aria-expanded={open ? "true" : "false"}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpen((prev) => !prev)}
      >
        {/* 漢堡 / 關閉圖示 */}
        <span className="sr-only">{open ? t("closeMenu") : t("openMenu")}</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* 行動端展開選單 */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={[
          "absolute left-0 right-0 top-full z-50 flex flex-col gap-1 bg-bg-base px-6 py-4 shadow-lg md:hidden",
          open ? "block" : "hidden",
          // motion-safe: 展開動畫
          "motion-safe:transition-all motion-safe:duration-200",
        ].join(" ")}
        aria-hidden={!open}
      >
        {navLinks.map((link, idx) => (
          <Link
            key={link.href}
            href={link.href}
            ref={idx === 0 ? firstLinkRef : undefined}
            onClick={() => setOpen(false)}
            className="block py-3 font-ui text-base uppercase tracking-widest text-text-2 transition-colors hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue"
          >
            {link.label}
          </Link>
        ))}
        <div className="pt-2">
          <LocaleSwitcher />
        </div>
      </div>
    </nav>
  );
}
