interface HeroCtaButtonProps {
  label: string;
  href: string;
}

/**
 * Hero CTA 按鈕（Server Component）
 * - Hover：四角 HUD 瞄準框展開、shimmer 掃光、「LOCKED」標籤
 * - 純 CSS group-hover: 驅動，不需要 client-side hover state
 * - 點擊：data-cta 觸發 TacticalCursor hitmarker
 */
export default function HeroCtaButton({ label, href }: HeroCtaButtonProps) {
  return (
    <div className="group relative inline-block">
      {/* 四角瞄準框 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-0.5 -top-0.5 h-3.5 w-3.5 border-l-2 border-t-2 border-val-red opacity-0 transition-all duration-200 group-hover:-left-2 group-hover:-top-2 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 border-r-2 border-t-2 border-val-red opacity-0 transition-all duration-200 group-hover:-right-2 group-hover:-top-2 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 border-b-2 border-l-2 border-val-red opacity-0 transition-all duration-200 group-hover:-bottom-2 group-hover:-left-2 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 border-b-2 border-r-2 border-val-red opacity-0 transition-all duration-200 group-hover:-bottom-2 group-hover:-right-2 group-hover:opacity-100"
      />

      {/* LOCKED 標籤 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-0 translate-y-1 font-ui text-[10px] uppercase tracking-[0.25em] text-val-red opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
      >
        // LOCKED //
      </span>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-cta
        className="cut relative inline-flex overflow-hidden items-center gap-2 bg-val-red px-8 py-4 font-ui text-sm font-bold uppercase tracking-widest text-bg-base transition-all duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-red"
      >
        {/* shimmer 掃光 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-0 group-hover:translate-x-[200%] group-hover:duration-[400ms]"
        />
        {label}
      </a>
    </div>
  );
}
