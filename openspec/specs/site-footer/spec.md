# site-footer Specification

## Purpose

TBD - created by syncing change 'add-landing-page'. Update Purpose after archive.

## Requirements

### Requirement: Footer link groups

The footer SHALL render navigation links organized into at least 2 groups: (a) Product links (Features, Community, Download/Waitlist), (b) Legal links (Terms of Service, Privacy Policy, Support). All link labels SHALL be sourced from i18n translation keys.

#### Scenario: Footer link groups are visible

- **WHEN** user scrolls to the footer
- **THEN** at least 2 link groups SHALL be displayed, each with a heading and list of links

#### Scenario: Legal links are present

- **WHEN** footer is rendered
- **THEN** links to Terms of Service, Privacy Policy, and Support SHALL be present (links may point to placeholder `#` until add-legal-pages is complete)


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
### Requirement: Footer social icon links

The footer SHALL display social media icon links using Phosphor Icons. Each icon link SHALL have a descriptive `aria-label` and open in a new tab with `rel="noopener noreferrer"`. Required icons: Discord (or equivalent), Twitter/X, GitHub.

#### Scenario: Social links open in new tab

- **WHEN** user clicks a social icon link
- **THEN** the link SHALL open in a new browser tab
- **THEN** `rel="noopener noreferrer"` SHALL be present on the link

#### Scenario: Social icons have accessible labels

- **WHEN** screen reader focuses on a social icon link
- **THEN** the link SHALL announce a meaningful label (e.g., "DailyVal on Discord") not just the icon


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
### Requirement: Footer copyright notice

The footer SHALL display a copyright notice with the current year and "DailyVal". The year SHALL be dynamically generated (not hardcoded) using `new Date().getFullYear()` in a Server Component.

#### Scenario: Copyright year is current

- **WHEN** footer is rendered in year 2026
- **THEN** the copyright notice SHALL display "2026"


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
### Requirement: Footer locale switcher

The footer SHALL include a locale switcher (reusing the `LocaleSwitcher` component) allowing users to switch between `zh-TW` and `en`.

#### Scenario: Footer locale switcher works

- **WHEN** user clicks the locale switcher in the footer
- **THEN** the locale SHALL switch and the page SHALL navigate to the equivalent URL in the new locale


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
### Requirement: Footer uses semantic HTML

The footer SHALL use the `<footer>` HTML element. Link groups SHALL use `<nav>` with `aria-label` or `<ul>` lists. The footer SHALL be distinct from the main `<main>` content region.

#### Scenario: Footer is a landmark

- **WHEN** screen reader lists page landmarks
- **THEN** the footer SHALL be announced as a "contentinfo" region (the implicit ARIA role of `<footer>`)


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
### Requirement: Footer is responsive

The footer SHALL adapt its layout between mobile and desktop viewports. On mobile (< 768px) link groups SHALL stack vertically; on desktop (≥ 768px) link groups SHALL display in a multi-column horizontal layout.

#### Scenario: Mobile footer stacks vertically

- **WHEN** viewport width is less than 768px
- **THEN** footer link groups SHALL be stacked in a single column

#### Scenario: Desktop footer uses multi-column layout

- **WHEN** viewport width is 768px or wider
- **THEN** footer link groups SHALL display side by side in a multi-column grid

<!-- @trace
source: add-landing-page
updated: 2026-04-16
-->

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