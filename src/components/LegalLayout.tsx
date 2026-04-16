import Link from "next/link";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
  backLabel: string;
  backHref: string;
}

/**
 * 法律頁面共用版型
 * - 統一標題、更新日期、散文排版
 * - prose 樣式以 Tailwind v4 token 覆寫
 */
export default function LegalLayout({
  title,
  lastUpdated,
  children,
  backLabel,
  backHref,
}: LegalLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
      {/* 返回連結 */}
      <Link
        href={backHref}
        className="mb-8 inline-flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3 transition-colors hover:text-text-1"
      >
        ← {backLabel}
      </Link>

      {/* 標題區 */}
      <header className="mb-10 border-b border-border-med pb-8">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-text-1 md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 font-ui text-xs uppercase tracking-widest text-text-3">
          {lastUpdated}
        </p>
      </header>

      {/* 散文內容 */}
      <div className="prose-legal">{children}</div>
    </div>
  );
}
