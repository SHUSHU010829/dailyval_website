## Why

iOS Universal Links 讓使用者點擊 `dailyval.com` 連結時，若裝置已安裝 DailyVal App，直接開啟 App 而非跳至 Safari。這是提升 App 轉換率的標準 iOS 整合，也是 Apple 審核推薦實作。

## What Changes

- 新增 `public/.well-known/apple-app-site-association`（AASA 檔案）：宣告 App ID 與支援的 URL 路徑
- 修改 `next.config.ts`：為 AASA 檔案加入 `Content-Type: application/json` response header（iOS 驗證要求）

## Non-Goals

- 不實作 deep link routing 邏輯（App 端程式碼，屬 App 工程範疇）
- 不實作 Android App Links（另行處理）

## Capabilities

### New Capabilities

- `universal-links`: iOS Universal Links 基礎設施（AASA 檔案 + Content-Type header）

### Modified Capabilities

(none)

## Impact

- 新增：`public/.well-known/apple-app-site-association`
- 修改：`next.config.ts`（新增 headers() 函數）
- 待補：AASA 檔案中的 `TEAM_ID` 與 `BUNDLE_ID`（需在 Apple Developer Console 取得）
