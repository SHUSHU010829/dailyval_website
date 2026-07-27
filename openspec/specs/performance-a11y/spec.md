# performance-a11y Specification

## Purpose

Defines cross-cutting performance and accessibility requirements that apply site-wide: reduced-motion handling, the base SEO metadata framework, Lighthouse performance budgets, color contrast, translation-access resilience, skip-to-content, form status announcements, focus-visible on custom controls, and layout safety around the mobile download bar and tactical cursor.

## Requirements

### Requirement: Reduced-motion utility

The application SHALL provide a `useReducedMotion()` hook and a corresponding CSS approach (`@media (prefers-reduced-motion: no-preference)`) that ALL animation code (Framer Motion, GSAP, CSS keyframes, tactical cursor) MUST consult before running non-essential motion. When reduced motion is active, decorative animations (glitch, scanline, parallax, countUp, cursor follower) MUST be disabled and replaced with a simple opacity transition or no animation at all.

#### Scenario: Hook reflects OS preference

- **WHEN** the OS setting `prefers-reduced-motion` changes from `no-preference` to `reduce`
- **THEN** subscribing components SHALL re-render with `useReducedMotion()` returning `true`

#### Scenario: CSS animations are gated

- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the global glitch, scanline, and circuit-grid animations SHALL NOT run


<!-- @trace
source: add-foundation
updated: 2026-04-16
code:
  - .spectra.yaml
  - src/components/Icon.tsx
  - src/components/WebVitalsReporter.tsx
  - src/i18n/request.ts
  - src/proxy.ts
  - dailyval-project-spec.md
  - eslint.config.mjs
  - CLAUDE.md
  - src/app/layout.tsx
  - src/app/[locale]/page.tsx
  - src/app/[locale]/support/page.tsx
  - tsconfig.json
  - src/app/[locale]/tos/page.tsx
  - src/app/[locale]/layout.tsx
  - package.json
  - src/components/TacticalCursor.tsx
  - src/app/globals.css
  - src/lib/useReducedMotion.ts
  - .vscode/settings.json
  - README.md
  - messages/zh-TW.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/routing.ts
  - src/app/favicon.ico
  - src/lib/seo.ts
  - messages/en.json
  - next.config.ts
  - src/app/[locale]/privacy/page.tsx
  - postcss.config.mjs
-->

---
### Requirement: SEO meta framework

Every page SHALL export Next.js `generateMetadata` (or static `metadata`) returning at minimum: `title`, `description`, `openGraph` (with locale-specific `og:image`), `twitter`, and `alternates.languages` for both supported locales. Strings MUST come from `messages/<locale>.json` or per-page metadata files; inline hard-coded English in non-English pages is forbidden, EXCEPT for the body content of legal documents (Terms of Service, Privacy Policy) where no reviewed translation exists yet. For that exception, the page MUST render a translated notice (sourced from `messages/<locale>.json`) informing the user that the document is only available in English when the current locale is not `en`.

#### Scenario: Localized title is emitted

- **WHEN** a crawler fetches `/zh-TW/`
- **THEN** the response `<title>` SHALL be the value from `messages/zh-TW.json` `meta.home.title`

#### Scenario: Alternates expose both locales

- **WHEN** any page renders metadata
- **THEN** `alternates.languages` SHALL contain entries for both `zh-TW` and `en` resolving to the equivalent path under each locale

#### Scenario: Legal pages disclose untranslated content

- **WHEN** a `zh-TW` user visits `/zh-TW/tos` or `/zh-TW/privacy`
- **THEN** the page SHALL render a translated notice (in Traditional Chinese) stating the document is only available in English, before the English legal body content


<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Performance budgets

The production build SHALL meet the following budgets when measured by Lighthouse on a desktop run of `/zh-TW/` after the foundation change is applied: Performance ≥ 90, LCP < 2.5s, CLS < 0.1, INP < 200ms. The scaffold MUST configure `next/font` with `display: 'swap'`, MUST `preconnect` to Google Fonts, and MUST avoid loading GSAP into the root layout bundle.

#### Scenario: GSAP is not in initial bundle

- **WHEN** the production build is analyzed
- **THEN** `gsap` SHALL NOT appear in the initial JS chunk of the root layout and SHALL only be loaded via `next/dynamic` from components that need it


<!-- @trace
source: add-foundation
updated: 2026-04-16
code:
  - .spectra.yaml
  - src/components/Icon.tsx
  - src/components/WebVitalsReporter.tsx
  - src/i18n/request.ts
  - src/proxy.ts
  - dailyval-project-spec.md
  - eslint.config.mjs
  - CLAUDE.md
  - src/app/layout.tsx
  - src/app/[locale]/page.tsx
  - src/app/[locale]/support/page.tsx
  - tsconfig.json
  - src/app/[locale]/tos/page.tsx
  - src/app/[locale]/layout.tsx
  - package.json
  - src/components/TacticalCursor.tsx
  - src/app/globals.css
  - src/lib/useReducedMotion.ts
  - .vscode/settings.json
  - README.md
  - messages/zh-TW.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/routing.ts
  - src/app/favicon.ico
  - src/lib/seo.ts
  - messages/en.json
  - next.config.ts
  - src/app/[locale]/privacy/page.tsx
  - postcss.config.mjs
-->

---
### Requirement: Color contrast and semantic HTML

All text-on-background combinations defined by the design tokens SHALL meet WCAG AA contrast (≥ 4.5:1 for body text, ≥ 3:1 for large text). Pages SHALL use semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and icon-only buttons MUST carry `aria-label`.

#### Scenario: Icon button exposes accessible name

- **WHEN** an icon-only button is rendered (e.g. locale switcher)
- **THEN** it SHALL include an `aria-label` translated via `next-intl`

#### Scenario: Body text meets contrast

- **WHEN** `--text-1` is rendered on `--bg-base`
- **THEN** the contrast ratio SHALL be at least 4.5:1

<!-- @trace
source: add-foundation
updated: 2026-04-16
code:
  - .spectra.yaml
  - src/components/Icon.tsx
  - src/components/WebVitalsReporter.tsx
  - src/i18n/request.ts
  - src/proxy.ts
  - dailyval-project-spec.md
  - eslint.config.mjs
  - CLAUDE.md
  - src/app/layout.tsx
  - src/app/[locale]/page.tsx
  - src/app/[locale]/support/page.tsx
  - tsconfig.json
  - src/app/[locale]/tos/page.tsx
  - src/app/[locale]/layout.tsx
  - package.json
  - src/components/TacticalCursor.tsx
  - src/app/globals.css
  - src/lib/useReducedMotion.ts
  - .vscode/settings.json
  - README.md
  - messages/zh-TW.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/routing.ts
  - src/app/favicon.ico
  - src/lib/seo.ts
  - messages/en.json
  - next.config.ts
  - src/app/[locale]/privacy/page.tsx
  - postcss.config.mjs
-->

---
### Requirement: Translation array access resilience

Components that read array or object values via `t.raw(key)` SHALL guard against a missing or malformed translation key so that a missing key degrades to a safe fallback (e.g. an empty array) instead of throwing during render.

#### Scenario: Missing translation key does not crash the page

- **WHEN** `t.raw(key)` is called for a key that does not exist in the current locale's message file
- **THEN** the component SHALL render using a safe fallback value instead of throwing an unhandled exception


<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Skip-to-content link

Every locale-prefixed page SHALL expose a skip-to-content link as the first focusable element in the DOM, which SHALL move keyboard focus to the page's main content landmark when activated.

#### Scenario: Keyboard user skips repeated navigation

- **WHEN** a keyboard user presses Tab immediately after a page loads
- **THEN** the first focusable element SHALL be a "skip to content" link, and activating it SHALL move focus to the `<main>` landmark


<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Form status announcements

Forms that display an asynchronous success or error status after submission SHALL mark the status container with `role="alert"` (or an equivalent `aria-live` region) so assistive technology announces the outcome without requiring the user to move focus manually.

#### Scenario: Screen reader announces submission error

- **WHEN** `CreatorApplicationForm` submission fails and the error status renders
- **THEN** the error container SHALL have `role="alert"` so screen readers announce it automatically


<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Custom form controls expose focus-visible styling

Interactive form controls that are not native `<button>`/`<input>` elements with default browser focus rings (e.g. chip-style toggle buttons with `role="checkbox"`, custom-styled `<select>`/checkbox elements) SHALL provide a visible `:focus-visible` style so keyboard users can identify the focused control.

#### Scenario: Keyboard user can see which chip is focused

- **WHEN** a keyboard user tabs to a language or platform selection chip in `CreatorApplicationForm`
- **THEN** the focused chip SHALL show a visible focus outline


<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Mobile download bar does not obscure page content

On viewports where `MobileDownloadBar` can appear, the page's main content area SHALL reserve enough bottom spacing that the bar (when visible) does not visually cover footer content.

#### Scenario: Footer remains fully visible on mobile

- **WHEN** a user on a mobile viewport scrolls to the bottom of any page and `MobileDownloadBar` is visible
- **THEN** all footer content SHALL remain unobscured by the bar


<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Native cursor remains visible when the custom cursor is not rendered

When `TacticalCursor` does not mount its custom crosshair (reduced motion preference, non-fine pointer, or before client-side hydration completes), the browser's native cursor SHALL remain visible. The global `cursor: none` rule SHALL only apply within `@media (prefers-reduced-motion: no-preference) and (pointer: fine)`.

#### Scenario: Reduced-motion user sees a cursor

- **WHEN** a user with `prefers-reduced-motion: reduce` loads any page
- **THEN** the native OS cursor SHALL be visible while moving the mouse over the page

<!-- @trace
source: accessibility-i18n-fixes
updated: 2026-07-28
code:
  - src/app/sitemap.ts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/privacy/page.tsx
  - next.config.ts
  - src/app/[locale]/creators/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/SiteNav.tsx
  - src/app/globals.css
  - src/components/AdConsentGate.tsx
  - src/app/og/route.tsx
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - messages/en.json
  - vitest.config.mts
  - messages/zh-TW.json
  - package.json
  - public/appicon-og.png
  - src/app/[locale]/support/page.tsx
  - public/ads.txt
  - src/components/sections/HeroSection.tsx
  - src/components/HeroCtaButton.tsx
  - src/lib/safe-raw.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - src/components/AppStoreQRCode.tsx
  - README.md
  - src/lib/seo.ts
  - .github/workflows/ci.yml
  - src/app/robots.ts
  - .env.example
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/components/MobileDownloadBar.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/lib/site-config.ts
  - src/components/sections/FinalCtaSection.tsx
tests:
  - src/lib/safe-raw.test.ts
-->