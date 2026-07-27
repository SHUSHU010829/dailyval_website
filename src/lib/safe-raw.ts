interface RawTranslator {
  raw: (key: string) => unknown;
}

/**
 * 包裝 t.raw(key)：翻譯 key 缺漏或格式不符時回傳 fallback，
 * 避免整頁 render 因翻譯內容缺漏而直接崩潰
 */
export function safeRaw<T>(t: RawTranslator, key: string, fallback: T): T {
  try {
    const value = t.raw(key);
    return value === undefined ? fallback : (value as T);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[safeRaw] translation key "${key}" is missing or invalid`, error);
    }
    return fallback;
  }
}
