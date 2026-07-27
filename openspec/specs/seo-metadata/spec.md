# seo-metadata Specification

## Purpose

Defines the site's technical SEO infrastructure: `sitemap.xml`, `robots.txt`, `metadataBase`, the Open Graph image generation rules (size limits, per-page title rendering, data accuracy, single-variant policy), and the structured data (JSON-LD) exposed on the home and creators pages.

## Requirements

### Requirement: Sitemap enumerates all public routes

The application SHALL expose `src/app/sitemap.ts` implementing Next.js's `MetadataRoute.Sitemap` export. The generated sitemap SHALL include an entry for every combination of supported locale (`en`, `zh-TW`) and public static route (`/`, `/creators`, `/tos`, `/privacy`, `/support`), using absolute URLs built from the site's base URL.

#### Scenario: Sitemap includes every locale/route combination

- **WHEN** `/sitemap.xml` is requested
- **THEN** the response SHALL contain exactly 10 `<url>` entries — 5 routes × 2 locales — each with an absolute, locale-prefixed URL


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Robots directives allow indexing and reference the sitemap

The application SHALL expose `src/app/robots.ts` implementing Next.js's `MetadataRoute.Robots` export. The rules SHALL allow all user agents to crawl all public routes, and SHALL declare the sitemap URL.

#### Scenario: Robots output permits crawling and points to sitemap

- **WHEN** `/robots.txt` is requested
- **THEN** the response SHALL NOT disallow any existing public route, and SHALL include a `Sitemap:` directive pointing at the absolute `/sitemap.xml` URL


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Metadata base resolves relative asset URLs

`buildMetadata()` in `src/lib/seo.ts` SHALL set `metadataBase` to an absolute URL derived from the site's configured base URL, so that any relative image or asset URL in generated metadata resolves correctly regardless of deployment environment.

#### Scenario: Metadata base is present on every generated page metadata

- **WHEN** any page's `generateMetadata` calls `buildMetadata()`
- **THEN** the returned `Metadata` object SHALL include a `metadataBase` field set to a valid absolute URL


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: OG image asset stays within edge function size limits

The `/og` route SHALL source its embedded icon image from a pre-resized static asset no larger than 300KB on disk, instead of reading the full-resolution app icon at request time. The pre-resized asset's pixel dimensions SHALL be no more than 2x the icon's rendered display size in the OG layout.

#### Scenario: OG route uses the pre-resized icon asset

- **WHEN** the `/og` route handler executes
- **THEN** it SHALL fetch the pre-resized icon asset (not the original full-resolution app icon) before base64-encoding it into the response image


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: OG image renders the page-specific title

The `/og` route SHALL visually render the `title` query parameter it receives, in addition to the `description` parameter it already renders, so that OG cards for different pages are visually distinguishable from one another.

#### Scenario: Two pages with different titles produce visually distinct OG cards

- **WHEN** `/og` is requested once with `title=A` and once with `title=B` (same `description` and `locale`)
- **THEN** both rendered images SHALL display their respective `title` text somewhere in the layout


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: OG image statistics match published site copy

The stat values rendered on the `/og` card (active player count and any other numeric claim) SHALL match the equivalent numeric claims rendered on the live site (e.g. the home page `socialProof` section), for both the `en` and `zh-TW` locales.

#### Scenario: Active player stat matches site copy

- **WHEN** the `/og` route renders its stats panel for either locale
- **THEN** the active-player stat value SHALL equal the value shown in the corresponding locale's `socialProof.items` translation content


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Only one Open Graph image variant is generated

The application SHALL generate a single Open Graph image variant (1200×630) that is used for both the `openGraph.images` and `twitter.images` fields of a page's metadata. The application SHALL NOT expose a separate square (1:1) image route, since Twitter's `summary_large_image` card format expects a 2:1 image.

#### Scenario: Twitter and Open Graph metadata reference the same image

- **WHEN** `buildMetadata()` generates metadata for any page
- **THEN** `openGraph.images` and `twitter.images` SHALL resolve to the same image URL, and no route SHALL exist that serves a square OG image variant


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Home page exposes SoftwareApplication structured data

The home page (`/<locale>`) SHALL include a `SoftwareApplication` JSON-LD structured data block containing at minimum `name`, `applicationCategory`, `operatingSystem`, and `aggregateRating` (with `ratingValue` and `ratingCount` sourced from the same figures already displayed in the page's `socialProof` section).

#### Scenario: Home page includes valid SoftwareApplication JSON-LD

- **WHEN** the home page is rendered for either locale
- **THEN** the HTML SHALL contain a `<script type="application/ld+json">` block whose parsed content has `@type: "SoftwareApplication"` and an `aggregateRating.ratingValue` matching the App Store rating shown elsewhere on the same page


<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Creators page exposes FAQPage structured data matching visible content

The `/creators` page SHALL include a `FAQPage` JSON-LD structured data block whose `mainEntity` question/answer pairs correspond exactly (same questions, in the same locale) to the FAQ items already rendered visibly on that page. The structured data SHALL NOT include any question that is not also visibly rendered on the page.

#### Scenario: Structured data FAQ items match rendered FAQ items

- **WHEN** the `/creators` page is rendered for either locale
- **THEN** the number and text of `Question` entities in the `FAQPage` JSON-LD SHALL exactly match the number and text of FAQ items rendered in the visible FAQ section

<!-- @trace
source: seo-metadata-cleanup
updated: 2026-07-28
code:
  - vitest.config.mts
  - src/components/WebVitalsReporter.tsx
  - README.md
  - src/components/Icon.tsx
  - src/components/sections/CommunitySection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AppStoreQRCode.tsx
  - src/app/robots.ts
  - src/components/sections/FinalCtaSection.tsx
  - src/app/sitemap.ts
  - src/components/HeroCtaButton.tsx
  - dailyval-project-spec.md
  - src/lib/seo.ts
  - src/lib/safe-raw.ts
  - src/app/[locale]/page.tsx
  - src/components/SiteNav.tsx
  - messages/zh-TW.json
  - next.config.ts
  - src/app/og/route.tsx
  - src/app/layout.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/sections/FeaturesSection.tsx
  - public/ads.txt
  - src/app/[locale]/support/page.tsx
  - src/lib/site-config.ts
  - src/app/[locale]/creators/page.tsx
  - src/components/SiteFooter.tsx
  - public/appicon-og.png
  - src/app/globals.css
  - src/app/[locale]/privacy/page.tsx
  - .env.example
  - src/app/[locale]/layout.tsx
  - src/components/AdConsentGate.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - .github/workflows/ci.yml
  - messages/en.json
tests:
  - src/lib/safe-raw.test.ts
-->