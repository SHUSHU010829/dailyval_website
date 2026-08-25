// CloudKit 伺服器端設定。
// 變數名稱沿用 dailyval_social，方便在 Vercel 上共用同一組值。
// API token 只能在伺服器端使用（SSR 匿名讀取）；瀏覽器端的
// CloudKit JS 設定由 /api/cloudkit-config 提供（PR 3 加入）。

export const CLOUDKIT_CONFIG = {
  containerId: process.env.APPLE_CK_CONTAINER_ID ?? "",
  apiToken: process.env.APPLE_CK_API_TOKEN ?? "",
  environment: process.env.APPLE_CK_ENVIRONMENT ?? "production",
} as const;

/** 未設定時所有讀取回空結果，頁面退化成「無評分資料」而非 500 */
export function isCloudKitConfigured(): boolean {
  return Boolean(CLOUDKIT_CONFIG.containerId && CLOUDKIT_CONFIG.apiToken);
}
