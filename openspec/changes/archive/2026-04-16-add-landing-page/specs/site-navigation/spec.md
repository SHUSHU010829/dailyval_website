## ADDED Requirements

### Requirement: Logo display and home link

The navigation component SHALL render the DailyVal logo/wordmark as a clickable link that navigates to the locale-prefixed home page (`/<locale>`).

#### Scenario: Logo navigates home

- **WHEN** user clicks the logo in the navigation bar
- **THEN** the browser navigates to the home page for the current locale

#### Scenario: Logo is visible on all viewport sizes

- **WHEN** the page is rendered at any viewport width (320px and above)
- **THEN** the logo SHALL be visible and not clipped

### Requirement: Desktop navigation links

The navigation component SHALL render navigation links in a horizontal row on viewports 768px and wider. Links SHALL include: "功能" (Features section anchor), "社群" (Community section anchor), "關於" (About anchor or page).

#### Scenario: Desktop links are visible

- **WHEN** viewport width is 768px or wider
- **THEN** all navigation links SHALL be displayed in a horizontal layout
- **THEN** the hamburger menu button SHALL NOT be visible

#### Scenario: Navigation link is keyboard accessible

- **WHEN** user focuses a navigation link via Tab key
- **THEN** the link SHALL display a visible focus ring meeting WCAG AA standards

### Requirement: Mobile hamburger menu

The navigation component SHALL render a hamburger toggle button on viewports narrower than 768px. Pressing the toggle SHALL show or hide the mobile navigation menu.

#### Scenario: Hamburger button opens menu

- **WHEN** viewport width is less than 768px
- **THEN** a hamburger icon button with `aria-label` SHALL be visible
- **WHEN** user clicks or taps the hamburger button
- **THEN** the mobile menu SHALL expand and show all navigation links

#### Scenario: Hamburger button closes menu

- **WHEN** the mobile menu is open
- **WHEN** user clicks the hamburger button again
- **THEN** the mobile menu SHALL collapse and hide navigation links

#### Scenario: Escape key closes mobile menu

- **WHEN** the mobile menu is open
- **WHEN** user presses the Escape key
- **THEN** the mobile menu SHALL collapse

#### Scenario: Focus moves to first link on open

- **WHEN** the mobile menu opens
- **THEN** focus SHALL move to the first navigation link in the menu

### Requirement: Locale switcher in navigation

The navigation component SHALL include a locale switcher that allows users to switch between `zh-TW` and `en`. Switching locale SHALL preserve the current page path and set the `NEXT_LOCALE` cookie.

#### Scenario: Locale switch preserves path

- **WHEN** user is on `/zh-TW/` and switches to English
- **THEN** the browser navigates to `/en/`

#### Scenario: Current locale is indicated

- **WHEN** the navigation renders
- **THEN** the currently active locale SHALL be visually distinguished (e.g., active style or `aria-current`)

### Requirement: Navigation accessibility

The navigation component SHALL use semantic HTML and ARIA attributes: `<nav>` element with `aria-label="主要導航"`, hamburger button with `aria-expanded` state, mobile menu panel with appropriate role.

#### Scenario: Nav has accessible label

- **WHEN** a screen reader announces the navigation region
- **THEN** it SHALL read an accessible label identifying it as the primary navigation

#### Scenario: Hamburger aria-expanded reflects state

- **WHEN** mobile menu is closed
- **THEN** hamburger button `aria-expanded` SHALL be `"false"`
- **WHEN** mobile menu is open
- **THEN** hamburger button `aria-expanded` SHALL be `"true"`

### Requirement: Reduced motion compliance

All navigation animations (menu slide-in, transition effects) SHALL be gated behind `prefers-reduced-motion: no-preference`. When reduced motion is preferred, transitions SHALL be instant.

#### Scenario: No animation under reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is set in the OS
- **WHEN** user opens the mobile menu
- **THEN** the menu SHALL appear instantly without slide or fade animation
