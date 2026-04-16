## ADDED Requirements

### Requirement: Supported locales and default

The application SHALL support exactly two locales: `zh-TW` and `en`. The default locale SHALL be `zh-TW`. The locale list SHALL be defined in a single `src/i18n/routing.ts` module that is the sole source of truth for both middleware and route generation.

#### Scenario: Unknown locale falls back to default

- **WHEN** a request URL contains a locale segment that is not `zh-TW` or `en`
- **THEN** the middleware SHALL respond with a redirect to the same path under the default locale `zh-TW`

### Requirement: Locale-prefixed URLs

Every user-facing page SHALL be served from a URL whose first path segment is the locale (e.g. `/zh-TW/tos`, `/en/`). Requests to the root `/` SHALL be redirected to the locale chosen by the detection rules below.

#### Scenario: Root request is redirected to detected locale

- **WHEN** an unauthenticated browser requests `/` with `Accept-Language: en-US,en;q=0.9`
- **THEN** the middleware SHALL respond with a 307 redirect to `/en`

#### Scenario: Root request with no language preference uses default

- **WHEN** a request to `/` has no `Accept-Language` header or no supported match
- **THEN** the middleware SHALL redirect to `/zh-TW`

### Requirement: Manual locale switching

The application SHALL provide a `<LocaleSwitcher>` component that lets the user switch between `zh-TW` and `en` while preserving the current pathname and persisting the choice.

#### Scenario: Switching preserves the current path

- **WHEN** the user is on `/zh-TW/tos` and selects `EN` from the locale switcher
- **THEN** the browser SHALL navigate to `/en/tos` without losing the page

#### Scenario: Manual choice persists across visits

- **WHEN** the user manually selects a locale
- **THEN** the application SHALL set a `NEXT_LOCALE` cookie so that future visits to `/` redirect to the chosen locale instead of running `Accept-Language` detection

### Requirement: Translated UI strings via next-intl

UI text MUST be loaded from JSON message files at `messages/zh-TW.json` and `messages/en.json` and consumed via `next-intl` hooks. Hard-coded user-facing strings in components are forbidden.

#### Scenario: Component reads translated label

- **WHEN** a component calls `useTranslations('nav').t('download')`
- **THEN** it SHALL return the value from `messages/<active-locale>.json` under the `nav.download` key

### Requirement: hreflang and html lang attributes

The application SHALL set `<html lang>` to the active locale and SHALL emit `<link rel="alternate" hreflang>` tags for every supported locale plus `x-default` on every page.

#### Scenario: Page exposes alternates

- **WHEN** a crawler fetches `/en/tos`
- **THEN** the response HTML SHALL contain `<html lang="en">`, an alternate link to `/zh-TW/tos` with `hreflang="zh-TW"`, an alternate link to `/en/tos` with `hreflang="en"`, and an `x-default` alternate
