## 1. OG icon asset

- [x] 1.1 Use `sips` (or equivalent) to generate `public/appicon-og.png` at 600×600 from `public/appicon.png`, verifying the OG image asset stays within edge function size limits (target ≤300KB on disk). Design decision: "使用預先縮圖的靜態檔案，而非 runtime 動態縮圖"

## 2. `seo.ts` cleanup

- [x] 2.1 Add `metadataBase: new URL(BASE_URL)` to the object returned by `buildMetadata()` so metadata base resolves relative asset URLs correctly. Design decision: "`metadataBase` 放在 `seo.ts` 而非各頁 `layout.tsx`"
- [x] 2.2 Remove `resolvedTwitterImage` / `defaultTwitterImage` and make `twitter.images` reuse `resolvedOgImage` directly, so only one Open Graph image variant is generated and referenced by both `openGraph` and `twitter` fields. Design decision: "移除 `/og/square` 與 `resolvedTwitterImage`，而非修正 bug 讓它被觸達"

## 3. `/og` route updates

- [x] 3.1 Replace the `fetch(new URL("../../../public/appicon.png", ...))` call with a fetch of `public/appicon-og.png`
- [x] 3.2 Add a rendered kicker line using the `title` search param (reusing the existing `truncate(title, 80)` value) above the "DailyVal" wordmark, so the OG image renders the page-specific title. Design decision: "OG 圖片渲染 `title`，而非只用於字型子集化"
- [x] 3.3 Update the hardcoded stats array so the active-player value matches published site copy ("1,200,000+" / "120 萬" instead of "900K+" / "90 萬") for both locales, satisfying OG image statistics match published site copy

## 4. Dead code removal

- [x] 4.1 Delete `src/app/og/square/route.tsx` (only one Open Graph image variant is generated; this route is unreachable after task 2.2). Design decision: "移除 `/og/square` 與 `resolvedTwitterImage`，而非修正 bug 讓它被觸達"
- [x] 4.2 Remove the unused `generateMetadata` export from `src/app/[locale]/layout.tsx` (always overridden by each page's own `buildMetadata()` call)

## 5. Sitemap and robots

- [x] 5.1 Create `src/app/sitemap.ts` returning a `MetadataRoute.Sitemap` entry for each of the 5 static routes (`/`, `/creators`, `/tos`, `/privacy`, `/support`) × 2 locales (`en`, `zh-TW`), so the sitemap enumerates all public routes
- [x] 5.2 Create `src/app/robots.ts` returning a `MetadataRoute.Robots` config that allows all user agents and declares the sitemap URL, so robots directives allow indexing and reference the sitemap

## 6. Structured data

- [x] 6.1 In `src/app/[locale]/page.tsx`, inject a `<script type="application/ld+json">` block with `SoftwareApplication` + `aggregateRating` (`ratingValue: 4.7`, `ratingCount: 15600`) sourced from the same figures shown in the page's `socialProof` section, so the home page exposes SoftwareApplication structured data. Design decision: "`aggregateRating` 的 `ratingCount` 直接取用站上既有公開文案"
- [x] 6.2 In `src/app/[locale]/creators/page.tsx`, inject a `<script type="application/ld+json">` block with `FAQPage` whose `mainEntity` is built directly from the same `faqItems` array already used to render the visible FAQ section, so the creators page exposes FAQPage structured data matching visible content

## 7. Copy updates

- [x] 7.1 Update `meta.home.title` in `messages/en.json` and `messages/zh-TW.json` to include descriptive keywords instead of the bare "DailyVal" / brand name only

## 8. Verification

- [x] 8.1 Run `npm run build` and confirm it passes with no new type or lint errors
- [x] 8.2 Manually request `/en/sitemap.xml` (or the dev-server equivalent) and `/robots.txt` and confirm the expected entries appear
- [x] 8.3 Manually request `/og?title=Test&description=Test&locale=en` and `/og?title=測試&description=測試&locale=zh-TW` and visually confirm the title renders and the icon/stats look correct
