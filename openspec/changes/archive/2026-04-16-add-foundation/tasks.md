## 1. 依賴與專案組態

- [x] 1.1 安裝 required runtime dependencies installed 所列套件：`next-intl`、`@phosphor-icons/react`、`framer-motion`、`gsap`、`@next/mdx`、`@mdx-js/react`
- [x] 1.2 更新 `next.config.ts` 完成 MDX support is wired into Next.js config（接上 `@next/mdx`、設定 `pageExtensions`）
- [x] 1.3 確認 `tsconfig.json` 與 `eslint.config.mjs` 對 `.mdx` 與 `src/i18n/*` 路徑正確解析

## 2. i18n 路由與 next-intl

- [x] 2.1 建立 `src/i18n/routing.ts` 定義 supported locales and default（`zh-TW` 預設、`en`）
- [x] 2.2 建立 `src/i18n/request.ts` 載入 `messages/<locale>.json`，支援 translated UI strings via next-intl
- [x] 2.3 建立 `middleware.ts` 處理 locale-prefixed URLs 與 root `/` 重導
- [x] 2.4 建立 `messages/zh-TW.json` 與 `messages/en.json` 初始 namespace（`nav`、`meta`、`common`）
- [x] 2.5 在 `[locale]/layout.tsx` 注入 hreflang and html lang attributes（`<html lang>` 與 `alternates.languages`）
- [x] 2.6 實作 `<LocaleSwitcher>` 元件支援 manual locale switching，並寫入 `NEXT_LOCALE` cookie

## 3. App Router 結構與 placeholder 頁面

- [x] 3.1 建立符合 app router directory structure 的 `src/app/layout.tsx`（HTML shell）與 `src/app/[locale]/layout.tsx`（Provider 與 Nav/Footer slot）
- [x] 3.2 建立 placeholder pages exist for all planned routes：`/[locale]/page.tsx`、`/[locale]/tos/page.tsx`、`/[locale]/privacy/page.tsx`、`/[locale]/support/page.tsx`
- [x] 3.3 確認 `npm run build` 全綠以驗證 scaffold + i18n pipeline 端到端可用

## 4. 設計系統 tokens 與字型

- [x] 4.1 在 `src/app/globals.css` 寫入完整 CSS color tokens（`--bg-*`、`--val-red`、`--jett-blue` 等）
- [x] 4.2 透過 `next/font` 載入 typography stack（Orbitron、Rajdhani、Noto Sans TC），暴露 `font-display`/`font-ui`/`font-body`
- [x] 4.3 在 Tailwind v4 `@theme` 將 color tokens 與字型對應為 utility class

## 5. 視覺 utilities 與戰術游標

- [x] 5.1 建立 visual utilities：cut clip-path、glitch、CRT 掃描線、neon glow、circuit-board grid、diamond divider
- [x] 5.2 實作 tactical cursor（crosshair + 延遲跟隨光點 + Hitmarker），全部包裹於 `prefers-reduced-motion: no-preference`
- [x] 5.3 建立 `<Icon>` 元件作為 phosphor icon wrapper，預設 `weight="bold"` 並繼承 currentColor

## 6. 效能、無障礙與 SEO

- [x] 6.1 實作 `useReducedMotion` hook 完成 reduced-motion utility，並寫一個 demo 元件驗證
- [x] 6.2 建立 `src/lib/seo.ts` 統一 SEO meta framework（`generateMetadata` helper，含 `alternates.languages`）
- [x] 6.3 為 `/[locale]/page.tsx` 與三個法律 placeholder 頁套用 SEO meta framework
- [x] 6.4 驗證 color contrast and semantic HTML：所有 token 組合對 WCAG AA、`<header>/<nav>/<main>/<footer>` 結構就位、icon button 加上 `aria-label`
- [x] 6.5 設定 GSAP 為 `next/dynamic` 或僅在動畫元件局部 import，確保符合 performance budgets（GSAP 不進 root bundle）
- [x] 6.6 在本機跑 Lighthouse desktop 對 `/zh-TW/` 一次，記錄初版 LCP/CLS/INP/Performance 數字作為 baseline
  <!-- Baseline: Performance 74 / LCP 0.8s / CLS 0 / INP 16ms / FCP 580ms / TTFB 371ms -->

## 7. 收尾驗證

- [x] 7.1 執行 `npm run lint` 與 `npm run build` 全綠
- [x] 7.2 手動驗證 `/`→`/zh-TW`、`/`+`Accept-Language: en` → `/en`、`/en/tos` 切換至 `/zh-TW/tos` 三條 i18n 流程
- [x] 7.3 開啟系統 Reduce Motion 設定，確認 glitch/scanline/cursor follower 全部停止
