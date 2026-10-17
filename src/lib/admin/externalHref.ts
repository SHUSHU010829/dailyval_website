// 申請人填的連結常常沒有 https://（「tiktok.com/@xxx」）。直接當 href 的話，
// 瀏覽器把它當成站內的相對路徑，點下去是 dailyval.com/tiktok.com/@xxx 的 404。

/**
 * 申請人填的一段字 → 可以點的外部網址；不像網址的回 null（畫成純文字）。
 * 只放行 http / https：javascript:、data:、mailto: 之類一律不連。
 */
export function externalHref(raw: string): string | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  let candidate: string;
  if (/^https?:\/\//i.test(text)) candidate = text;
  else if (text.startsWith("//")) candidate = `https:${text}`;
  // 其他 scheme 不連。冒號後面接數字的是 host:port（example.com:8080），不是 scheme。
  else if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text)) return null;
  else candidate = `https://${text}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // 沒有點的不是網域（「@zalenona」會被解析成主機名 zalenona）。
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}
