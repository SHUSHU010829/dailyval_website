// 造型目錄：valorant-api.com 的武器＋稀有度資料（伺服器端抓取）。
// /v1/weapons 的原始回應約 5MB，超過 Next data cache 的 2MB 上限，
// fetch 層快取不了；所以快取放在「映射後的目錄」（約 200KB）這層
// （unstable_cache，一天重驗一次），上游 fetch 直接 no-store。
// 與 iOS 對齊的規則：
// - 免費主題（standard/random）不進排行榜（WeaponSkin.Theme.ID.isFree）
// - 圖片 fallback 鏈比照 AllSkinRatingCell：
//   第一個 chroma 的 fullRender → displayIcon → 造型本身 → 第一個 level

import { unstable_cache } from "next/cache";

const VALORANT_API = "https://valorant-api.com";
const CATALOG_REVALIDATE_SECONDS = 86400;

/** WeaponSkin.Theme.ID.standard / .random（iOS 以此排除免費造型） */
const FREE_THEME_IDS = new Set([
  "5a629df4-4765-0214-bd40-fbb96542941f",
  "0d7a5bfb-4850-098e-1821-d989bbfd58a8",
]);

export interface SkinCatalogEntry {
  /** 造型 UUID（小寫；CloudKit 的 skinID 以此為 key） */
  id: string;
  name: string;
  weaponId: string;
  weaponName: string;
  /** contentTier.rank；沒有稀有度（如刀以外的特例）為 0 */
  tierRank: number;
  tierIcon: string | null;
  tierColor: string | null;
  image: string | null;
}

interface WeaponSkinResponse {
  uuid?: string;
  displayName?: string;
  themeUuid?: string;
  contentTierUuid?: string | null;
  displayIcon?: string | null;
  chromas?: Array<{ fullRender?: string | null; displayIcon?: string | null }>;
  levels?: Array<{ displayIcon?: string | null }>;
}

interface WeaponResponse {
  uuid?: string;
  displayName?: string;
  skins?: WeaponSkinResponse[];
}

interface ContentTierResponse {
  uuid?: string;
  rank?: number;
  highlightColor?: string | null;
  displayIcon?: string | null;
}

/** 網站的兩個語系 → valorant-api 的語言代碼 */
function assetLanguage(locale: string): string {
  return locale === "zh-TW" ? "zh-TW" : "en-US";
}

async function fetchAssetList<T>(path: string, locale: string): Promise<T[]> {
  try {
    // 快取放在映射後的目錄層（見檔頭說明），這裡刻意 no-store
    const res = await fetch(
      `${VALORANT_API}${path}?language=${assetLanguage(locale)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? (json.data as T[]) : [];
  } catch {
    return [];
  }
}

function skinImage(skin: WeaponSkinResponse): string | null {
  const chroma = skin.chromas?.[0];
  return (
    chroma?.fullRender ??
    chroma?.displayIcon ??
    skin.displayIcon ??
    skin.levels?.[0]?.displayIcon ??
    null
  );
}

async function buildSkinCatalog(locale: string): Promise<SkinCatalogEntry[]> {
  const [weapons, tiers] = await Promise.all([
    fetchAssetList<WeaponResponse>("/v1/weapons", locale),
    fetchAssetList<ContentTierResponse>("/v1/contenttiers", locale),
  ]);

  const tiersByID = new Map(
    tiers
      .filter((tier) => typeof tier.uuid === "string")
      .map((tier) => [tier.uuid!.toLowerCase(), tier])
  );

  const entries: SkinCatalogEntry[] = [];
  for (const weapon of weapons) {
    if (!weapon.uuid || !weapon.displayName) continue;
    for (const skin of weapon.skins ?? []) {
      if (!skin.uuid || !skin.displayName) continue;
      const themeID = skin.themeUuid?.toLowerCase() ?? "";
      if (FREE_THEME_IDS.has(themeID)) continue;

      const tier = skin.contentTierUuid
        ? tiersByID.get(skin.contentTierUuid.toLowerCase())
        : undefined;
      entries.push({
        id: skin.uuid.toLowerCase(),
        name: skin.displayName,
        weaponId: weapon.uuid.toLowerCase(),
        weaponName: weapon.displayName,
        tierRank: tier?.rank ?? 0,
        tierIcon: tier?.displayIcon ?? null,
        tierColor: tier?.highlightColor ? `#${tier.highlightColor.slice(0, 6)}` : null,
        image: skinImage(skin),
      });
    }
  }
  // 空目錄一定是上游壞了；丟出去讓 unstable_cache 不要把失敗快取一整天
  if (entries.length === 0) {
    throw new Error("skin catalog upstream unavailable");
  }
  return entries;
}

const cachedSkinCatalog = unstable_cache(buildSkinCatalog, ["skin-catalog"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});

/** 完整目錄（排除免費造型）。上游失敗回空陣列，頁面退化不噴錯。 */
export async function getSkinCatalog(locale: string): Promise<SkinCatalogEntry[]> {
  try {
    return await cachedSkinCatalog(locale);
  } catch {
    return [];
  }
}

export async function getSkinById(
  locale: string,
  skinId: string
): Promise<SkinCatalogEntry | null> {
  const catalog = await getSkinCatalog(locale);
  const normalized = skinId.toLowerCase();
  return catalog.find((entry) => entry.id === normalized) ?? null;
}
