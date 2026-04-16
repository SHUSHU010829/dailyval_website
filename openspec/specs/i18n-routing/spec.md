# i18n-routing Specification

## Purpose

TBD - created by archiving change 'add-foundation'. Update Purpose after archive.

## Requirements

### Requirement: Supported locales and default

The application SHALL support exactly two locales: `zh-TW` and `en`. The default locale SHALL be `zh-TW`. The locale list SHALL be defined in a single `src/i18n/routing.ts` module that is the sole source of truth for both middleware and route generation.

#### Scenario: Unknown locale falls back to default

- **WHEN** a request URL contains a locale segment that is not `zh-TW` or `en`
- **THEN** the middleware SHALL respond with a redirect to the same path under the default locale `zh-TW`


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
### Requirement: Locale-prefixed URLs

Every user-facing page SHALL be served from a URL whose first path segment is the locale (e.g. `/zh-TW/tos`, `/en/`). Requests to the root `/` SHALL be redirected to the locale chosen by the detection rules below.

#### Scenario: Root request is redirected to detected locale

- **WHEN** an unauthenticated browser requests `/` with `Accept-Language: en-US,en;q=0.9`
- **THEN** the middleware SHALL respond with a 307 redirect to `/en`

#### Scenario: Root request with no language preference uses default

- **WHEN** a request to `/` has no `Accept-Language` header or no supported match
- **THEN** the middleware SHALL redirect to `/zh-TW`


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
### Requirement: Manual locale switching

The application SHALL provide a `<LocaleSwitcher>` component that lets the user switch between `zh-TW` and `en` while preserving the current pathname and persisting the choice.

#### Scenario: Switching preserves the current path

- **WHEN** the user is on `/zh-TW/tos` and selects `EN` from the locale switcher
- **THEN** the browser SHALL navigate to `/en/tos` without losing the page

#### Scenario: Manual choice persists across visits

- **WHEN** the user manually selects a locale
- **THEN** the application SHALL set a `NEXT_LOCALE` cookie so that future visits to `/` redirect to the chosen locale instead of running `Accept-Language` detection


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
### Requirement: Translated UI strings via next-intl

UI text MUST be loaded from JSON message files at `messages/zh-TW.json` and `messages/en.json` and consumed via `next-intl` hooks. Hard-coded user-facing strings in components are forbidden.

#### Scenario: Component reads translated label

- **WHEN** a component calls `useTranslations('nav').t('download')`
- **THEN** it SHALL return the value from `messages/<active-locale>.json` under the `nav.download` key


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
### Requirement: hreflang and html lang attributes

The application SHALL set `<html lang>` to the active locale and SHALL emit `<link rel="alternate" hreflang>` tags for every supported locale plus `x-default` on every page.

#### Scenario: Page exposes alternates

- **WHEN** a crawler fetches `/en/tos`
- **THEN** the response HTML SHALL contain `<html lang="en">`, an alternate link to `/zh-TW/tos` with `hreflang="zh-TW"`, an alternate link to `/en/tos` with `hreflang="en"`, and an `x-default` alternate

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