# announcements Specification

## Purpose

Defines the announcements area: the `/<locale>/announcements` list, the `/<locale>/announcements/<slug>` detail page the iOS app links to from its Firestore-driven announcement list, the home-page notice strip, and where the announcement content lives while it is hard-coded.

## Requirements

### Requirement: Announcement content source

Announcement content SHALL live in `src/lib/announcements.ts` as typed records (`slug`, `status` one of `investigating` / `fixPending` / `resolved` / `released` / `change` / `event`, `publishedAt`, optional `updatedAt`, optional `endsAt` (ISO 8601 with offset, events only), per-locale `title` / `summary` / `sections`). `change` marks an explanation of an app feature change (a feature removed or altered). `event` marks a time-limited event such as a giveaway, active until its `endsAt`. Pages SHALL only consume the locale-resolved `Announcement` shape returned by `getAnnouncements` / `getAnnouncement`, so a later data source (for example the Firestore `news` collection the app reads) can replace the constant without touching the pages.

#### Scenario: Locale fallback

- **WHEN** an announcement is resolved for a locale that has no copy
- **THEN** the default locale's copy SHALL be used

### Requirement: Announcement list page

`/<locale>/announcements` SHALL list every announcement newest first, each as a card showing its status badge, published date, title and summary, linking to the detail page. With no announcements it SHALL render the localized empty message. The page SHALL carry `meta.announcements` metadata through `buildMetadata` and SHALL be listed in the sitemap.

#### Scenario: List renders cards

- **WHEN** a user opens `/zh-TW/announcements`
- **THEN** each announcement SHALL appear as a card with a localized status label and a date formatted for the locale

### Requirement: Announcement detail page

`/<locale>/announcements/<slug>` SHALL render the status badge, published (and updated, when set) dates, title, summary and body sections (headings, paragraphs, an optional quote, bullet lists, button links, images). A section's button links (for example an event's social post) open in a new tab. A section's quote reproduces an outside source verbatim (for example Riot's patch notes) as a `blockquote` with a localized source line (`announcements.quoteSource`) linking to the original in a new tab. Unknown slugs SHALL return 404. All slugs SHALL be statically generated and listed in the sitemap. The page's `<title>` SHALL come from `meta.announcementDetail.title` with the announcement title interpolated; its description SHALL be the summary.

#### Scenario: Detail opens from the iOS app

- **WHEN** the app's Firestore `news` document points its `url` at a detail page
- **THEN** the page SHALL render the full announcement inside the app's web view without requiring sign-in

#### Scenario: Unknown slug

- **WHEN** a user opens `/en/announcements/does-not-exist`
- **THEN** the site SHALL respond with the 404 page

### Requirement: Home-page notice strip

The home page SHALL show a single-line notice above the hero linking to the newest announcement that is still active: an issue with status `investigating` or `fixPending`, a `released` or `change` announcement published within the last 14 days, or an `event` announcement that is published and whose `endsAt` has not passed (an event without `endsAt` is never active). `resolved` issues and older release or change announcements SHALL NOT render the strip; when nothing is active the strip SHALL not render.

#### Scenario: Active issue

- **WHEN** an announcement has status `investigating` or `fixPending`
- **THEN** the home page SHALL render the notice strip with that announcement's title

#### Scenario: Fresh release announcement

- **WHEN** a `released` announcement was published fewer than 14 days ago and no issue is active
- **THEN** the home page SHALL render the notice strip with that release announcement's title

#### Scenario: Fresh feature change announcement

- **WHEN** a `change` announcement was published fewer than 14 days ago and is newer than any other active announcement
- **THEN** the home page SHALL render the notice strip with that announcement's title

#### Scenario: Running event

- **WHEN** an `event` announcement is published, its `endsAt` has not passed, and it is newer than any other active announcement
- **THEN** the home page SHALL render the notice strip with that event's title until `endsAt`

#### Scenario: Release announcement ages out

- **WHEN** the newest `released` announcement is 14 or more days old and no issue is active
- **THEN** the strip SHALL not render

### Requirement: Footer entry

The footer's Support group SHALL include an "Announcements" link to `/announcements`, labelled from the `footer.supportGroup.links.announcements` i18n key.


<!-- @trace
source: add-announcements
updated: 2026-10-13
code:
  - src/lib/announcements.ts
  - src/lib/announcements.test.ts
  - src/app/[locale]/announcements/page.tsx
  - src/app/[locale]/announcements/[slug]/page.tsx
  - src/app/globals.css
  - src/components/announcements/AnnouncementCard.tsx
  - src/components/announcements/AnnouncementNotice.tsx
  - src/components/announcements/AnnouncementStatusBadge.tsx
  - src/components/SiteFooter.tsx
  - src/components/Icon.tsx
  - src/app/[locale]/page.tsx
  - src/app/sitemap.ts
  - messages/en.json
  - messages/zh-TW.json
-->
