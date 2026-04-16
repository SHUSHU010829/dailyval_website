## Context

`add-foundation` 完成後，`[locale]/layout.tsx` 的 `<header>` / `<footer>` 目前是空的佔位器，`[locale]/page.tsx` 只有一個 glitch H1。本 change 在此骨架上填入真實的導覽、landing page section、頁尾元件。

設計系統 tokens（--val-red, --jett-blue, --bg-base, Orbitron/Rajdhani/Noto Sans TC 字型變數）已於 add-foundation 建立，本 change 直接使用，不重複定義。

**目前狀態**
- `src/app/[locale]/layout.tsx`：`<header>` 內有空 `<nav>`，`<footer>` 為空元素
- `src/app/[locale]/page.tsx`：glitch H1 + circuit-grid 背景
- `messages/*.json`：有 `nav`、`meta`、`pages` 命名空間，尚缺 section 內容

**限制**
- 無後端 / 資料庫：所有數據（統計數字、語錄）為靜態內容，由翻譯檔管理
- Next.js App Router：所有 Section 元件預設為 Server Component；需要瀏覽器 API 的（漢堡選單開關、Testimonial 輪播）才加 `"use client"`
- Tailwind v4：使用 `@theme inline` 中已定義的 token，不寫內聯 `style` 除非絕對必要
- `prefers-reduced-motion`：所有動畫必須受 `motion-safe:` variant 或 `useReducedMotion` hook 控制

## Goals / Non-Goals

**Goals:**

- 完成 SiteNav：Logo + 三個導覽連結 + LocaleSwitcher；行動端漢堡選單展開/收合
- 完成 Landing page 七個 section：Hero / Social Proof / Features / Community / Testimonials / Final CTA（由 `[locale]/page.tsx` 組合）
- 完成 SiteFooter：連結分組 + 社群圖示（Phosphor Icons）+ 版權 + LocaleSwitcher
- 注入真實 SiteNav / SiteFooter 至 `[locale]/layout.tsx`
- 所有文字內容以翻譯字串管理（zh-TW / en）
- WCAG AA 色彩對比、所有互動元素有 aria-label / role、keyboard navigable

**Non-Goals:**

- 使用者帳號 / 登入流程（屬 add-auth change）
- 實際 App 功能資料串接（屬 add-app-features change）
- MDX 法律頁面（屬 add-legal-pages change）
- 動態數據輪播後端（Testimonials 使用靜態陣列）
- 第三方分析腳本注入（GA / Mixpanel）

## Decisions

### SiteNav 客戶端狀態管理

**選擇：** SiteNav 整體為 Client Component（`"use client"`），使用 `useState` 管理漢堡選單 open 狀態。

**理由：** 漢堡選單需要瀏覽器事件，整個 Nav 拉成 Client Component 比拆分 Server/Client 混用更簡單，且 Nav HTML 量小（< 1 KB），對 SSR 影響可接受。

**替代方案：** Server Component Nav + Client 子元件（HamburgerButton）。缺點：需要 context 或 prop drilling 傳遞 open 狀態，增加複雜度。

### Section 元件為 Server Components

**選擇：** 所有 landing page Section 元件預設為 Server Components，不加 `"use client"`。

**理由：** Section 內容為靜態翻譯字串，不需要瀏覽器 API。SSR 提升 LCP 指標，減少 JS bundle 大小。唯一例外：TestimonialsSection 若需要輪播互動，則加 `"use client"` 並在 `motion-safe:` 下執行動畫。

**替代方案：** 全部 Client Components。缺點：不必要的 hydration 成本，影響 Performance 分數。

### Testimonials 靜態資料結構

**選擇：** 語錄資料定義在 `messages/*.json` 的 `testimonials` 陣列中，以 `useTranslations` 或 `getTranslations` 讀取。

**理由：** 無後端；靜態內容與其他翻譯字串統一管理，日後切換語言自動顯示對應語錄。

**資料結構：**
```json
"testimonials": {
  "items": [
    { "quote": "...", "author": "...", "rank": "..." }
  ]
}
```

**替代方案：** TypeScript 常數檔（`/lib/testimonials.ts`）。缺點：無法多語系化。

### SiteNav 注入位置

**選擇：** 在 `[locale]/layout.tsx` 的 `<header>` 內渲染 `<SiteNav />`；不移至 root layout。

**理由：** SiteNav 使用 `useTranslations`，需在 `NextIntlClientProvider` 內部。root layout 在 Provider 外層，無法使用 i18n context。

### Features Section 三個卡片的資料組織

**選擇：** Features 三個卡片（賽局分析、角色精通、每日任務）的標題 / 描述 / icon 名稱定義在 `messages/*.json` 的 `features.items` 陣列，icon 以 Phosphor Icons 名稱字串傳入 `<Icon>` 元件。

**理由：** 統一翻譯管理，避免硬編碼；Phosphor Icons 支援按名稱動態渲染。

## Risks / Trade-offs

- **行動選單 focus trap**：漢堡選單展開時若不處理 focus trap，鍵盤使用者體驗差。→ 緩解：選單展開後將 focus 移至第一個連結，Escape 鍵收合。
- **Testimonials 無真實資料**：靜態語錄在上線初期可能顯得不自然。→ 緩解：使用真實 beta 測試者語錄或 placeholder，標記 TODO 供日後替換。
- **Hero CTA 目標未定**：「立即下載」或「加入等待名單」的目標 URL 尚未確定。→ 緩解：CTA href 設為 `#waitlist`（頁面錨點），日後替換為 App Store URL。
- **LCP 影響**：Hero 背景若使用大圖，可能拖慢 LCP（目前基準 0.8s）。→ 緩解：使用 CSS 漸層 + SVG 裝飾，不引入大型圖片。
