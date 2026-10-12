// 牌階名稱，給讀屏用（圖示的 alt）。跟 rankIconURL 同一套牌階表（03621f52…），
// 名稱取自 valorant-api.com 的 competitivetiers（zh-TW 是遊戲內的官方譯名）。
// 1、2 是沒用到的格子；超過 27 的是之後的新牌階，沒有名字就不說。

const DIVISIONS = {
  en: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal"],
  "zh-TW": ["鐵牌", "銅牌", "銀牌", "金牌", "白金", "鑽石", "超凡入聖", "神話"],
} as const;
const EDGES = {
  en: { unranked: "Unranked", radiant: "Radiant" },
  "zh-TW": { unranked: "牌階未定", radiant: "輻能戰魂" },
} as const;

export function tierName(tier: number | null, locale: string): string | null {
  if (tier === null || !Number.isInteger(tier)) return null;
  const lang = locale === "zh-TW" ? "zh-TW" : "en";
  if (tier === 0) return EDGES[lang].unranked;
  if (tier === 27) return EDGES[lang].radiant;
  if (tier < 3 || tier > 26) return null;
  const division = DIVISIONS[lang][Math.floor((tier - 3) / 3)];
  const step = ((tier - 3) % 3) + 1;
  return lang === "zh-TW" ? `${division}${step}` : `${division} ${step}`;
}
