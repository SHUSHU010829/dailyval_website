# legal-pages Specification

## Purpose

Defines the Terms of Service, Privacy Policy, and Support pages: their content requirements, the shared `LegalLayout` component they use, and their SEO metadata.

## Requirements

### Requirement: Terms of Service page content

The Terms of Service page at `/<locale>/tos` SHALL render complete legal content in English for all locales, since no legally reviewed Traditional Chinese translation of this document exists yet. Content SHALL cover service description, account eligibility, Riot Games API third-party terms, in-app purchases, user-generated content rules, intellectual property, disclaimer, governing law, and contact information. When the current locale is not `en`, the page SHALL additionally render a translated notice (see `performance-a11y`'s "legal pages disclose untranslated content" requirement) informing the user the document is only available in English.

#### Scenario: TOS renders in English regardless of locale

- **WHEN** user navigates to `/zh-TW/tos` or `/en/tos`
- **THEN** the page SHALL display the full Terms of Service content in English in both cases
- **THEN** the page's localized `<title>` SHALL still come from the `meta.tos` i18n namespace for the current locale

#### Scenario: zh-TW users see an English-only notice

- **WHEN** user navigates to `/zh-TW/tos`
- **THEN** a translated notice SHALL appear above the legal content stating the document is only available in English

#### Scenario: TOS has back navigation link

- **WHEN** TOS page is rendered
- **THEN** a link back to the home page for the current locale SHALL be visible at the top of the page


<!-- @trace
source: add-legal-pages
updated: 2026-04-16
code:
  - src/lib/seo.ts
  - messages/zh-TW.json
  - src/components/sections/HeroSection.tsx
  - src/components/LocaleSwitcher.tsx
  - src/components/SiteNav.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/components/WebVitalsReporter.tsx
  - tsconfig.json
  - src/components/LegalLayout.tsx
  - src/components/sections/SocialProofSection.tsx
  - src/components/SiteFooter.tsx
  - src/app/[locale]/page.tsx
  - eslint.config.mjs
  - src/app/[locale]/tos/page.tsx
  - src/proxy.ts
  - .vscode/settings.json
  - src/i18n/routing.ts
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - package.json
  - src/app/globals.css
  - src/components/sections/CommunitySection.tsx
  - dailyval-project-spec.md
  - src/app/[locale]/privacy/page.tsx
  - .spectra.yaml
  - postcss.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/components/TacticalCursor.tsx
  - public/.well-known/apple-app-site-association
  - src/components/sections/FinalCtaSection.tsx
  - messages/en.json
  - README.md
  - src/app/favicon.ico
  - CLAUDE.md
  - next.config.ts
  - src/i18n/request.ts
  - src/lib/useReducedMotion.ts
-->

---
### Requirement: Privacy Policy page content

The Privacy Policy page at `/<locale>/privacy` SHALL render complete privacy content in English for all locales, since no legally reviewed Traditional Chinese translation of this document exists yet, covering data collection scope, usage, third-party sharing (Riot Games API, Apple), data retention (30-day deletion after account removal), children's privacy (13+ requirement), user rights, and contact information. When the current locale is not `en`, the page SHALL additionally render a translated notice informing the user the document is only available in English.

#### Scenario: Privacy renders in English regardless of locale

- **WHEN** user navigates to `/zh-TW/privacy` or `/en/privacy`
- **THEN** the page SHALL display the full Privacy Policy content in English in both cases

#### Scenario: zh-TW users see an English-only notice

- **WHEN** user navigates to `/zh-TW/privacy`
- **THEN** a translated notice SHALL appear above the legal content stating the document is only available in English

#### Scenario: Privacy page includes contact email

- **WHEN** Privacy Policy page is rendered
- **THEN** a mailto link to `support@dailyval.com` SHALL be present for data rights inquiries


<!-- @trace
source: add-legal-pages
updated: 2026-04-16
code:
  - src/lib/seo.ts
  - messages/zh-TW.json
  - src/components/sections/HeroSection.tsx
  - src/components/LocaleSwitcher.tsx
  - src/components/SiteNav.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/components/WebVitalsReporter.tsx
  - tsconfig.json
  - src/components/LegalLayout.tsx
  - src/components/sections/SocialProofSection.tsx
  - src/components/SiteFooter.tsx
  - src/app/[locale]/page.tsx
  - eslint.config.mjs
  - src/app/[locale]/tos/page.tsx
  - src/proxy.ts
  - .vscode/settings.json
  - src/i18n/routing.ts
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - package.json
  - src/app/globals.css
  - src/components/sections/CommunitySection.tsx
  - dailyval-project-spec.md
  - src/app/[locale]/privacy/page.tsx
  - .spectra.yaml
  - postcss.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/components/TacticalCursor.tsx
  - public/.well-known/apple-app-site-association
  - src/components/sections/FinalCtaSection.tsx
  - messages/en.json
  - README.md
  - src/app/favicon.ico
  - CLAUDE.md
  - next.config.ts
  - src/i18n/request.ts
  - src/lib/useReducedMotion.ts
-->

---
### Requirement: Support page renders bilingual FAQ content

The Support page at `/<locale>/support` SHALL render a FAQ-style help center in the current locale. FAQ SHALL address: login/logout issues, Riot account linking, daily shop data delays, push notification troubleshooting, match history delays, cross-player lookup, in-app purchase issues, account deletion, and bug reporting.

#### Scenario: Support renders in Chinese for zh-TW locale

- **WHEN** user navigates to `/zh-TW/support`
- **THEN** the page SHALL display support content in Traditional Chinese

#### Scenario: Support renders in English for en locale

- **WHEN** user navigates to `/en/support`
- **THEN** the page SHALL display support content in English

#### Scenario: Support page includes contact email

- **WHEN** Support page is rendered
- **THEN** a mailto link to `support@dailyval.com` SHALL be visible for unresolved issues


<!-- @trace
source: add-legal-pages
updated: 2026-04-16
code:
  - src/lib/seo.ts
  - messages/zh-TW.json
  - src/components/sections/HeroSection.tsx
  - src/components/LocaleSwitcher.tsx
  - src/components/SiteNav.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/components/WebVitalsReporter.tsx
  - tsconfig.json
  - src/components/LegalLayout.tsx
  - src/components/sections/SocialProofSection.tsx
  - src/components/SiteFooter.tsx
  - src/app/[locale]/page.tsx
  - eslint.config.mjs
  - src/app/[locale]/tos/page.tsx
  - src/proxy.ts
  - .vscode/settings.json
  - src/i18n/routing.ts
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - package.json
  - src/app/globals.css
  - src/components/sections/CommunitySection.tsx
  - dailyval-project-spec.md
  - src/app/[locale]/privacy/page.tsx
  - .spectra.yaml
  - postcss.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/components/TacticalCursor.tsx
  - public/.well-known/apple-app-site-association
  - src/components/sections/FinalCtaSection.tsx
  - messages/en.json
  - README.md
  - src/app/favicon.ico
  - CLAUDE.md
  - next.config.ts
  - src/i18n/request.ts
  - src/lib/useReducedMotion.ts
-->

---
### Requirement: Legal pages use shared layout component

All three legal pages SHALL use the `LegalLayout` component, which provides a consistent structure: back navigation link, page title (h1), last-updated date or contact email, and a content area styled with `.prose-legal` CSS utilities.

#### Scenario: Legal page has consistent structure

- **WHEN** any legal page is rendered
- **THEN** it SHALL display a back-navigation link, an h1 title, a metadata line (date or contact), and the prose content area

#### Scenario: Prose content is legible

- **WHEN** legal page content is rendered
- **THEN** headings SHALL use `font-display` with uppercase tracking, body text SHALL use `text-text-2` color at 0.9375rem / 1.75 line-height, and list items SHALL be prefixed with a val-red dash


<!-- @trace
source: add-legal-pages
updated: 2026-04-16
code:
  - src/lib/seo.ts
  - messages/zh-TW.json
  - src/components/sections/HeroSection.tsx
  - src/components/LocaleSwitcher.tsx
  - src/components/SiteNav.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/components/WebVitalsReporter.tsx
  - tsconfig.json
  - src/components/LegalLayout.tsx
  - src/components/sections/SocialProofSection.tsx
  - src/components/SiteFooter.tsx
  - src/app/[locale]/page.tsx
  - eslint.config.mjs
  - src/app/[locale]/tos/page.tsx
  - src/proxy.ts
  - .vscode/settings.json
  - src/i18n/routing.ts
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - package.json
  - src/app/globals.css
  - src/components/sections/CommunitySection.tsx
  - dailyval-project-spec.md
  - src/app/[locale]/privacy/page.tsx
  - .spectra.yaml
  - postcss.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/components/TacticalCursor.tsx
  - public/.well-known/apple-app-site-association
  - src/components/sections/FinalCtaSection.tsx
  - messages/en.json
  - README.md
  - src/app/favicon.ico
  - CLAUDE.md
  - next.config.ts
  - src/i18n/request.ts
  - src/lib/useReducedMotion.ts
-->

---
### Requirement: Legal pages have correct SEO metadata

Each legal page SHALL have a unique `<title>` and `<meta name="description">` sourced from the `meta.*` i18n namespace, and canonical + hreflang alternates generated by `buildMetadata()`.

#### Scenario: TOS page has unique title

- **WHEN** search engine crawls `/zh-TW/tos`
- **THEN** the page `<title>` SHALL be "服務條款 — DailyVal"

#### Scenario: Privacy page has unique description

- **WHEN** search engine crawls `/en/privacy`
- **THEN** `<meta name="description">` SHALL describe the privacy policy content

<!-- @trace
source: add-legal-pages
updated: 2026-04-16
code:
  - src/lib/seo.ts
  - messages/zh-TW.json
  - src/components/sections/HeroSection.tsx
  - src/components/LocaleSwitcher.tsx
  - src/components/SiteNav.tsx
  - src/app/[locale]/layout.tsx
  - src/components/sections/FeaturesSection.tsx
  - src/components/WebVitalsReporter.tsx
  - tsconfig.json
  - src/components/LegalLayout.tsx
  - src/components/sections/SocialProofSection.tsx
  - src/components/SiteFooter.tsx
  - src/app/[locale]/page.tsx
  - eslint.config.mjs
  - src/app/[locale]/tos/page.tsx
  - src/proxy.ts
  - .vscode/settings.json
  - src/i18n/routing.ts
  - src/app/layout.tsx
  - src/components/Icon.tsx
  - package.json
  - src/app/globals.css
  - src/components/sections/CommunitySection.tsx
  - dailyval-project-spec.md
  - src/app/[locale]/privacy/page.tsx
  - .spectra.yaml
  - postcss.config.mjs
  - src/app/[locale]/support/page.tsx
  - src/components/TacticalCursor.tsx
  - public/.well-known/apple-app-site-association
  - src/components/sections/FinalCtaSection.tsx
  - messages/en.json
  - README.md
  - src/app/favicon.ico
  - CLAUDE.md
  - next.config.ts
  - src/i18n/request.ts
  - src/lib/useReducedMotion.ts
-->