## ADDED Requirements

### Requirement: AdSense script does not load without explicit user consent

The AdSense script (`adsbygoogle.js`) SHALL NOT be injected into the page until the user has made an explicit consent choice. On first visit (no stored consent decision), the page SHALL display a consent banner offering to accept or decline personalized advertising, and the AdSense script SHALL remain unloaded until the user accepts.

#### Scenario: AdSense does not load before a consent decision is made

- **WHEN** a user with no prior stored consent decision loads any page
- **THEN** the `adsbygoogle.js` script tag SHALL NOT be present in the document, and a consent banner SHALL be visible

#### Scenario: AdSense loads after the user accepts

- **WHEN** a user clicks "accept" on the consent banner
- **THEN** the `adsbygoogle.js` script SHALL be injected into the page, and the consent decision SHALL be persisted so the banner does not reappear on subsequent visits

#### Scenario: AdSense remains unloaded after the user declines

- **WHEN** a user clicks "decline" on the consent banner
- **THEN** the `adsbygoogle.js` script SHALL NOT be injected, and the decision SHALL be persisted so the banner does not reappear on subsequent visits

### Requirement: Web ads.txt authorizes the AdSense publisher

The site SHALL serve a `public/ads.txt` file at `/ads.txt` declaring `google.com` as an authorized seller for the site's AdSense publisher ID, per the IAB ads.txt specification.

#### Scenario: ads.txt declares the AdSense publisher ID

- **WHEN** `/ads.txt` is requested
- **THEN** the response SHALL contain a line authorizing `google.com` for the site's `pub-1773132783019070` publisher ID
