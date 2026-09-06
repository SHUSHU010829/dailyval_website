# announcements Specification

## Purpose

Defines the announcements area: the `/<locale>/announcements` list, the `/<locale>/announcements/<slug>` detail page the iOS app links to from its Firestore-driven announcement list, the home-page notice strip, and where the announcement content lives while it is hard-coded.

## Requirements

### Requirement: Announcement content source

Announcement content SHALL live in `src/lib/announcements.ts` as typed records (`slug`, `status`, `publishedAt`, optional `updatedAt`, per-locale `title` / `summary` / `sections`). Pages SHALL only consume the locale-resolved `Announcement` shape returned by `getAnnouncements` / `getAnnouncement`, so a later data source (for example the Firestore `news` collection the app reads) can replace the constant without touching the pages.

#### Scenario: Locale fallback

- **WHEN** an announcement is resolved for a locale that has no copy
- **THEN** the default locale's copy SHALL be used

### Requirement: Announcement list page

`/<locale>/announcements` SHALL list every announcement newest first, each as a card showing its status badge, published date, title and summary, linking to the detail page. With no announcements it SHALL render the localized empty message. The page SHALL carry `meta.announcements` metadata through `buildMetadata` and SHALL be listed in the sitemap.

#### Scenario: List renders cards

- **WHEN** a user opens `/zh-TW/announcements`
- **THEN** each announcement SHALL appear as a card with a localized status label and a date formatted for the locale

### Requirement: Announcement detail page

`/<locale>/announcements/<slug>` SHALL render the status badge, published (and updated, when set) dates, title, summary and body sections (headings, paragraphs, bullet lists). Unknown slugs SHALL return 404. All slugs SHALL be statically generated and listed in the sitemap. The page's `<title>` SHALL come from `meta.announcementDetail.title` with the announcement title interpolated; its description SHALL be the summary.

#### Scenario: Detail opens from the iOS app

- **WHEN** the app's Firestore `news` document points its `url` at a detail page
- **THEN** the page SHALL render the full announcement inside the app's web view without requiring sign-in

#### Scenario: Unknown slug

- **WHEN** a user opens `/en/announcements/does-not-exist`
- **THEN** the site SHALL respond with the 404 page

### Requirement: Home-page notice strip

The home page SHALL show a single-line notice above the hero linking to the newest announcement whose status is not `resolved`. When every announcement is resolved (or none exist) the strip SHALL not render.

#### Scenario: Active announcement

- **WHEN** an announcement has status `investigating` or `fixPending`
- **THEN** the home page SHALL render the notice strip with that announcement's title

### Requirement: Footer entry

The footer's Support group SHALL include an "Announcements" link to `/announcements`, labelled from the `footer.supportGroup.links.announcements` i18n key.


<!-- @trace
source: add-announcements
updated: 2026-09-06
code:
  - src/lib/announcements.ts
  - src/lib/announcements.test.ts
  - src/app/[locale]/announcements/page.tsx
  - src/app/[locale]/announcements/[slug]/page.tsx
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
