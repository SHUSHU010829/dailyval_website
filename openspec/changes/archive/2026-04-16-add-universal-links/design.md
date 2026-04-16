## Context

iOS Universal Links 要求在網域根目錄的 `/.well-known/apple-app-site-association` 提供一個 JSON 檔案，Apple CDN 會在 App 安裝時抓取此檔案驗證。Next.js 的 `public/` 目錄靜態 serve 此路徑，但預設 Content-Type 為 `text/plain`，需額外設定 headers。

## Goals / Non-Goals

**Goals:**
- AASA 檔案結構正確、路徑正確、Content-Type 正確
- next.config.ts headers 設定在 build 時不報錯

**Non-Goals:**
- App 端 deep link routing（屬 iOS 工程範疇）
- Android App Links

## Decisions

### 使用 public/ 靜態檔案而非 App Router Route Handler

**選擇：** 將 AASA 放在 `public/.well-known/apple-app-site-association`，透過 `next.config.ts` headers() 設定正確 Content-Type。

**理由：** 靜態檔案最簡單，不需要額外的 API route。Content-Type 問題只需一行 headers 設定解決。

**替代方案：** App Router route handler（`app/.well-known/apple-app-site-association/route.ts`）。缺點：增加不必要的 server 複雜度，對純靜態 JSON 而言過度設計。

## Risks / Trade-offs

- **TEAM_ID / BUNDLE_ID 為佔位符**：上線前必須替換，否則 Universal Links 不會生效但也不會造成任何錯誤（iOS 只是不跳轉）。已在 tasks.md 以 ⚠️ 標記。
