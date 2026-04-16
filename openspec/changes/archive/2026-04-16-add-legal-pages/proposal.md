## Why

DailyVal 是上架 App Store 的應用程式，依 Apple 審核規範及台灣電商法規，服務條款、隱私政策、幫助中心為必要頁面。`add-landing-page` 完成後，法律頁面的路由佔位符（/tos、/privacy、/support）已存在，本 change 填入真實內容。

## What Changes

- 實作 `[locale]/tos/page.tsx`：中英雙語服務條款（Riot API 第三方授權、App 內購退款、UGC 規範、適用法律）
- 實作 `[locale]/privacy/page.tsx`：中英雙語隱私政策（收集範圍、Riot API 資料使用、刪帳流程）
- 實作 `[locale]/support/page.tsx`：中英雙語幫助中心（真實 FAQ 來自 App Store 用戶回報）
- 新增 `src/components/LegalLayout.tsx`：法律頁面共用排版元件
- 新增 `prose-legal` CSS utilities 至 `globals.css`

## Capabilities

### New Capabilities

- `legal-pages`: 服務條款、隱私政策、幫助中心三頁完整內容，依 locale 自動顯示中英文

### Modified Capabilities

(none)

## Impact

- 修改：`src/app/[locale]/tos/page.tsx`
- 修改：`src/app/[locale]/privacy/page.tsx`
- 修改：`src/app/[locale]/support/page.tsx`
- 新增：`src/components/LegalLayout.tsx`
- 修改：`src/app/globals.css`（新增 `.prose-legal` utility classes）
