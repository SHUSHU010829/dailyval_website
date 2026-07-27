# project-scaffold Specification

## Purpose

TBD - created by archiving change 'add-foundation'. Update Purpose after archive.

## Requirements

### Requirement: App Router directory structure

The project SHALL organize routes under `src/app/[locale]/` so that every user-facing page is locale-scoped, with the root `src/app/layout.tsx` providing only HTML shell concerns and `src/app/[locale]/layout.tsx` providing locale-aware providers. The locale layout SHALL inject the real `SiteNav` component inside `<header>` and the real `SiteFooter` component inside `<footer>`, replacing placeholder elements. The home page at `src/app/[locale]/page.tsx` SHALL compose all landing page Section components.

#### Scenario: Root layout renders HTML shell

- **WHEN** any request reaches the application
- **THEN** `src/app/layout.tsx` SHALL render the `<html>` and `<body>` elements with the active locale on `<html lang>` and SHALL NOT render any UI chrome

#### Scenario: Locale layout wraps all pages

- **WHEN** a request resolves to `/zh-TW/...` or `/en/...`
- **THEN** `src/app/[locale]/layout.tsx` SHALL provide the i18n message provider, font variables, and the `SiteNav` component inside `<header>`, and the `SiteFooter` component inside `<footer>`

#### Scenario: SiteNav is present in layout header

- **WHEN** any page under `[locale]` is rendered
- **THEN** the `<header>` element SHALL contain the `SiteNav` component (not an empty `<nav>`)

#### Scenario: SiteFooter is present in layout footer

- **WHEN** any page under `[locale]` is rendered
- **THEN** the `<footer>` element SHALL contain the `SiteFooter` component (not an empty element)

#### Scenario: Home page composes Section components

- **WHEN** user navigates to `/<locale>/`
- **THEN** `src/app/[locale]/page.tsx` SHALL render HeroSection, SocialProofSection, FeaturesSection, CommunitySection, TestimonialsSection, and FinalCtaSection in that order


<!-- @trace
source: add-landing-page
updated: 2026-04-16
code:
  - src/lib/seo.ts
  - CLAUDE.md
  - src/components/Icon.tsx
  - dailyval-project-spec.md
  - .spectra.yaml
  - messages/zh-TW.json
  - .vscode/settings.json
  - src/components/LegalLayout.tsx
  - src/components/TacticalCursor.tsx
  - src/app/[locale]/privacy/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/[locale]/layout.tsx
  - public/.well-known/apple-app-site-association
  - src/lib/useReducedMotion.ts
  - tsconfig.json
  - next.config.ts
  - postcss.config.mjs
  - src/components/sections/CommunitySection.tsx
  - eslint.config.mjs
  - src/app/favicon.ico
  - src/proxy.ts
  - src/components/sections/SocialProofSection.tsx
  - src/app/layout.tsx
  - src/app/[locale]/tos/page.tsx
  - src/app/globals.css
  - src/components/sections/FinalCtaSection.tsx
  - src/components/WebVitalsReporter.tsx
  - src/components/SiteNav.tsx
  - src/components/LocaleSwitcher.tsx
  - src/components/sections/HeroSection.tsx
  - package.json
  - src/i18n/routing.ts
  - src/i18n/request.ts
  - src/components/sections/TestimonialsSection.tsx
  - README.md
  - src/components/SiteFooter.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/app/[locale]/support/page.tsx
  - messages/en.json
-->

---
### Requirement: Placeholder pages exist for all planned routes

The scaffold SHALL provide minimum-viable pages for `/`, `/tos`, `/privacy`, and `/support` under `[locale]` so that routing, i18n, and layout can be verified end-to-end before feature work begins.

#### Scenario: Placeholder route returns 200

- **WHEN** the dev server is running and a user navigates to `/zh-TW/tos`, `/zh-TW/privacy`, or `/zh-TW/support`
- **THEN** the page SHALL respond with HTTP 200 and render a placeholder heading translated via the i18n provider


<!-- @trace
source: add-foundation
updated: 2026-04-16
code:
  - .spectra.yaml
  - public/next.svg
  - src/components/Icon.tsx
  - src/components/WebVitalsReporter.tsx
  - src/i18n/request.ts
  - src/proxy.ts
  - dailyval-project-spec.md
  - eslint.config.mjs
  - public/vercel.svg
  - public/file.svg
  - CLAUDE.md
  - src/app/layout.tsx
  - public/globe.svg
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
  - public/favicon.ico
  - src/i18n/routing.ts
  - src/app/favicon.ico
  - src/lib/seo.ts
  - messages/en.json
  - next.config.ts
  - public/window.svg
  - src/app/[locale]/privacy/page.tsx
  - postcss.config.mjs
-->

---
### Requirement: Required runtime dependencies installed

The scaffold SHALL declare `next-intl` and `@phosphor-icons/react` in `package.json` so that subsequent changes can import them without dependency churn. The scaffold SHALL NOT declare `framer-motion`, `gsap`, `@next/mdx`, or `@mdx-js/react` unless a concrete consumer of that dependency exists in the codebase.

#### Scenario: Build succeeds with all dependencies resolved

- **WHEN** `npm run build` is executed after the change is applied
- **THEN** the build SHALL complete successfully and SHALL NOT report missing modules for any of the listed dependencies

#### Scenario: Removed dependencies have no remaining imports

- **WHEN** the codebase is scanned for imports of `framer-motion`, `gsap`, `@next/mdx`, or `@mdx-js/react`
- **THEN** zero matches SHALL be found


<!-- @trace
source: code-health-cleanup
updated: 2026-07-28
code:
  - public/appicon-og.png
  - src/lib/site-config.ts
  - dailyval-project-spec.md
  - package.json
  - src/app/[locale]/privacy/page.tsx
  - src/components/MobileDownloadBar.tsx
  - .github/workflows/ci.yml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/lib/seo.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/page.tsx
  - .env.example
  - src/app/og/square/route.tsx
  - src/app/og/route.tsx
  - src/app/robots.ts
  - src/components/AppStoreQRCode.tsx
  - src/components/sections/FinalCtaSection.tsx
  - REVIEW.md
  - src/components/SiteNav.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - messages/en.json
  - src/app/layout.tsx
  - messages/zh-TW.json
  - src/components/HeroCtaButton.tsx
  - src/app/[locale]/creators/page.tsx
  - src/components/sections/CommunitySection.tsx
  - public/ads.txt
  - src/components/sections/TestimonialsSection.tsx
  - src/components/Icon.tsx
  - src/app/globals.css
  - src/app/[locale]/layout.tsx
  - vitest.config.mts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/support/page.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AdConsentGate.tsx
  - src/app/sitemap.ts
  - src/components/sections/HeroSection.tsx
  - src/lib/safe-raw.ts
  - next.config.ts
tests:
  - src/lib/safe-raw.test.ts
-->

---
### Requirement: Type-checking, CI, and test infrastructure exist

The project SHALL provide a `typecheck` script in `package.json` (`tsc --noEmit`) independent of the Next.js build's type-checking step. The repository SHALL provide a CI workflow that installs dependencies, runs type-checking, and runs the production build on every push/PR. The project SHALL have a working unit test runner (Vitest) with at least one passing test, proving the test infrastructure is wired correctly.

#### Scenario: CI workflow runs on push

- **WHEN** a commit is pushed to the repository
- **THEN** the CI workflow SHALL install dependencies, run `npm run typecheck`, and run `npm run build`, failing the workflow if any step fails

#### Scenario: Test runner executes successfully

- **WHEN** `npm run test` is executed
- **THEN** Vitest SHALL run and report at least one passing test with zero failures

<!-- @trace
source: code-health-cleanup
updated: 2026-07-28
code:
  - public/appicon-og.png
  - src/lib/site-config.ts
  - dailyval-project-spec.md
  - package.json
  - src/app/[locale]/privacy/page.tsx
  - src/components/MobileDownloadBar.tsx
  - .github/workflows/ci.yml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/lib/seo.ts
  - src/components/WebVitalsReporter.tsx
  - src/app/[locale]/page.tsx
  - .env.example
  - src/app/og/square/route.tsx
  - src/app/og/route.tsx
  - src/app/robots.ts
  - src/components/AppStoreQRCode.tsx
  - src/components/sections/FinalCtaSection.tsx
  - REVIEW.md
  - src/components/SiteNav.tsx
  - src/components/creators/CreatorApplicationForm.tsx
  - messages/en.json
  - src/app/layout.tsx
  - messages/zh-TW.json
  - src/components/HeroCtaButton.tsx
  - src/app/[locale]/creators/page.tsx
  - src/components/sections/CommunitySection.tsx
  - public/ads.txt
  - src/components/sections/TestimonialsSection.tsx
  - src/components/Icon.tsx
  - src/app/globals.css
  - src/app/[locale]/layout.tsx
  - vitest.config.mts
  - src/components/SiteFooter.tsx
  - src/app/[locale]/support/page.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/AdConsentGate.tsx
  - src/app/sitemap.ts
  - src/components/sections/HeroSection.tsx
  - src/lib/safe-raw.ts
  - next.config.ts
tests:
  - src/lib/safe-raw.test.ts
-->