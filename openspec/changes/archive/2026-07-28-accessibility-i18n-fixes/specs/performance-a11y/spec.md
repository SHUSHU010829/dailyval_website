## MODIFIED Requirements

### Requirement: SEO meta framework

Every page SHALL export Next.js `generateMetadata` (or static `metadata`) returning at minimum: `title`, `description`, `openGraph` (with locale-specific `og:image`), `twitter`, and `alternates.languages` for both supported locales. Strings MUST come from `messages/<locale>.json` or per-page metadata files; inline hard-coded English in non-English pages is forbidden, EXCEPT for the body content of legal documents (Terms of Service, Privacy Policy) where no reviewed translation exists yet. For that exception, the page MUST render a translated notice (sourced from `messages/<locale>.json`) informing the user that the document is only available in English when the current locale is not `en`.

#### Scenario: Localized title is emitted

- **WHEN** a crawler fetches `/zh-TW/`
- **THEN** the response `<title>` SHALL be the value from `messages/zh-TW.json` `meta.home.title`

#### Scenario: Alternates expose both locales

- **WHEN** any page renders metadata
- **THEN** `alternates.languages` SHALL contain entries for both `zh-TW` and `en` resolving to the equivalent path under each locale

#### Scenario: Legal pages disclose untranslated content

- **WHEN** a `zh-TW` user visits `/zh-TW/tos` or `/zh-TW/privacy`
- **THEN** the page SHALL render a translated notice (in Traditional Chinese) stating the document is only available in English, before the English legal body content

## ADDED Requirements

### Requirement: Translation array access resilience

Components that read array or object values via `t.raw(key)` SHALL guard against a missing or malformed translation key so that a missing key degrades to a safe fallback (e.g. an empty array) instead of throwing during render.

#### Scenario: Missing translation key does not crash the page

- **WHEN** `t.raw(key)` is called for a key that does not exist in the current locale's message file
- **THEN** the component SHALL render using a safe fallback value instead of throwing an unhandled exception

### Requirement: Skip-to-content link

Every locale-prefixed page SHALL expose a skip-to-content link as the first focusable element in the DOM, which SHALL move keyboard focus to the page's main content landmark when activated.

#### Scenario: Keyboard user skips repeated navigation

- **WHEN** a keyboard user presses Tab immediately after a page loads
- **THEN** the first focusable element SHALL be a "skip to content" link, and activating it SHALL move focus to the `<main>` landmark

### Requirement: Form status announcements

Forms that display an asynchronous success or error status after submission SHALL mark the status container with `role="alert"` (or an equivalent `aria-live` region) so assistive technology announces the outcome without requiring the user to move focus manually.

#### Scenario: Screen reader announces submission error

- **WHEN** `CreatorApplicationForm` submission fails and the error status renders
- **THEN** the error container SHALL have `role="alert"` so screen readers announce it automatically

### Requirement: Custom form controls expose focus-visible styling

Interactive form controls that are not native `<button>`/`<input>` elements with default browser focus rings (e.g. chip-style toggle buttons with `role="checkbox"`, custom-styled `<select>`/checkbox elements) SHALL provide a visible `:focus-visible` style so keyboard users can identify the focused control.

#### Scenario: Keyboard user can see which chip is focused

- **WHEN** a keyboard user tabs to a language or platform selection chip in `CreatorApplicationForm`
- **THEN** the focused chip SHALL show a visible focus outline

### Requirement: Mobile download bar does not obscure page content

On viewports where `MobileDownloadBar` can appear, the page's main content area SHALL reserve enough bottom spacing that the bar (when visible) does not visually cover footer content.

#### Scenario: Footer remains fully visible on mobile

- **WHEN** a user on a mobile viewport scrolls to the bottom of any page and `MobileDownloadBar` is visible
- **THEN** all footer content SHALL remain unobscured by the bar

### Requirement: Native cursor remains visible when the custom cursor is not rendered

When `TacticalCursor` does not mount its custom crosshair (reduced motion preference, non-fine pointer, or before client-side hydration completes), the browser's native cursor SHALL remain visible. The global `cursor: none` rule SHALL only apply within `@media (prefers-reduced-motion: no-preference) and (pointer: fine)`.

#### Scenario: Reduced-motion user sees a cursor

- **WHEN** a user with `prefers-reduced-motion: reduce` loads any page
- **THEN** the native OS cursor SHALL be visible while moving the mouse over the page
