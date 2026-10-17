## MODIFIED Requirements

### Requirement: Sitemap enumerates all public routes

The application SHALL expose `src/app/sitemap.ts` implementing Next.js's `MetadataRoute.Sitemap` export. The generated sitemap SHALL include an entry for every combination of supported locale (`en`, `zh-TW`) and public static route, including `/community`, using absolute URLs built from the site's base URL. It SHALL additionally include `/community/post/<id>` entries for published community posts and `/community/user/<id>` entries for their authors, for each locale, and MUST still return the static entries when the community data source is unavailable.

#### Scenario: Sitemap includes the community board for every locale

- **WHEN** `/sitemap.xml` is requested
- **THEN** the response SHALL contain `/en/community` and `/zh-TW/community` as absolute URLs

#### Scenario: Community posts are listed

- **WHEN** the community data source returns a post with id `P` and author id `A`
- **THEN** the sitemap SHALL contain `/en/community/post/P`, `/zh-TW/community/post/P`, `/en/community/user/A` and `/zh-TW/community/user/A`, with exactly one user entry per author per locale

#### Scenario: Data source unavailable

- **WHEN** the community data source request fails
- **THEN** the sitemap SHALL still be returned with every static entry

## ADDED Requirements

### Requirement: Community pages expose metadata and a post OG image

Each community route SHALL set metadata through the shared metadata helper with a canonical path under `/community`. A community post page SHALL use Open Graph type `article` and an image from `/og/community-post?id=<id>&locale=<locale>`. The OG route SHALL accept only `id` and `locale`, MUST fetch the post server-side, MUST NOT render text supplied through query parameters, and SHALL embed an image only when its host matches the configured media host. Pages for missing posts or authors SHALL set `robots` to `noindex`.

#### Scenario: Post metadata

- **WHEN** a published post page is rendered
- **THEN** its metadata SHALL contain an `article` Open Graph type and the `/og/community-post` image URL

#### Scenario: OG route rejects invalid id

- **WHEN** `/og/community-post?id=abc` is requested
- **THEN** the route SHALL return the brand fallback card and MUST NOT query the data source

#### Scenario: Foreign image host

- **WHEN** a post's first image is hosted outside the configured media host
- **THEN** the OG image SHALL omit that image

#### Scenario: Missing post is not indexed

- **WHEN** a post id is a valid UUID but no post exists
- **THEN** the page metadata SHALL include `robots` with `index` false
