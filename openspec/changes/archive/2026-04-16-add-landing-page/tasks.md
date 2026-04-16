## 1. i18n 翻譯字串

- [x] 1.\1 在 `messages/zh-TW.json` 新增 `nav` 命名空間：logo alt、features/community/about 連結標籤、locale switcher aria-label、hamburger aria-label（「開啟選單」/「關閉選單」）
- [x] 1.\1 在 `messages/en.json` 新增對應的 `nav` 命名空間英文字串
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `hero` 命名空間：headline、subheadline、cta label
- [x] 1.\1 在 `messages/en.json` 新增對應的 `hero` 命名空間英文字串
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `socialProof` 命名空間：至少 3 個 stat 項目（`{ value, label }`），例如「10,000+ 玩家」、「500,000+ 場賽局分析」、「98% 滿意度」
- [x] 1.\1 在 `messages/en.json` 新增對應的 `socialProof` 命名空間英文字串
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `features` 命名空間：section 標題、3 個 item（`{ icon, title, description }`）分別對應賽局分析/角色精通/每日任務（Features Section 三個卡片的資料組織決策：icon 以 Phosphor Icons 名稱字串存於翻譯鍵）
- [x] 1.\1 在 `messages/en.json` 新增對應的 `features` 命名空間英文字串（Features Section 三個卡片的資料組織決策）
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `community` 命名空間：section 標題、描述、joinLabel、joinUrl（暫用 `#`）
- [x] 1.\1 在 `messages/en.json` 新增對應的 `community` 命名空間英文字串
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `testimonials` 命名空間：section 標題、`items` 陣列（至少 3 筆，每筆含 `quote/author/rank`）（Testimonials 靜態資料結構決策）
- [x] 1.\1 在 `messages/en.json` 新增對應的 `testimonials` 命名空間英文字串
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `finalCta` 命名空間：headline、description、ctaLabel
- [x] 1.\1 在 `messages/en.json` 新增對應的 `finalCta` 命名空間英文字串
- [x] 1.\1 在 `messages/zh-TW.json` 新增 `footer` 命名空間：兩組連結清單標題與連結標籤（Product / Legal）、copyright 格式字串、社群連結 aria-label（Discord/Twitter/GitHub）
- [x] 1.\1 在 `messages/en.json` 新增對應的 `footer` 命名空間英文字串

## 2. SiteNav 元件

- [x] 2.\1 建立 `src/components/SiteNav.tsx`（Client Component，`"use client"`），加入 `useState(false)` 管理漢堡選單 open 狀態（SiteNav 客戶端狀態管理決策）
- [x] 2.\1 實作 logo display and home link：`<a href="/{locale}">` 包裹 DailyVal wordmark，確認所有 viewport 下不被裁切
- [x] 2.\1 實作 desktop navigation links：`768px` 以上橫排顯示 Features/Community/About 連結，漢堡按鈕隱藏；連結有 visible focus ring（WCAG AA）
- [x] 2.\1 實作 mobile hamburger menu：`< 768px` 顯示漢堡按鈕，按下展開/收合選單；Escape 鍵收合；展開時 focus 移至第一個連結
- [x] 2.\1 漢堡按鈕加 `aria-expanded` 屬性，依 open 狀態同步為 `"true"` / `"false"`
- [x] 2.\1 整個 `<nav>` 加 `aria-label`（對應翻譯鍵），確保 navigation accessibility 符合 spec
- [x] 2.\1 整合 `LocaleSwitcher` 元件至 SiteNav（locale switcher in navigation），並確認切換後路徑保留
- [x] 2.\1 所有選單展開/收合動畫加 `motion-safe:` Tailwind variant，確保 reduced motion compliance 符合 spec

## 3. SiteFooter 元件

- [x] 3.\1 建立 `src/components/SiteFooter.tsx`（Server Component），使用 `getTranslations('footer')` 取得翻譯
- [x] 3.\1 實作 footer link groups：Product 連結組（Features / Community / Waitlist）和 Legal 連結組（Terms / Privacy / Support），各含 `<nav aria-label>` 或 `<ul>` 清單（footer uses semantic HTML 決策）
- [x] 3.\1 實作 footer social icon links：Discord / Twitter / GitHub，各加 `aria-label` + `target="_blank" rel="noopener noreferrer"`（footer social icon links spec）
- [x] 3.\1 實作 footer copyright notice：`© {new Date().getFullYear()} DailyVal`，year 以 Server Component 動態生成
- [x] 3.\1 整合 `LocaleSwitcher` 元件至 SiteFooter（footer locale switcher spec）
- [x] 3.\1 實作 footer is responsive：`< 768px` 單欄垂直、`≥ 768px` 多欄橫排，以 Tailwind v4 token 實作

## 4. Landing Page Section 元件

- [x] 4.\1 建立 `src/components/sections/HeroSection.tsx`（Server Component），用 `getTranslations('hero')` 取得 headline/subheadline/ctaLabel；CTA 按鈕連結 `#waitlist`；確認 hero section renders with headline and CTA（Section 元件為 Server Components 決策：所有 Section 預設 Server Component，不加 `"use client"`）
- [x] 4.\1 Hero 背景使用 CSS 漸層 + SVG 裝飾，不引入任何 raster 圖片（hero section has decorative background without large images spec，目標 LCP ≤ 1.2s）
- [x] 4.\1 HeroSection 整個以 `<section aria-labelledby="hero-heading">` 包裹，`id="hero-heading"` 加至主標 `<h1>`（landing page sections use landmark roles spec）
- [x] 4.\1 建立 `src/components/sections/SocialProofSection.tsx`（Server Component），用 `getTranslations('socialProof')` 取得 stat 陣列，渲染至少 3 個數字統計（social Proof section displays numeric statistics spec）
- [x] 4.\1 SocialProofSection 以 `<section aria-labelledby>` 包裹（landmark roles spec）
- [x] 4.\1 建立 `src/components/sections/FeaturesSection.tsx`（Server Component），用 `getTranslations('features')` 取得 items 陣列，渲染 3 張 Feature 卡片，各卡片含 `<Icon>` + 標題 + 描述，icon `aria-hidden="true"`（features section has three feature cards spec）
- [x] 4.\1 FeaturesSection 實作 responsive grid：`< 768px` 單欄、`≥ 768px` 2 或 3 欄（features cards are responsive spec）
- [x] 4.\1 FeaturesSection 以 `<section aria-labelledby>` 包裹（landmark roles spec）
- [x] 4.\1 建立 `src/components/sections/CommunitySection.tsx`（Server Component），用 `getTranslations('community')` 取得文字，加入 join 連結（`target="_blank" rel="noopener noreferrer"`，可描述 aria-label）（Community Hub section provides a social call-to-action spec）
- [x] 4.\1 CommunitySection 以 `<section aria-labelledby>` 包裹（landmark roles spec）
- [x] 4.\1 建立 `src/components/sections/TestimonialsSection.tsx`（Server Component），用 `getTranslations('testimonials')` 取得 items 陣列，靜態渲染至少 3 個語錄卡片（含 quote/author/rank）（testimonials section displays player quotes spec）
- [x] 4.\1 TestimonialsSection 在 `prefers-reduced-motion: reduce` 下所有項目靜態顯示，無輪播動畫（testimonials are readable without motion spec）
- [x] 4.\1 TestimonialsSection 以 `<section aria-labelledby>` 包裹（landmark roles spec）
- [x] 4.\1 建立 `src/components/sections/FinalCtaSection.tsx`（Server Component），用 `getTranslations('finalCta')` 取得 headline/description/ctaLabel；CTA 按鈕連結 `#waitlist`（final CTA section reinforces conversion spec）
- [x] 4.\1 FinalCtaSection 以 `<section aria-labelledby>` 包裹，位置在 SiteFooter 之前（landmark roles spec）

## 5. Layout 與頁面整合

- [x] 5.\1 修改 `src/app/[locale]/layout.tsx`：將 `<header>` 內的空 `<nav>` 替換為 `<SiteNav />`（SiteNav 注入位置決策，維持在 NextIntlClientProvider 內部）
- [x] 5.\1 修改 `src/app/[locale]/layout.tsx`：將 `<footer />` 改為 `<SiteFooter />`（app Router directory structure MODIFIED spec）
- [x] 5.\1 修改 `src/app/[locale]/page.tsx`：移除舊有 glitch H1 + 背景 JSX，改為依序渲染 `<HeroSection>`, `<SocialProofSection>`, `<FeaturesSection>`, `<CommunitySection>`, `<TestimonialsSection>`, `<FinalCtaSection>`（home page composes Section components spec）
- [x] 5.\1 確認 `src/app/[locale]/page.tsx` 的 `generateMetadata` 仍正確設定每頁 title / description（維持 SEO 框架）
- [x] 5.\1 執行 `npm run build` 確認編譯無錯誤，所有 Section 元件路徑與 import 正確

## 6. 驗收確認

- [x] 6.\1 驗證 landing page content is fully internationalized：`/zh-TW/` 顯示繁體中文、`/en/` 顯示英文，所有可見文字無硬編碼
- [x] 6.\1 驗證 desktop navigation links：`≥ 768px` 橫排顯示，漢堡按鈕隱藏；Tab 鍵可聚焦，focus ring 可見
- [x] 6.\1 驗證 mobile hamburger menu：`< 768px` 漢堡按鈕可見，點擊展開/收合，Escape 鍵收合，`aria-expanded` 正確
- [x] 6.\1 驗證 features section has three feature cards：三個卡片各有 icon + 標題 + 描述，`< 768px` 單欄、`≥ 768px` 多欄
- [x] 6.\1 驗證 footer link groups、footer social icon links（新分頁 + noopener）、footer copyright notice（當年年份）、footer is responsive
- [x] 6.\1 驗證 Hero LCP：以 Lighthouse 測量 LCP ≤ 1.2s，LCP 元素非大型 raster 圖片
- [x] 6.\1 驗證 testimonials are readable without motion：開啟系統 reduced-motion 設定，TestimonialsSection 無動畫
- [x] 6.\1 驗證 SiteNav is present in layout header / SiteFooter is present in layout footer：檢視頁面 HTML 確認元素存在
