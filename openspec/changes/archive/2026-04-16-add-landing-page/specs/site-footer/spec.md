## ADDED Requirements

### Requirement: Footer link groups

The footer SHALL render navigation links organized into at least 2 groups: (a) Product links (Features, Community, Download/Waitlist), (b) Legal links (Terms of Service, Privacy Policy, Support). All link labels SHALL be sourced from i18n translation keys.

#### Scenario: Footer link groups are visible

- **WHEN** user scrolls to the footer
- **THEN** at least 2 link groups SHALL be displayed, each with a heading and list of links

#### Scenario: Legal links are present

- **WHEN** footer is rendered
- **THEN** links to Terms of Service, Privacy Policy, and Support SHALL be present (links may point to placeholder `#` until add-legal-pages is complete)

### Requirement: Footer social icon links

The footer SHALL display social media icon links using Phosphor Icons. Each icon link SHALL have a descriptive `aria-label` and open in a new tab with `rel="noopener noreferrer"`. Required icons: Discord (or equivalent), Twitter/X, GitHub.

#### Scenario: Social links open in new tab

- **WHEN** user clicks a social icon link
- **THEN** the link SHALL open in a new browser tab
- **THEN** `rel="noopener noreferrer"` SHALL be present on the link

#### Scenario: Social icons have accessible labels

- **WHEN** screen reader focuses on a social icon link
- **THEN** the link SHALL announce a meaningful label (e.g., "DailyVal on Discord") not just the icon

### Requirement: Footer copyright notice

The footer SHALL display a copyright notice with the current year and "DailyVal". The year SHALL be dynamically generated (not hardcoded) using `new Date().getFullYear()` in a Server Component.

#### Scenario: Copyright year is current

- **WHEN** footer is rendered in year 2026
- **THEN** the copyright notice SHALL display "2026"

### Requirement: Footer locale switcher

The footer SHALL include a locale switcher (reusing the `LocaleSwitcher` component) allowing users to switch between `zh-TW` and `en`.

#### Scenario: Footer locale switcher works

- **WHEN** user clicks the locale switcher in the footer
- **THEN** the locale SHALL switch and the page SHALL navigate to the equivalent URL in the new locale

### Requirement: Footer uses semantic HTML

The footer SHALL use the `<footer>` HTML element. Link groups SHALL use `<nav>` with `aria-label` or `<ul>` lists. The footer SHALL be distinct from the main `<main>` content region.

#### Scenario: Footer is a landmark

- **WHEN** screen reader lists page landmarks
- **THEN** the footer SHALL be announced as a "contentinfo" region (the implicit ARIA role of `<footer>`)

### Requirement: Footer is responsive

The footer SHALL adapt its layout between mobile and desktop viewports. On mobile (< 768px) link groups SHALL stack vertically; on desktop (≥ 768px) link groups SHALL display in a multi-column horizontal layout.

#### Scenario: Mobile footer stacks vertically

- **WHEN** viewport width is less than 768px
- **THEN** footer link groups SHALL be stacked in a single column

#### Scenario: Desktop footer uses multi-column layout

- **WHEN** viewport width is 768px or wider
- **THEN** footer link groups SHALL display side by side in a multi-column grid
