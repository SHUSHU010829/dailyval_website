## Why

DailyVal 官網重建是一個全新的 Next.js 16 + Tailwind v4 + TypeScript 專案，目前 `src/app` 為空。在開始實作 Landing page、法律頁、Universal Links 等業務功能之前，必須先建立可重複使用的基礎設施：i18n 路由、設計系統 tokens、Phosphor Icons 整合、效能與無障礙基線。這些基礎決定後續所有頁面的開發體驗、品牌一致性與品質下限，必須一次到位以避免後續區塊各自為政造成樣式漂移與重工。

## What Changes

- 建立 Next.js App Router 的 `src/app/[locale]` 結構，預設語系 `zh-TW`，支援 `en`
- 整合 `next-intl` 處理 UI 文案翻譯（`/messages/zh-TW.json`、`/messages/en.json`），並設定 `Accept-Language` 自動偵測與手動切換
- 建立設計系統 CSS tokens（配色、border、cut 變數）於全域 stylesheet
- 載入並設定字型 Orbitron / Rajdhani / Noto Sans TC（Google Fonts、`display=swap`、`preconnect`），透過 Tailwind v4 `@theme` 暴露為 utility class
- 建立共用視覺 utilities：`clip-path` 切角、glitch 特效、CRT 掃描線、霓虹 glow、電路板網格背景
- 實作戰術游標（crosshair + 延遲跟隨光點 + Hitmarker pseudo-element），並包裹於 `prefers-reduced-motion: no-preference` 中
- 整合 `@phosphor-icons/react`，統一使用 `bold` / `fill` 風格，建立 `<Icon>` wrapper 組件以便 currentColor 與尺寸標準化
- 設定全域 SEO meta 與 `<html lang>` / `hreflang` 機制，每個語系獨立 `title` / `description` / `og:image`
- 建立 `prefers-reduced-motion` 全站工具（hook + CSS media wrapper），供後續動畫共用
- 設定 Tailwind v4 主題擴充、字型 token、Phosphor 預設色繼承
- 建立基本 `Layout` 與空 placeholder 頁面（Landing、tos、privacy、support），確保路由與翻譯 pipeline 可端到端驗證
- 安裝必要依賴：`next-intl`、`@phosphor-icons/react`、`framer-motion`、`gsap`、`@next/mdx`（為後續 change 預先就位）

## Non-Goals

- **不**實作 Landing page 任何 Section 的視覺與動畫（將於 add-landing-page change 處理）
- **不**撰寫法律頁的 MDX 內容與摘要卡片（將於 add-legal-pages change 處理）
- **不**設定 `apple-app-site-association` 與 Universal Links（將於 add-universal-links change 處理）
- **不**整合分析工具（GA、Vercel Analytics）、A/B testing 或 CMS
- **不**處理素材資產的最終替換；本 change 階段使用 placeholder 圖片與占位翻譯字串

## Capabilities

### New Capabilities

- `project-scaffold`: Next.js App Router 的目錄結構、MDX 與基礎依賴整備、共用 Layout 與 placeholder 頁面
- `i18n-routing`: 雙語路由（zh-TW 預設、en）、`next-intl` 整合、語言偵測與切換、`hreflang` 與 `<html lang>` 設定
- `design-system`: CSS tokens、字型載入、Tailwind v4 主題、視覺 utilities（切角／glitch／掃描線／glow／網格／戰術游標）、Phosphor Icons wrapper
- `performance-a11y`: Lighthouse ≥90 與 LCP/CLS/INP 目標基線、`prefers-reduced-motion` 工具、語意化結構與 WCAG AA 對比規範、SEO meta 框架

### Modified Capabilities

(none — 全新專案)

## Impact

- 影響 specs：`project-scaffold`、`i18n-routing`、`design-system`、`performance-a11y`（四份新建 spec）
- 影響程式碼：
  - `package.json`、`next.config.ts`、`tsconfig.json`、`postcss.config.mjs`
  - `src/app/layout.tsx`、`src/app/[locale]/layout.tsx`、`src/app/[locale]/page.tsx`
  - `src/app/[locale]/{tos,privacy,support}/page.tsx`（placeholder）
  - `src/app/globals.css`（tokens、字型、utilities、戰術游標）
  - `src/i18n/{routing.ts,request.ts}`、`messages/{zh-TW,en}.json`
  - `src/components/{Icon,LocaleSwitcher}.tsx`
  - `src/lib/{useReducedMotion.ts,seo.ts}`
  - `middleware.ts`（next-intl 路由 middleware）
- 影響依賴：新增 `next-intl`、`@phosphor-icons/react`、`framer-motion`、`gsap`、`@next/mdx`、`@mdx-js/react`
- 影響後續 changes：解鎖 `add-landing-page`、`add-legal-pages`、`add-universal-links` 三個後續提案
