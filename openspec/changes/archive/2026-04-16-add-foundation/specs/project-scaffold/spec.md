## ADDED Requirements

### Requirement: App Router directory structure

The project SHALL organize routes under `src/app/[locale]/` so that every user-facing page is locale-scoped, with the root `src/app/layout.tsx` providing only HTML shell concerns and `src/app/[locale]/layout.tsx` providing locale-aware providers.

#### Scenario: Root layout renders HTML shell

- **WHEN** any request reaches the application
- **THEN** `src/app/layout.tsx` SHALL render the `<html>` and `<body>` elements with the active locale on `<html lang>` and SHALL NOT render any UI chrome

#### Scenario: Locale layout wraps all pages

- **WHEN** a request resolves to `/zh-TW/...` or `/en/...`
- **THEN** `src/app/[locale]/layout.tsx` SHALL provide the i18n message provider, font variables, and global Nav/Footer slots to its children

### Requirement: Placeholder pages exist for all planned routes

The scaffold SHALL provide minimum-viable pages for `/`, `/tos`, `/privacy`, and `/support` under `[locale]` so that routing, i18n, and layout can be verified end-to-end before feature work begins.

#### Scenario: Placeholder route returns 200

- **WHEN** the dev server is running and a user navigates to `/zh-TW/tos`, `/zh-TW/privacy`, or `/zh-TW/support`
- **THEN** the page SHALL respond with HTTP 200 and render a placeholder heading translated via the i18n provider

### Requirement: Required runtime dependencies installed

The scaffold SHALL declare `next-intl`, `@phosphor-icons/react`, `framer-motion`, `gsap`, `@next/mdx`, and `@mdx-js/react` in `package.json` so that subsequent changes can import them without dependency churn.

#### Scenario: Build succeeds with all dependencies resolved

- **WHEN** `npm run build` is executed after the change is applied
- **THEN** the build SHALL complete successfully and SHALL NOT report missing modules for any of the listed dependencies

### Requirement: MDX support is wired into Next.js config

The scaffold SHALL configure `next.config.ts` to process `.mdx` files via `@next/mdx` so that the legal-pages change can author content in MDX without further config edits.

#### Scenario: MDX file imports as a React component

- **WHEN** a `.mdx` file is placed under `src/content/<locale>/` and imported from a route
- **THEN** Next.js SHALL compile it to a React component and render it without runtime errors
