// PostgREST 的 timestamptz 處理（iOS PostgresTimestamp 的對應）。
// 序列化格式是 ISO-8601 UTC、小數位數不定（如 2026-08-07T12:34:56.78901+00:00）。
// keyset cursor 保留「原始字串」讓分頁精確 round-trip；parse 只給顯示用。

/** 顯示用解析；解不了回 null（絕不丟例外） */
export function parsePostgresTimestamp(raw: string): number | null {
  // JS 的 Date.parse 只吃最多 3 位小數的 ISO 字串可靠；先把小數截到 3 位
  const match = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return null;
  const [, base, fraction, offset] = match;
  const millis = (fraction ?? "").slice(0, 3).padEnd(3, "0");
  const timestamp = Date.parse(`${base}.${millis}${offset}`);
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * cursor 用的查詢字串值。PostgREST 一律以 +00:00 輸出 UTC，但 query
 * string 裡的 `+` 會被 URL-decode 成空白，所以換成等價的 `Z`。
 */
export function timestampQueryValue(raw: string): string {
  return raw.replaceAll("+00:00", "Z");
}
