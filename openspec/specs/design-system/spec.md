# design-system Specification

## Purpose

Defines the site's shared HUD visual language: CSS color tokens, the Orbitron/Rajdhani/Noto Sans TC typography stack, clip-path/glow/circuit-grid visual utilities, the tactical cursor, and the Phosphor icon wrapper that every component builds on.

## Requirements

### Requirement: CSS color tokens

The design system SHALL expose all brand colors as CSS custom properties on `:root` in `src/app/globals.css`. The token set MUST include `--bg-base`, `--bg-panel`, `--bg-panel-hover`, `--bg-elevated`, `--val-red`, `--val-red-glow`, `--jett-blue`, `--viper-green`, `--omen-purple`, `--gold`, `--text-1`, `--text-2`, `--text-3`, `--border-dim`, `--border-med`, and `--border-bright`, each set to the exact hex/rgba values defined in the project spec. `--text-3` MUST be `rgba(234, 234, 240, 0.5)` (raised from a prior value of `0.3` to meet WCAG AA contrast requirements at the small font sizes it is used at throughout the site).

#### Scenario: Token is consumable from Tailwind utility

- **WHEN** a component uses `bg-[var(--val-red)]` or a `@theme`-mapped utility such as `bg-val-red`
- **THEN** the rendered element SHALL have background color `#FF4655`

#### Scenario: `--text-3` meets contrast on `--bg-base`

- **WHEN** `--text-3` is rendered as text color on `--bg-base`
- **THEN** the contrast ratio SHALL be at least 4.5:1


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
### Requirement: Typography stack

The design system SHALL load Orbitron, Rajdhani, and Noto Sans TC from Google Fonts using `next/font` (or equivalent `display=swap` + `preconnect`) and SHALL expose them as Tailwind v4 theme tokens `font-display`, `font-ui`, and `font-body`. Body text MUST default to Noto Sans TC; Orbitron MUST NOT be applied to long-form paragraph text.

#### Scenario: Default body uses Noto Sans TC

- **WHEN** any page renders without an explicit font utility
- **THEN** computed `font-family` on `<body>` SHALL resolve to Noto Sans TC

#### Scenario: Display utility uses Orbitron

- **WHEN** an element uses `font-display`
- **THEN** its computed `font-family` SHALL resolve to Orbitron


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
### Requirement: Visual utilities

The design system SHALL provide reusable utilities for: clip-path corner cuts (driven by `--cut: 12px`), glitch text effect, CRT scanline overlay, neon glow box-shadow / text-shadow, circuit-board grid background, and a centered diamond divider. Each utility MUST be implementable via a single class name.

#### Scenario: Cut utility applies clip-path

- **WHEN** a component applies the cut utility class
- **THEN** the element SHALL render with the four-corner cut polygon clip-path matching `--cut`

#### Scenario: Neon glow utility applies shadow

- **WHEN** a component applies a neon glow utility tied to `--val-red`
- **THEN** the element SHALL receive a `box-shadow` (or `text-shadow` variant) using `--val-red-glow`


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
### Requirement: Tactical cursor

The application SHALL set the global cursor to `crosshair` and SHALL render a 4px `--val-red` follower dot that lags the pointer with ~120ms easing. Clicking any element with the `data-cta` attribute SHALL spawn an X-shaped hitmarker animation lasting ~300ms at the click position. The follower dot and hitmarker MUST NOT render when `prefers-reduced-motion: reduce` is active.

#### Scenario: Reduced motion disables follower

- **WHEN** the OS reports `prefers-reduced-motion: reduce`
- **THEN** the follower dot SHALL NOT be mounted and click hitmarkers SHALL NOT animate

#### Scenario: CTA click produces hitmarker

- **WHEN** the user clicks an element with `data-cta` and motion is allowed
- **THEN** an X-shaped marker SHALL appear at the click coordinates and fade out within 400ms


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
### Requirement: Phosphor icon wrapper

The design system SHALL provide a single `<Icon>` component that wraps `@phosphor-icons/react` and enforces the `bold` weight as default, accepts a `size` prop (default 24), and inherits color via `currentColor`. Direct imports of `@phosphor-icons/react` icons in feature components are forbidden.

#### Scenario: Icon inherits text color

- **WHEN** `<Icon name="Storefront" />` is rendered inside a `text-[var(--val-red)]` container
- **THEN** the rendered SVG SHALL have stroke/fill bound to `currentColor` and visually appear in `--val-red`

#### Scenario: Default weight is bold

- **WHEN** `<Icon name="Star" />` is rendered with no weight prop
- **THEN** the underlying Phosphor component SHALL receive `weight="bold"`

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