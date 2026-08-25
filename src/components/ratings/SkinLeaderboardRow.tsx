"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import RatingStarsDisplay from "@/components/ratings/RatingStarsDisplay";
import { formatRating } from "@/lib/ratings/format";
import type { LeaderboardItem } from "@/lib/ratings/leaderboard";

// 排行榜單列：名次、造型圖、名稱／武器、稀有度、星等與票數。
// 整列可點，進造型詳情頁。

interface SkinLeaderboardRowProps {
  item: LeaderboardItem;
  rank: number;
  locale: string;
}

export default function SkinLeaderboardRow({ item, rank, locale }: SkinLeaderboardRowProps) {
  const t = useTranslations("ratings.skins");

  return (
    <li>
      <Link
        href={`/${locale}/ratings/skins/${item.id}`}
        className="flex items-center gap-4 px-3 py-4 transition-colors hover:bg-bg-panel-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jett-blue md:gap-6 md:px-4"
      >
        <span className="w-8 shrink-0 text-center font-display text-sm font-bold tabular-nums text-text-3">
          {rank}
        </span>

        {/* 造型圖多為橫幅比例；外部資產（valorant-api CDN）不走 next/image */}
        <div className="flex h-12 w-28 shrink-0 items-center justify-center md:w-36">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="max-h-12 w-auto max-w-full object-contain"
            />
          ) : (
            <div className="h-10 w-full bg-bg-elevated" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm font-bold tracking-wide text-text-1 md:text-base">
            {item.name}
          </p>
          <p className="mt-0.5 flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-text-3">
            {item.tierIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.tierIcon} alt="" loading="lazy" className="h-3.5 w-3.5" />
            )}
            <span className="truncate">{item.weaponName}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <RatingStarsDisplay value={item.averageRating} size={14} />
            <span className="font-display text-base font-black tabular-nums text-text-1">
              {item.ratingCount > 0 ? formatRating(item.averageRating) : "–"}
            </span>
          </div>
          <span className="font-ui text-xs tracking-wide text-text-3">
            {t("ratingCount", { count: item.ratingCount })}
          </span>
        </div>
      </Link>
    </li>
  );
}
