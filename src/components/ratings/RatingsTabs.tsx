"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Skins / Esports 分段導覽。

interface RatingsTabsProps {
  locale: string;
  skinsLabel: string;
  esportsLabel: string;
  comingSoonLabel: string;
}

const ESPORTS_TAB_ENABLED = true;

export default function RatingsTabs({
  locale,
  skinsLabel,
  esportsLabel,
  comingSoonLabel,
}: RatingsTabsProps) {
  const pathname = usePathname();
  const skinsActive = pathname?.includes("/ratings/skins") ?? false;
  const esportsActive = pathname?.includes("/ratings/esports") ?? false;

  const baseClass =
    "cut-sm inline-flex items-center gap-2 px-5 py-2.5 font-ui text-sm font-bold uppercase tracking-widest transition-colors";
  const activeClass = "bg-val-red text-bg-base";
  const idleClass =
    "border border-border-med text-text-2 hover:border-border-bright hover:text-text-1";

  return (
    <nav aria-label={`${skinsLabel} / ${esportsLabel}`} className="flex flex-wrap gap-3">
      <Link
        href={`/${locale}/ratings/skins`}
        aria-current={skinsActive ? "page" : undefined}
        className={`${baseClass} ${skinsActive ? activeClass : idleClass}`}
      >
        {skinsLabel}
      </Link>

      {ESPORTS_TAB_ENABLED ? (
        <Link
          href={`/${locale}/ratings/esports`}
          aria-current={esportsActive ? "page" : undefined}
          className={`${baseClass} ${esportsActive ? activeClass : idleClass}`}
        >
          {esportsLabel}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${baseClass} cursor-not-allowed border border-border-dim text-text-3`}
        >
          {esportsLabel}
          <span className="cut-sm bg-bg-elevated px-2 py-0.5 font-ui text-[10px] tracking-widest text-jett-blue">
            {comingSoonLabel}
          </span>
        </span>
      )}
    </nav>
  );
}
