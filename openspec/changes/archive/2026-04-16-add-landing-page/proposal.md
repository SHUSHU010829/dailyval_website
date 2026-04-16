## Why

DailyVal 目前只有骨架頁面（glitch H1 + 佔位背景），缺乏足以吸引 Valorant 玩家的完整首頁內容，導致訪客無法理解產品價值主張並轉換。Landing page 是使用者的第一個接觸點，直接影響轉換率與品牌印象。

## What Changes

- 新增全域導覽列（`SiteNav`）：Logo、導覽連結、語系切換，桌機橫排 / 行動端漢堡選單
- 新增 Hero 區塊（`HeroSection`）：主標、副標、主要 CTA 按鈕、裝飾動畫
- 新增 Social Proof 區塊（`SocialProofSection`）：數字統計（玩家數、賽局分析數等）
- 新增 Features 區塊（`FeaturesSection`）：三個特色卡片（3a 賽局分析 / 3b 角色精通 / 3c 每日任務）
- 新增 Community Hub 區塊（`CommunitySection`）：社群加入引導、嵌入式媒體預覽
- 新增 Testimonials 區塊（`TestimonialsSection`）：玩家語錄輪播
- 新增 Final CTA 區塊（`FinalCtaSection`）：強化轉換的行動呼籲區
- 新增全域頁尾（`SiteFooter`）：連結清單、版權、社群圖示、語系切換
- 將現有 `[locale]/layout.tsx` 中的 `<header>` / `<footer>` 佔位器替換為實際元件
- 現有 `[locale]/page.tsx` 改以組合各 Section 元件為主

## Capabilities

### New Capabilities

- `site-navigation`: 全域導覽列（Logo、連結、語系切換、行動選單）
- `landing-page`: Landing page 完整頁面（Hero + Social Proof + Features + Community + Testimonials + Final CTA）
- `site-footer`: 全域頁尾（連結、社群圖示、版權、語系）

### Modified Capabilities

- `project-scaffold`: `[locale]/layout.tsx` 注入真實 Nav / Footer 元件，`[locale]/page.tsx` 改為 Section 組合頁

## Impact

- 新增元件：`src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx`
- 新增 Section 元件：`src/components/sections/HeroSection.tsx`, `SocialProofSection.tsx`, `FeaturesSection.tsx`, `CommunitySection.tsx`, `TestimonialsSection.tsx`, `FinalCtaSection.tsx`
- 修改：`src/app/[locale]/layout.tsx`（注入 SiteNav / SiteFooter）
- 修改：`src/app/[locale]/page.tsx`（組合 Section 元件）
- 修改：`messages/zh-TW.json`, `messages/en.json`（新增翻譯字串）
- 相依：design-system tokens（已完成於 add-foundation）
