## ADDED Requirements

### Requirement: Reduced-motion utility

The application SHALL provide a `useReducedMotion()` hook and a corresponding CSS approach (`@media (prefers-reduced-motion: no-preference)`) that ALL animation code (Framer Motion, GSAP, CSS keyframes, tactical cursor) MUST consult before running non-essential motion. When reduced motion is active, decorative animations (glitch, scanline, parallax, countUp, cursor follower) MUST be disabled and replaced with a simple opacity transition or no animation at all.

#### Scenario: Hook reflects OS preference

- **WHEN** the OS setting `prefers-reduced-motion` changes from `no-preference` to `reduce`
- **THEN** subscribing components SHALL re-render with `useReducedMotion()` returning `true`

#### Scenario: CSS animations are gated

- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** the global glitch, scanline, and circuit-grid animations SHALL NOT run

### Requirement: SEO meta framework

Every page SHALL export Next.js `generateMetadata` (or static `metadata`) returning at minimum: `title`, `description`, `openGraph` (with locale-specific `og:image`), `twitter`, and `alternates.languages` for both supported locales. Strings MUST come from `messages/<locale>.json` or per-page metadata files; inline hard-coded English in non-English pages is forbidden.

#### Scenario: Localized title is emitted

- **WHEN** a crawler fetches `/zh-TW/`
- **THEN** the response `<title>` SHALL be the value from `messages/zh-TW.json` `meta.home.title`

#### Scenario: Alternates expose both locales

- **WHEN** any page renders metadata
- **THEN** `alternates.languages` SHALL contain entries for both `zh-TW` and `en` resolving to the equivalent path under each locale

### Requirement: Performance budgets

The production build SHALL meet the following budgets when measured by Lighthouse on a desktop run of `/zh-TW/` after the foundation change is applied: Performance ≥ 90, LCP < 2.5s, CLS < 0.1, INP < 200ms. The scaffold MUST configure `next/font` with `display: 'swap'`, MUST `preconnect` to Google Fonts, and MUST avoid loading GSAP into the root layout bundle.

#### Scenario: GSAP is not in initial bundle

- **WHEN** the production build is analyzed
- **THEN** `gsap` SHALL NOT appear in the initial JS chunk of the root layout and SHALL only be loaded via `next/dynamic` from components that need it

### Requirement: Color contrast and semantic HTML

All text-on-background combinations defined by the design tokens SHALL meet WCAG AA contrast (≥ 4.5:1 for body text, ≥ 3:1 for large text). Pages SHALL use semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and icon-only buttons MUST carry `aria-label`.

#### Scenario: Icon button exposes accessible name

- **WHEN** an icon-only button is rendered (e.g. locale switcher)
- **THEN** it SHALL include an `aria-label` translated via `next-intl`

#### Scenario: Body text meets contrast

- **WHEN** `--text-1` is rendered on `--bg-base`
- **THEN** the contrast ratio SHALL be at least 4.5:1
