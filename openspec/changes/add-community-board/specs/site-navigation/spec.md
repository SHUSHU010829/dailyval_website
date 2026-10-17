## MODIFIED Requirements

### Requirement: Desktop navigation links

The navigation component SHALL render navigation links in a horizontal row on viewports 768px and wider. Links SHALL include: "功能" (Features section anchor), "社群" (an internal link to `/<locale>/community`), "關於" (About anchor or page). The "社群" link MUST NOT open in a new tab and MUST NOT point to an external domain.

#### Scenario: Desktop links are visible

- **WHEN** viewport width is 768px or wider
- **THEN** all navigation links SHALL be displayed in a horizontal layout
- **THEN** the hamburger menu button SHALL NOT be visible

#### Scenario: Navigation link is keyboard accessible

- **WHEN** user focuses a navigation link via Tab key
- **THEN** the link SHALL display a visible focus ring meeting WCAG AA standards

#### Scenario: Community link is internal

- **WHEN** a visitor activates the "社群" link on the zh-TW site
- **THEN** the browser SHALL navigate within the site to `/zh-TW/community` in the same tab
