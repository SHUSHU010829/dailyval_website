## Why

官網累積了幾類「程式碼健康」債務，雖然不影響單一功能的正確性，但持續增加維護成本與部署風險：

- `Icon.tsx` 用 `import * as PhosphorIcons` 動態索引，bundler 無法搖掉未使用的圖示（套件本身含約 1300 個圖示），且此元件是 client component，被 4 個 Server Component 引用，把 client boundary 拖進每一頁
- `package.json` 宣告了 `gsap`、`framer-motion`、`@mdx-js/react`、`@next/mdx` 四個依賴，但全 repo 掃描顯示 0 個 import、0 個 `.mdx` 檔案——這四個依賴是 `project-scaffold` spec 當初為了「MDX 法律頁」構想預先安裝的，但實際的法律頁改用純 TSX 撰寫，這個構想從未實現
- `pnpm-lock.yaml`（實際使用中的 lockfile）被 `.gitignore` 排除、從未進版控，導致不同環境的 `npm install`/`pnpm install` 無法保證安裝到相同版本，這也是最近一次因套件版本問題觸發重建的直接原因
- `README.md` 仍是 `create-next-app` 的預設模板（提到專案未使用的 Geist 字型），且沒有 `.env.example` 記錄 `NEXT_PUBLIC_BASE_URL`、`NEXT_PUBLIC_CREATOR_FORM_ENDPOINT` 這兩個必要環境變數
- `TestimonialsSection.tsx` 是零引用的死元件，還引用了不存在的 `bg-bg-surface` token，對應的 `testimonials` 翻譯 namespace 也是死的
- `WebVitalsReporter` 元件自己的註解都寫著「上線前可直接刪除」，但每頁仍在 production 環境對 console 輸出效能數據
- App Store 網址（7 處）、社群網址（3 處程式碼 + 2 處翻譯檔）、客服信箱（散落於程式碼與翻譯內容）沒有統一來源，任何一次網址變更都要記得改好幾個檔案，容易漏改
- AdSense script 在 root layout 對所有頁面（含法律頁）無條件載入，沒有任何使用者同意機制；網站根目錄也缺少 web 版的 `ads.txt`（只有給 App 用的 `app-ads.txt`）
- 沒有 `typecheck` script、沒有任何測試、沒有 CI，`npm run build` 是目前唯一的自動化驗證手段

這些項目大多是機械式的清理工作（刪依賴、補檔案、抽常數），风险低、但因為分散在很多檔案，適合集中在一個變更裡一次處理乾淨。

## What Changes

- `Icon.tsx`：改成明確的靜態 icon 對照表（`Record<PhosphorIconName, ComponentType>`），只 import 全站實際用到的 23 個圖示（逐一列出），取代 `import *`
- 移除 4 個未使用依賴：`gsap`、`framer-motion`、`@mdx-js/react`、`@next/mdx`（`package.json` 與 lockfile），並移除 `next.config.ts` 內對應的 MDX 設定（`pageExtensions` 的 mdx 項目、`createNextIntlPlugin`/`createMDX` 的 MDX wrapper）
- 把 `pnpm-lock.yaml` 從 `.gitignore` 移除並加入版控（保留 `yarn.lock`／`package-lock.json` 繼續被忽略，因為專案實際使用 pnpm）
- 重寫 `README.md`（正確描述字型、路徑、開發指令），新增 `.env.example` 記錄兩個必要環境變數
- 刪除 `TestimonialsSection.tsx`，以及 `messages/en.json`／`messages/zh-TW.json` 內死掉的 `testimonials` namespace
- `WebVitalsReporter`：只在 `process.env.NODE_ENV !== "production"` 時才輸出 console.log
- 新增 `src/lib/site-config.ts`，集中 `APP_STORE_URL`、`COMMUNITY_URL`、`SUPPORT_EMAIL` 三個常數，取代 7 處 App Store 網址、3 處社群網址的程式碼內字面值；移除 `messages/*.json` 內從未真正被在地化過的 `community.joinUrl`（改直接引用共用常數）
- 新增 `AdConsentGate`：在使用者做出同意/拒絕選擇前不載入 AdSense script；提供簡單的橫幅讓使用者選擇是否同意個人化廣告，選擇結果存在 `localStorage`
- 新增 `public/ads.txt`（`google.com, pub-1773132783019070, DIRECT, f08c47fec0942fa0`）
- `package.json` 新增 `typecheck` script（`tsc --noEmit`）；新增 `.github/workflows/ci.yml`（`install` → `typecheck` → `build`）；引入 Vitest + React Testing Library 作為測試框架，並為新的 `safeRaw()` 工具函式撰寫第一組單元測試，證明測試基礎設施可運作（詳見 Non-Goals：不追求全站測試覆蓋率）

## Non-Goals

- 不追求全站測試覆蓋率：本次只搭建測試基礎設施並為 `safeRaw()` 撰寫示範測試，其餘元件／路由的測試留待未來變更
- AdSense 同意機制不做成完整的 IAB TCF 相容 CMP（Consent Management Platform），僅實作「載入前需使用者明確同意」的最小合規行為；若未來需要更完整的同意框架（如串接 Google Funding Choices），需要 Google AdSense 後台設定，不在此次程式碼變更範圍內
- 不處理低優先項目（`TacticalCursor` stale closure、scroll listener 節流、`globals.css` 重複 keyframes 等）
- 不處理 `dailyval_social`（社群版），該專案不在此 repo 內

## Capabilities

### New Capabilities

- `ad-consent`: AdSense 廣告腳本的載入前同意機制

### Modified Capabilities

- `project-scaffold`：「Required runtime dependencies installed」移除 `gsap`／`framer-motion`／`@next/mdx`／`@mdx-js/react`；「MDX support is wired into Next.js config」整條移除（從未被使用）；新增 typecheck script、CI pipeline、測試框架的 ADDED 需求

## Impact

- Affected specs: `ad-consent`（新增）、`project-scaffold`（修改）
- Affected code:
  - 新增：`src/lib/site-config.ts`、`src/components/AdConsentGate.tsx`、`public/ads.txt`、`.env.example`、`.github/workflows/ci.yml`、`vitest.config.ts`、`src/lib/safe-raw.test.ts`
  - 修改：`src/components/Icon.tsx`、`package.json`、`next.config.ts`、`.gitignore`、`README.md`、`src/components/WebVitalsReporter.tsx`、`src/app/layout.tsx`、`src/components/SiteFooter.tsx`、`src/components/SiteNav.tsx`、`src/components/MobileDownloadBar.tsx`、`src/components/AppStoreQRCode.tsx`、`src/components/sections/FinalCtaSection.tsx`、`src/components/sections/HeroSection.tsx`、`src/components/sections/CommunitySection.tsx`、`src/app/[locale]/page.tsx`、`src/app/[locale]/support/page.tsx`、`messages/en.json`、`messages/zh-TW.json`
  - 刪除：`src/components/sections/TestimonialsSection.tsx`
