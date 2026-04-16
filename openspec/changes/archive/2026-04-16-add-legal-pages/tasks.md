## 1. 共用元件與樣式

- [x] 1.1 建立 `src/components/LegalLayout.tsx`：接受 title、lastUpdated、backLabel、backHref、children props，渲染返回連結、h1、metadata 行、.prose-legal 內容區
- [x] 1.2 在 `src/app/globals.css` 新增 `.prose-legal` utility classes：h2（Orbitron 字型、uppercase）、h3（Rajdhani）、p（0.9375rem / 1.75）、ul li（val-red 破折號前綴）、a（jett-blue）、strong（text-1）

## 2. 服務條款頁面

- [x] 2.1 修改 `src/app/[locale]/tos/page.tsx`：移除佔位符，引入 LegalLayout，依 locale 渲染中文或英文 TOS 內容
- [x] 2.2 TOS 中文版涵蓋：服務說明、帳號資格（13 歲）、Riot Games API 第三方條款、App 內購（Apple 退款政策）、UGC 規範（禁止項目）、知識產權、免責聲明、台灣法律管轄、聯絡信箱
- [x] 2.3 TOS 英文版涵蓋相同主題，文字與中文版一一對應
- [x] 2.4 驗證：`/zh-TW/tos` 顯示繁中、`/en/tos` 顯示英文，標題與 meta 正確，返回連結指向 `/${locale}`

## 3. 隱私政策頁面

- [x] 3.1 修改 `src/app/[locale]/privacy/page.tsx`：移除佔位符，引入 LegalLayout，依 locale 渲染隱私政策
- [x] 3.2 隱私政策涵蓋：主動提供資料（Riot ID、社群貼文）、自動收集（遊戲資料、使用統計）、資料使用方式、第三方分享（Riot/Apple/分析服務商）、資料保留（30 天刪帳）、兒童隱私（13 歲）、用戶權利、聯絡信箱
- [x] 3.3 驗證：`/zh-TW/privacy` 顯示繁中、`/en/privacy` 顯示英文，`support@dailyval.com` mailto 連結存在

## 4. 幫助中心頁面

- [x] 4.1 修改 `src/app/[locale]/support/page.tsx`：移除佔位符，引入 LegalLayout，依 locale 渲染 FAQ
- [x] 4.2 FAQ 涵蓋：登出問題（Riot token 過期）、Riot 帳號綁定、商城資料不符、推播通知設定、戰績延遲、查詢他人戰績、App 內購未生效、刪除帳號、Bug 回報
- [x] 4.3 驗證：`/zh-TW/support` 顯示繁中、`/en/support` 顯示英文，`support@dailyval.com` 聯絡連結存在

## 5. 編譯驗證

- [x] 5.1 執行 `npm run build` 確認三頁皆正確生成，無 TypeScript 錯誤
