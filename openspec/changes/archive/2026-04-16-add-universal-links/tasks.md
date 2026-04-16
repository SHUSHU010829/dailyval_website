## 1. AASA 檔案

- [x] 1.1 建立 `public/.well-known/apple-app-site-association`，包含 `applinks.details[].appIDs`（格式：`TEAM_ID.BUNDLE_ID`）、wildcard path component (`/*`)、`webcredentials.apps` 欄位
- [x] 1.2 ⚠️ 待補：將 `TEAM_ID` 替換為 Apple Developer Console 中的 10 碼 Team ID，將 `BUNDLE_ID` 替換為 App 的 Bundle Identifier（可在 Apple Developer Console → Identifiers 找到）

## 2. Next.js Content-Type Header

- [x] 2.1 修改 `next.config.ts`：新增 `headers()` async 函數，對 `/.well-known/apple-app-site-association` 路徑回傳 `Content-Type: application/json` header
- [x] 2.2 驗證：執行 `npm run build` 確認編譯成功，headers 設定無語法錯誤

## 3. 驗收確認

- [x] 3.1 `public/.well-known/apple-app-site-association` 為合法 JSON 格式
- [x] 3.2 `next.config.ts` headers() 函數已正確加入
- [ ] 3.3 ⚠️ 上線後驗證：前往 `https://dailyval.com/.well-known/apple-app-site-association` 確認 HTTP 200 且 Content-Type 為 application/json
- [ ] 3.4 ⚠️ 補上 TEAM_ID / BUNDLE_ID 後，使用 Apple 官方工具驗證：https://branch.io/resources/aasa-validator/
