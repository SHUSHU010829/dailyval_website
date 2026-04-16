# universal-links Specification

## Purpose

TBD - created by archiving change 'add-universal-links'. Update Purpose after archive.

## Requirements

### Requirement: AASA file is served at correct path

The server SHALL serve a valid Apple App Site Association file at `/.well-known/apple-app-site-association`. The file SHALL be accessible without authentication and SHALL be served with `Content-Type: application/json`.

#### Scenario: AASA file is reachable

- **WHEN** a GET request is made to `https://dailyval.com/.well-known/apple-app-site-association`
- **THEN** the server SHALL respond with HTTP 200
- **THEN** the response `Content-Type` header SHALL be `application/json`

#### Scenario: AASA file is valid JSON

- **WHEN** the AASA file is parsed
- **THEN** it SHALL be valid JSON containing an `applinks` key with an `apps` array and a `details` array


<!-- @trace
source: add-universal-links
updated: 2026-04-16
code:
  - src/components/sections/HeroSection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/WebVitalsReporter.tsx
  - .vscode/settings.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/request.ts
  - next.config.ts
  - public/.well-known/apple-app-site-association
  - src/app/favicon.ico
  - src/components/TacticalCursor.tsx
  - .spectra.yaml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/TestimonialsSection.tsx
  - src/lib/useReducedMotion.ts
  - src/components/LegalLayout.tsx
  - src/proxy.ts
  - postcss.config.mjs
  - src/components/SiteNav.tsx
  - src/components/sections/SocialProofSection.tsx
  - messages/en.json
  - eslint.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/app/globals.css
  - messages/zh-TW.json
  - src/components/SiteFooter.tsx
  - src/components/Icon.tsx
  - package.json
  - src/components/sections/FinalCtaSection.tsx
  - src/lib/seo.ts
  - src/app/[locale]/privacy/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/layout.tsx
  - CLAUDE.md
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - tsconfig.json
  - src/i18n/routing.ts
-->

---
### Requirement: AASA file declares the DailyVal App ID

The AASA file SHALL contain the DailyVal App ID in the format `TEAM_ID.BUNDLE_ID` in the `applinks.details[].appIDs` array. The App ID values SHALL match the production App registered in Apple Developer Console (App Store ID: 1637782901).

#### Scenario: App ID format is correct

- **WHEN** the AASA file is validated by Apple's CDN
- **THEN** the `appIDs` value SHALL match the format `<10-char-team-id>.<bundle-identifier>`


<!-- @trace
source: add-universal-links
updated: 2026-04-16
code:
  - src/components/sections/HeroSection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/WebVitalsReporter.tsx
  - .vscode/settings.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/request.ts
  - next.config.ts
  - public/.well-known/apple-app-site-association
  - src/app/favicon.ico
  - src/components/TacticalCursor.tsx
  - .spectra.yaml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/TestimonialsSection.tsx
  - src/lib/useReducedMotion.ts
  - src/components/LegalLayout.tsx
  - src/proxy.ts
  - postcss.config.mjs
  - src/components/SiteNav.tsx
  - src/components/sections/SocialProofSection.tsx
  - messages/en.json
  - eslint.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/app/globals.css
  - messages/zh-TW.json
  - src/components/SiteFooter.tsx
  - src/components/Icon.tsx
  - package.json
  - src/components/sections/FinalCtaSection.tsx
  - src/lib/seo.ts
  - src/app/[locale]/privacy/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/layout.tsx
  - CLAUDE.md
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - tsconfig.json
  - src/i18n/routing.ts
-->

---
### Requirement: AASA file covers all site paths

The AASA file SHALL declare a path component that matches all URL paths on the domain (`/*`) so that any `dailyval.com` link can trigger Universal Link behavior on iOS.

#### Scenario: Wildcard path is declared

- **WHEN** the AASA details are inspected
- **THEN** the `components` array SHALL contain an entry with `"/" : "/*"` covering all paths


<!-- @trace
source: add-universal-links
updated: 2026-04-16
code:
  - src/components/sections/HeroSection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/WebVitalsReporter.tsx
  - .vscode/settings.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/request.ts
  - next.config.ts
  - public/.well-known/apple-app-site-association
  - src/app/favicon.ico
  - src/components/TacticalCursor.tsx
  - .spectra.yaml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/TestimonialsSection.tsx
  - src/lib/useReducedMotion.ts
  - src/components/LegalLayout.tsx
  - src/proxy.ts
  - postcss.config.mjs
  - src/components/SiteNav.tsx
  - src/components/sections/SocialProofSection.tsx
  - messages/en.json
  - eslint.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/app/globals.css
  - messages/zh-TW.json
  - src/components/SiteFooter.tsx
  - src/components/Icon.tsx
  - package.json
  - src/components/sections/FinalCtaSection.tsx
  - src/lib/seo.ts
  - src/app/[locale]/privacy/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/layout.tsx
  - CLAUDE.md
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - tsconfig.json
  - src/i18n/routing.ts
-->

---
### Requirement: Next.js serves AASA with correct Content-Type

The Next.js `next.config.ts` SHALL include a `headers()` configuration that adds `Content-Type: application/json` to the `/.well-known/apple-app-site-association` route. Without this header, iOS will reject the AASA file silently.

#### Scenario: Content-Type header is present

- **WHEN** Next.js serves `/.well-known/apple-app-site-association`
- **THEN** the response SHALL include `Content-Type: application/json` in the headers


<!-- @trace
source: add-universal-links
updated: 2026-04-16
code:
  - src/components/sections/HeroSection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/WebVitalsReporter.tsx
  - .vscode/settings.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/request.ts
  - next.config.ts
  - public/.well-known/apple-app-site-association
  - src/app/favicon.ico
  - src/components/TacticalCursor.tsx
  - .spectra.yaml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/TestimonialsSection.tsx
  - src/lib/useReducedMotion.ts
  - src/components/LegalLayout.tsx
  - src/proxy.ts
  - postcss.config.mjs
  - src/components/SiteNav.tsx
  - src/components/sections/SocialProofSection.tsx
  - messages/en.json
  - eslint.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/app/globals.css
  - messages/zh-TW.json
  - src/components/SiteFooter.tsx
  - src/components/Icon.tsx
  - package.json
  - src/components/sections/FinalCtaSection.tsx
  - src/lib/seo.ts
  - src/app/[locale]/privacy/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/layout.tsx
  - CLAUDE.md
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - tsconfig.json
  - src/i18n/routing.ts
-->

---
### Requirement: webcredentials are declared for Shared Web Credentials

The AASA file SHALL include a `webcredentials` key listing the same App ID, enabling Shared Web Credentials (AutoFill password sharing between the website and the app).

#### Scenario: webcredentials key is present

- **WHEN** the AASA file is parsed
- **THEN** a `webcredentials.apps` array SHALL exist containing the DailyVal App ID

<!-- @trace
source: add-universal-links
updated: 2026-04-16
code:
  - src/components/sections/HeroSection.tsx
  - src/app/[locale]/tos/page.tsx
  - src/components/WebVitalsReporter.tsx
  - .vscode/settings.json
  - src/components/LocaleSwitcher.tsx
  - src/i18n/request.ts
  - next.config.ts
  - public/.well-known/apple-app-site-association
  - src/app/favicon.ico
  - src/components/TacticalCursor.tsx
  - .spectra.yaml
  - README.md
  - src/components/sections/FeaturesSection.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/TestimonialsSection.tsx
  - src/lib/useReducedMotion.ts
  - src/components/LegalLayout.tsx
  - src/proxy.ts
  - postcss.config.mjs
  - src/components/SiteNav.tsx
  - src/components/sections/SocialProofSection.tsx
  - messages/en.json
  - eslint.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/app/globals.css
  - messages/zh-TW.json
  - src/components/SiteFooter.tsx
  - src/components/Icon.tsx
  - package.json
  - src/components/sections/FinalCtaSection.tsx
  - src/lib/seo.ts
  - src/app/[locale]/privacy/page.tsx
  - src/app/[locale]/page.tsx
  - src/app/layout.tsx
  - CLAUDE.md
  - dailyval-project-spec.md
  - src/components/sections/CommunitySection.tsx
  - tsconfig.json
  - src/i18n/routing.ts
-->