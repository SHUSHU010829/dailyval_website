## 1. Cursor visibility

- [x] 1.1 In `src/app/globals.css`, wrap the global `cursor: none !important` rule in `@media (prefers-reduced-motion: no-preference) and (pointer: fine)`, so the native cursor remains visible when the custom cursor is not rendered

## 2. Contrast fixes

- [x] 2.1 Update `--text-3` in `src/app/globals.css` from `rgba(234,234,240,0.3)` to `rgba(234,234,240,0.5)`, and sync the same value in `dailyval-project-spec.md`'s color token table (CSS color tokens). Design decision: "`--text-3` 調整為 alpha 0.5，而非新增第 4 層文字色階"
- [x] 2.2 Change `text-white` to `text-bg-base` on the 7 solid `bg-val-red` CTA buttons: `src/components/HeroCtaButton.tsx`, `src/components/MobileDownloadBar.tsx`, `src/components/SiteNav.tsx` (both occurrences), `src/components/sections/FinalCtaSection.tsx`, `src/app/[locale]/creators/page.tsx`, `src/components/creators/CreatorApplicationForm.tsx`. Design decision: "CTA 按鈕文字改用 `text-bg-base`，而非調深 `val-red`"

## 3. Translation array access resilience

- [x] 3.1 Create `src/lib/safe-raw.ts` exporting `safeRaw<T>(t, key, fallback)` that wraps `t.raw(key)` in try/catch, validates the result is defined, and returns the fallback with a dev-time `console.error` on failure, satisfying translation array access resilience. Design decision: "新增 `safeRaw()` 工具函式，而非在每個呼叫點各自加 try/catch"
- [x] 3.2 Apply `safeRaw()` in `src/components/sections/FeaturesSection.tsx`'s `t.raw("items")` call
- [x] 3.3 Apply `safeRaw()` to all 7 `t.raw()` calls in `src/components/creators/CreatorApplicationForm.tsx`
- [x] 3.4 Apply `safeRaw()` to all 6 `t.raw()` calls in `src/app/[locale]/creators/page.tsx` (`hero.stats`, `tiers.items`, `how.steps`, `bonus.rows`, `examples.videos`, `faq.items`)

## 4. i18n bypass fixes

- [x] 4.1 Move `support/page.tsx`'s existing bilingual ternary content into `messages/en.json` and `messages/zh-TW.json` under a `support` namespace, and render via `safeRaw()`-wrapped `t.raw()` instead of `isZh ? (...) : (...)`
- [x] 4.2 Move `AppStoreQRCode.tsx`'s hardcoded "掃碼下載" into a translation key and render via `useTranslations()`
- [x] 4.3 Move `CommunitySection.tsx`'s `PREVIEW_POSTS` array and "查看更多 →" hover label into `messages/en.json`/`messages/zh-TW.json` (with an English translation of the 3 preview posts), read via `safeRaw()`-wrapped `t.raw()`
- [x] 4.4 In `src/app/[locale]/tos/page.tsx` and `src/app/[locale]/privacy/page.tsx`, change `backLabel` from the hardcoded English string to `t("common.backHome")`
- [x] 4.5 Add a `legal.englishOnlyNotice` translation key (English and Traditional Chinese) and render it at the top of the legal body content in both pages when `locale !== "en"`, satisfying legal pages disclose untranslated content. Design decision: "法律頁維持英文原文，新增翻譯過的「本頁尚無中文版」提示". This also fulfills the SEO meta framework requirement's legal-page exception clause

## 5. Accessibility gaps

- [x] 5.1 Add a skip-to-content link as the first element rendered in `src/app/[locale]/layout.tsx`, and add `id="main-content"` to the `<main>` element, satisfying skip-to-content link. Design decision: "skip-to-content 連結放在 `[locale]/layout.tsx`，而非 root layout"
- [x] 5.2 Add `role="alert"` to the success and error status containers in `src/components/creators/CreatorApplicationForm.tsx`, satisfying form status announcements
- [x] 5.3 Add `focus-visible` outline styling to the language/platform chip toggle buttons in `src/components/creators/CreatorApplicationForm.tsx`, satisfying custom form controls expose focus-visible styling
- [x] 5.4 Add responsive bottom padding (`pb-20 md:pb-0`) to the `<main>` element in `src/app/[locale]/layout.tsx` so `MobileDownloadBar` does not obscure footer content, satisfying mobile download bar does not obscure page content

## 6. Creator form control styling

- [x] 6.1 Add `.select-hud` (custom arrow, `color-scheme: dark`, dark option styling) and `.checkbox-hud` (brand-red check, hover/focus-visible states) to `src/app/globals.css`
- [x] 6.2 In `src/components/creators/CreatorApplicationForm.tsx`, apply `.select-hud` to the 5 `<select>` elements and `.checkbox-hud` to the terms-agreement checkbox

## 7. Verification

- [x] 7.1 Run `npm run build` and confirm it passes with no new type or lint errors
- [x] 7.2 Manually load `/en/support` and `/zh-TW/support` and confirm both render fully localized content with no hardcoded wrong-language text
- [x] 7.3 Manually load `/zh-TW/tos` and confirm the English-only notice renders and the back link is in Traditional Chinese
- [x] 7.4 Manually tab through `/en/creators`'s form to confirm chip focus rings, select/checkbox HUD styling, and skip-link all work as expected
