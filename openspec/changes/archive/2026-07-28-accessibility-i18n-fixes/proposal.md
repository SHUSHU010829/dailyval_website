## Why

官網目前有多個無障礙與 i18n 缺陷，部分已違反 `performance-a11y`／`design-system` 兩個既有 spec 已明訂的規範：

- `globals.css` 對所有元素套用 `cursor: none !important`，但 `TacticalCursor.tsx` 在 `prefers-reduced-motion: reduce` 時不會掛載自訂游標——這代表偏好減少動態的使用者（以及 JS 尚未載入完成時的所有使用者）會完全看不到任何游標
- `--text-3` token（`rgba(234,234,240,0.3)`）疊在 `--bg-base`（`#0a0a0f`）上實測約 2.3:1，且站上全是以 `text-xs`／`text-[10px]` 等小字級使用，遠低於 `performance-a11y` spec 已要求的「body text ≥ 4.5:1」；白字疊在 `bg-val-red` 上約 3.35:1，7 個主要 CTA 按鈕全部中招，同樣不符規範
- `tos`、`privacy`、`support` 三個頁面繞過 next-intl：`support/page.tsx` 用 100 行的 `isZh ? (...) : (...)` 三元式（雙語內容其實都已經寫好，只是沒有走 i18n 架構）；`AppStoreQRCode.tsx`、`CommunitySection.tsx` 的部分文字/預覽貼文內容是寫死中文，會出現在 `/en`——這些都直接牴觸 `performance-a11y` spec 已明訂的「inline hard-coded English/非當前語系文字 in 非該語系頁面 is forbidden」
- 多處 `t.raw()` 呼叫（`FeaturesSection`、`CreatorApplicationForm` 7 處、`creators/page.tsx` 6 處）直接 `as` 轉型，翻譯 key 缺漏或格式錯誤時會直接讓整頁 render 拋錯，而非優雅降級
- 缺少 skip-to-content 連結；`CreatorApplicationForm` 的表單成功/錯誤狀態沒有 `role="alert"`／`aria-live`，螢幕閱讀器使用者不會被告知結果；語言／平台複選 chips（`role="checkbox"`）沒有 `focus-visible` 樣式；手機版 `MobileDownloadBar` 為 `fixed bottom-0`，出現時會蓋住頁尾內容
- `/creators` 表單的 5 個 `<select>` 與同意條款 checkbox 目前是原生瀏覽器外觀，與站上其餘全面走 HUD 設計語言（切角、深色、品牌紅）的元件風格不一致

這些都是使用者可直接感知的問題（視覺可用性、螢幕閱讀器可用性、跨語系內容正確性），且部分已是既有 spec 要求但實作未達標的落差，優先度高。

## What Changes

- `globals.css`：`cursor: none !important` 改為包在 `@media (prefers-reduced-motion: no-preference) and (pointer: fine)` 內
- 對比度修正（使 `--text-1`／`--text-3`／CTA 文字符合 `performance-a11y` 既有的 WCAG AA 要求）：
  - `--text-3` 由 `rgba(234,234,240,0.3)` 調整為 `rgba(234,234,240,0.5)`（`globals.css` 與 `dailyval-project-spec.md` 的色票表同步更新，實測對比度 4.63:1）
  - 7 個 `bg-val-red` 實心背景的主要 CTA 按鈕，文字色由 `text-white` 改為 `text-bg-base`（沿用站上綠／藍徽章已使用的既有慣例，對比度 5.89:1）
- i18n 缺口修正：
  - `support/page.tsx`：把現有的中／英文內容移入 `messages/en.json`／`messages/zh-TW.json`，改用 `t.raw()`（透過新的安全包裝函式）渲染
  - `AppStoreQRCode.tsx`：「掃碼下載」改為翻譯 key
  - `CommunitySection.tsx`：`PREVIEW_POSTS` 三則預覽貼文與「查看更多 →」改為翻譯內容（新增對應的英文版預覽貼文文案）
  - `tos.tsx`／`privacy.tsx`：**不新增法律內容翻譯**（見 Non-Goals）。改為修正周邊架構：`backLabel` 改用既有的 `common.backHome` 翻譯 key（原本寫死 "Back to Home"）；當 `locale !== "en"` 時，於內文最上方顯示一段翻譯過的提示（新 key `legal.englishOnlyNotice`），明確告知使用者本頁尚無中文版、以下為官方英文內容，避免使用者誤以為是翻譯遺漏的 bug
- 新增 `src/lib/safe-raw.ts`：包裝 `t.raw(key)`，缺漏或型別不符時回傳呼叫端提供的 fallback 並記錄開發期警告，取代未防護的 `as` 轉型；套用到 `FeaturesSection.tsx`、`CreatorApplicationForm.tsx`（7 處）、`creators/page.tsx`（6 處）
- 無障礙補強：
  - 新增 skip-to-content 連結（`[locale]/layout.tsx`），指向加上 `id="main-content"` 的 `<main>`
  - `CreatorApplicationForm.tsx` 的成功／錯誤狀態區塊加上 `role="alert"`
  - 語言／平台複選 chips 加上 `focus-visible` 樣式
  - `<main>` 在行動裝置寬度下補上 `pb-20`（`MobileDownloadBar` 出現時不再遮住頁尾內容），桌面寬度沿用 `md:pb-0`
- 新增 `.select-hud`／`.checkbox-hud`（`globals.css`）：自訂箭頭、`color-scheme: dark`、深色 option、品牌紅勾選與 focus-visible 狀態；`CreatorApplicationForm.tsx` 的 5 個 `<select>` 改用 `.select-hud`、同意條款 checkbox 改用 `.checkbox-hud`

## Non-Goals

- **不新增 `tos`／`privacy` 的中文法律翻譯**：這是正式法律文件，內容翻譯需要正式法律審閱，不在此次變更範圍內（已與使用者確認：保留英文原文，僅修正架構讓兩語系明確共用同一份英文並顯示提示）
- 不處理低優先項目（`TacticalCursor` stale closure、scroll listener 節流、`globals.css` 重複 keyframes 等）
- 不重新設計 `--text-1`／`--text-2`／`--text-3` 三層文字色階的視覺層級關係，僅將 `--text-3` 調整到通過對比度門檻
- 不處理 `dailyval_social`（社群版），該專案不在此 repo 內
- 不處理與此次無關的其他 `bg-*` 實心背景文字對比度（如 `bg-omen-purple` + `text-white` 的 PREMIUM 徽章），僅處理 REVIEW 中明確指出的 `val-red` CTA 與 `--text-3`

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `performance-a11y`：「SEO meta framework」requirement 新增法律頁面的英文原文例外條款；新增 t.raw() 防護轉型、skip-to-content、表單狀態通知、自訂表單控制項 focus-visible 等 ADDED 需求
- `design-system`：「CSS color tokens」requirement 的 `--text-3` 數值由 `rgba(234,234,240,0.3)` 更新為 `rgba(234,234,240,0.5)`

## Impact

- Affected specs: `performance-a11y`（MODIFIED + ADDED）、`design-system`（MODIFIED）
- Affected code:
  - 修改：`src/app/globals.css`、`dailyval-project-spec.md`、`src/app/[locale]/layout.tsx`、`src/app/[locale]/tos/page.tsx`、`src/app/[locale]/privacy/page.tsx`、`src/app/[locale]/support/page.tsx`、`src/components/AppStoreQRCode.tsx`、`src/components/sections/CommunitySection.tsx`、`src/components/sections/FeaturesSection.tsx`、`src/components/creators/CreatorApplicationForm.tsx`、`src/app/[locale]/creators/page.tsx`、`src/components/HeroCtaButton.tsx`、`src/components/MobileDownloadBar.tsx`、`src/components/SiteNav.tsx`、`src/components/sections/FinalCtaSection.tsx`、`messages/en.json`、`messages/zh-TW.json`
  - 新增：`src/lib/safe-raw.ts`
