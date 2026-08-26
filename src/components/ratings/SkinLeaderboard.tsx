"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";
import HudSelect from "@/components/creators/HudSelect";
import SkinLeaderboardRow from "@/components/ratings/SkinLeaderboardRow";
import {
  DEFAULT_LEADERBOARD_SORT,
  filterAndSortLeaderboard,
  leaderboardPage,
  type LeaderboardItem,
  type LeaderboardSort,
} from "@/lib/ratings/leaderboard";

// 排行榜 client island。
// SSR 先鑲預設排序的第一頁（props），mount 後抓完整清單
// （/api/ratings/leaderboard/[locale]，CDN 快取 300s），之後的排序／
// 搜尋／過濾／載入更多全在瀏覽器端運算，比照 iOS 的體驗。

interface SkinLeaderboardProps {
  locale: string;
  initialItems: LeaderboardItem[];
  initialHasMore: boolean;
  weapons: Array<{ id: string; name: string }>;
}

const SORT_OPTIONS: LeaderboardSort[] = [
  "mostPopular",
  "highestRating",
  "tier",
  "alphabetical",
];

/** 搜尋輸入的防抖（iOS 同為 300ms） */
const SEARCH_DEBOUNCE_MS = 300;

export default function SkinLeaderboard({
  locale,
  initialItems,
  initialHasMore,
  weapons,
}: SkinLeaderboardProps) {
  const t = useTranslations("ratings.skins");

  const [allItems, setAllItems] = useState<LeaderboardItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sort, setSort] = useState<LeaderboardSort>(DEFAULT_LEADERBOARD_SORT);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [weaponId, setWeaponId] = useState<string | null>(null);
  // 分頁進度綁著當下的過濾條件；條件一變 key 就對不上，自動回到第一頁
  const [pageState, setPageState] = useState({ key: "", count: 1 });
  const filterKey = `${sort}|${search}|${weaponId ?? ""}`;
  const pageCount = pageState.key === filterKey ? pageState.count : 1;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ratings/leaderboard/${locale}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((json) => {
        if (!cancelled && Array.isArray(json?.items)) setAllItems(json.items);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isDefaultView =
    sort === DEFAULT_LEADERBOARD_SORT && !search.trim() && !weaponId;

  const page = useMemo(() => {
    if (allItems) {
      const filtered = filterAndSortLeaderboard(allItems, {
        sort,
        search,
        weaponId,
        locale,
      });
      return { ...leaderboardPage(filtered, pageCount), pending: false };
    }
    // 完整清單還沒到：預設狀態直接用 SSR 的第一頁，其他情況先顯示載入中
    if (isDefaultView) {
      return { items: initialItems, hasMore: initialHasMore, pending: false };
    }
    return { items: [], hasMore: false, pending: !loadFailed };
  }, [allItems, sort, search, weaponId, locale, pageCount, isDefaultView, initialItems, initialHasMore, loadFailed]);

  const sortLabels = SORT_OPTIONS.map((option) => t(`sort.${option}`));
  const weaponLabels = [t("allWeapons"), ...weapons.map((weapon) => weapon.name)];

  return (
    <section aria-label={t("listLabel")}>
      {/* 工具列：搜尋＋排序＋武器過濾 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon
            name="MagnifyingGlass"
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-3"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="cut-sm w-full border border-border-med bg-bg-elevated py-3 pl-11 pr-4 text-sm text-text-1 placeholder:text-text-3 transition-colors focus:border-val-red focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:w-[26rem]">
          <HudSelect
            id="skin-sort"
            value={t(`sort.${sort}`)}
            onChange={(label) => {
              const index = sortLabels.indexOf(label);
              if (index >= 0) setSort(SORT_OPTIONS[index]);
            }}
            options={sortLabels}
            placeholder={t(`sort.${DEFAULT_LEADERBOARD_SORT}`)}
          />
          <HudSelect
            id="skin-weapon"
            value={
              weaponId
                ? weapons.find((weapon) => weapon.id === weaponId)?.name ?? t("allWeapons")
                : t("allWeapons")
            }
            onChange={(label) => {
              const weapon = weapons.find((entry) => entry.name === label);
              setWeaponId(weapon?.id ?? null);
            }}
            options={weaponLabels}
            placeholder={t("allWeapons")}
          />
        </div>
      </div>

      {/* 清單 */}
      <div className="mt-6">
        {page.pending ? (
          <p role="status" className="py-16 text-center font-ui text-sm uppercase tracking-widest text-text-3">
            {t("loading")}
          </p>
        ) : loadFailed && page.items.length === 0 ? (
          <p role="alert" className="py-16 text-center font-ui text-sm text-text-2">
            {t("loadFailed")}
          </p>
        ) : page.items.length === 0 ? (
          <p className="py-16 text-center font-ui text-sm text-text-2">{t("empty")}</p>
        ) : (
          <ol className="divide-y divide-border-dim border-y border-border-dim">
            {page.items.map((item, index) => (
              <SkinLeaderboardRow
                key={item.id}
                item={item}
                rank={index + 1}
                locale={locale}
              />
            ))}
          </ol>
        )}
      </div>

      {page.hasMore && !page.pending && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setPageState({ key: filterKey, count: pageCount + 1 })}
            className="cut-sm border border-border-med px-6 py-3 font-ui text-xs font-bold uppercase tracking-widest text-text-2 transition-colors hover:border-border-bright hover:text-text-1"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}
