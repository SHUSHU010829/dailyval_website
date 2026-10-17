// 牌位圖示。tier 是 Valorant competitive tier 編號：
// 0 = Unranked，3–27 = Iron 1 到 Radiant（1、2 是舊資料的保留值，沒有圖）。

const COMPETITIVE_TIERS_UUID = "03621f52-342b-cf4e-4f86-9350a49c6d04";

export function rankIconURL(tier: number | null | undefined): string | null {
  if (tier === null || tier === undefined || !Number.isInteger(tier)) {
    return null;
  }
  if (tier !== 0 && (tier < 3 || tier > 27)) return null;
  return `https://media.valorant-api.com/competitivetiers/${COMPETITIVE_TIERS_UUID}/${tier}/smallicon.png`;
}
