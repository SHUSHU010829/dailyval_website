## ADDED Requirements

### Requirement: Hero section renders with headline and CTA

The landing page SHALL render a Hero section as the first visible content block. The Hero SHALL display a primary headline, a supporting subheadline, and a primary CTA button. All text SHALL be sourced from i18n translation keys.

#### Scenario: Hero is the first content section

- **WHEN** user loads the home page
- **THEN** the Hero section SHALL appear above the fold (above 600px viewport height)

#### Scenario: CTA button is reachable via keyboard

- **WHEN** user navigates via Tab key
- **THEN** the primary CTA button SHALL receive focus and display a visible focus ring

#### Scenario: Hero CTA links to waitlist anchor

- **WHEN** user clicks the primary CTA button
- **THEN** the browser SHALL scroll to or navigate to `#waitlist` anchor on the page

### Requirement: Hero section has decorative background without large images

The Hero section SHALL use CSS gradients and SVG decorations only—no raster images—to preserve LCP performance (target LCP ≤ 1.2s).

#### Scenario: Hero LCP element is not a large raster image

- **WHEN** page performance is analyzed with Lighthouse
- **THEN** the LCP element SHALL NOT be an `<img>` or background-image referencing a raster file larger than 50 KB

### Requirement: Social Proof section displays numeric statistics

The landing page SHALL include a Social Proof section with at least 3 numeric statistics (e.g., registered players, matches analyzed, daily active users). Numbers and labels SHALL be sourced from i18n translation keys to allow localization.

#### Scenario: Statistics are displayed

- **WHEN** user scrolls to the Social Proof section
- **THEN** at least 3 stat items SHALL be visible, each with a numeric value and a descriptive label

#### Scenario: Social Proof section is keyboard reachable

- **WHEN** user navigates to the Social Proof section via keyboard
- **THEN** all interactive elements (if any) within the section SHALL be focusable

### Requirement: Features section has three feature cards

The landing page SHALL include a Features section with exactly 3 feature cards: (3a) 賽局分析 (Match Analysis), (3b) 角色精通 (Agent Mastery), (3c) 每日任務 (Daily Missions). Each card SHALL display an icon (Phosphor Icons), a title, and a description from i18n translation keys.

#### Scenario: All three feature cards are displayed

- **WHEN** user views the Features section
- **THEN** exactly 3 feature cards SHALL be visible, each with an icon, title, and description

#### Scenario: Features cards are responsive

- **WHEN** viewport width is less than 768px
- **THEN** feature cards SHALL stack vertically (one column)
- **WHEN** viewport width is 768px or wider
- **THEN** feature cards SHALL display in a multi-column grid (2 or 3 columns)

#### Scenario: Feature icons are accessible

- **WHEN** a screen reader encounters a feature card icon
- **THEN** the icon SHALL have `aria-hidden="true"` so the screen reader skips it (the card title provides the label)

### Requirement: Community Hub section provides a social call-to-action

The landing page SHALL include a Community Hub section that invites users to join the community (Discord or equivalent). The section SHALL display a heading, a brief description, and a link/button to join. The join link SHALL open in a new tab with `rel="noopener noreferrer"`.

#### Scenario: Community join link works

- **WHEN** user clicks the community join button/link
- **THEN** the link SHALL open in a new browser tab
- **THEN** the link target SHALL have `rel="noopener noreferrer"` attribute

#### Scenario: Join link has accessible label

- **WHEN** screen reader focuses on the community join link
- **THEN** the link SHALL have a descriptive accessible name (not just "click here")

### Requirement: Testimonials section displays player quotes

The landing page SHALL include a Testimonials section with at least 3 player quote items. Each item SHALL display a quote text, author name, and rank/role. Content SHALL be sourced from i18n translation keys (`testimonials.items` array).

#### Scenario: Testimonials are displayed

- **WHEN** user views the Testimonials section
- **THEN** at least 3 testimonial items SHALL be visible, each with quote, author, and rank

#### Scenario: Testimonials are readable without motion

- **WHEN** `prefers-reduced-motion: reduce` is set
- **WHEN** Testimonials section is rendered
- **THEN** all testimonial items SHALL be static (no auto-rotating carousel animation)

### Requirement: Final CTA section reinforces conversion

The landing page SHALL include a Final CTA section near the bottom of the page with a headline, a supporting description, and a CTA button. The CTA button SHALL target the same `#waitlist` anchor or be functionally equivalent to the Hero CTA.

#### Scenario: Final CTA is visible above the footer

- **WHEN** user scrolls to the bottom of the landing page
- **THEN** the Final CTA section SHALL appear before the footer

#### Scenario: Final CTA button is keyboard accessible

- **WHEN** user tabs to the Final CTA button
- **THEN** it SHALL receive focus and display a visible focus ring

### Requirement: Landing page sections use landmark roles

Each major landing page section SHALL be wrapped in a `<section>` element with an `aria-labelledby` pointing to its heading element, enabling screen reader landmark navigation.

#### Scenario: Sections have accessible landmarks

- **WHEN** screen reader lists page landmarks
- **THEN** each major section SHALL be announced with its heading as the landmark label

### Requirement: Landing page content is fully internationalized

All visible text content (headings, descriptions, button labels, stat values, feature titles, testimonials) on the landing page SHALL be sourced from `messages/zh-TW.json` and `messages/en.json` via i18n translation keys. No hardcoded English-only or Chinese-only strings SHALL exist in component files.

#### Scenario: English locale renders English content

- **WHEN** user navigates to `/en/`
- **THEN** all landing page text SHALL be in English

#### Scenario: Chinese locale renders Chinese content

- **WHEN** user navigates to `/zh-TW/`
- **THEN** all landing page text SHALL be in Traditional Chinese
