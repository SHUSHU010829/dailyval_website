## MODIFIED Requirements

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
