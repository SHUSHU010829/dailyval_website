// OG 圖片共用字型載入與文字處理（edge runtime 專用）

export const ORBITRON_700 =
  "https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1ny_CmBoWg2.ttf";
export const ORBITRON_900 =
  "https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nysimBoWg2.ttf";
export const RAJDHANI_600 =
  "https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pbYF_OreeI.ttf";
export const RAJDHANI_700 =
  "https://fonts.gstatic.com/s/rajdhani/v17/LDI2apCSOBg7S-QT7pa8FvOreeI.ttf";

export type OgFontEntry = {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal" | "italic";
};

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms = 8000
): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(tid)
  );
}

export async function loadTTF(url: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetchWithTimeout(url, { cache: "force-cache" });
    if (!r.ok) return null;
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

export async function loadNotoTC(
  text: string,
  weight: 400 | 700
): Promise<ArrayBuffer | null> {
  try {
    // CSS1 endpoint 固定回傳 TTF，透過 text= 子集化縮小 payload
    const css = await fetchWithTimeout(
      `https://fonts.googleapis.com/css?family=Noto+Sans+TC:${weight}&text=${encodeURIComponent(text)}`,
      { cache: "force-cache" }
    ).then((r) => r.text());
    const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!m) return null;
    return await fetchWithTimeout(m[1], { cache: "force-cache" }).then((r) =>
      r.arrayBuffer()
    );
  } catch {
    return null;
  }
}

export function truncate(s: string, n: number): string {
  if (!s) return s;
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

/**
 * 一次載入 OG 圖所需的所有字型，並組好 ImageResponse fonts 陣列。
 * isZhTW 為 true 時會額外子集化載入 Noto Sans TC。
 */
export async function loadOgFonts({
  isZhTW,
  subsetText,
}: {
  isZhTW: boolean;
  subsetText: string;
}): Promise<OgFontEntry[]> {
  const [orbitron700, orbitron900, rajdhani600, rajdhani700, notoTC400, notoTC700] =
    await Promise.all([
      loadTTF(ORBITRON_700),
      loadTTF(ORBITRON_900),
      loadTTF(RAJDHANI_600),
      loadTTF(RAJDHANI_700),
      isZhTW ? loadNotoTC(subsetText, 400) : Promise.resolve(null),
      isZhTW ? loadNotoTC(subsetText, 700) : Promise.resolve(null),
    ]);

  return [
    orbitron700 && {
      name: "Orbitron",
      data: orbitron700,
      weight: 700 as const,
      style: "normal" as const,
    },
    orbitron900 && {
      name: "Orbitron",
      data: orbitron900,
      weight: 900 as const,
      style: "normal" as const,
    },
    rajdhani600 && {
      name: "Rajdhani",
      data: rajdhani600,
      weight: 600 as const,
      style: "normal" as const,
    },
    rajdhani700 && {
      name: "Rajdhani",
      data: rajdhani700,
      weight: 700 as const,
      style: "normal" as const,
    },
    notoTC400 && {
      name: "NotoSansTC",
      data: notoTC400,
      weight: 400 as const,
      style: "normal" as const,
    },
    notoTC700 && {
      name: "NotoSansTC",
      data: notoTC700,
      weight: 700 as const,
      style: "normal" as const,
    },
  ].filter(Boolean) as OgFontEntry[];
}
