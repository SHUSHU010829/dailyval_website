## ADDED Requirements

### Requirement: Community board routes

The site SHALL serve the community board at `/<locale>/community`, single posts at `/<locale>/community/post/<id>`, and author pages at `/<locale>/community/user/<id>`, for both supported locales (`zh-TW`, `en`). A post or author id that is not a valid UUID SHALL result in the not-found page.

#### Scenario: Feed is reachable in both locales

- **WHEN** a visitor requests `/zh-TW/community` or `/en/community`
- **THEN** the page SHALL render the first page of the feed in that locale

#### Scenario: Invalid post id

- **WHEN** a visitor requests `/en/community/post/not-a-uuid`
- **THEN** the site SHALL render the not-found page

### Requirement: Feed pagination and viewer-aware loading

The feed SHALL be server-rendered with its first page and revalidated at most every 30 seconds. The client SHALL load further pages on scroll and through a visible "load more" control. When the viewer is signed in, the client MUST refetch the feed for that viewer, and MUST NOT present the anonymous server-rendered page as the signed-in viewer's feed after a failed read.

#### Scenario: Signed-in viewer refetches

- **WHEN** a viewer's session resolves to a signed-in uid
- **THEN** the client SHALL refetch the feed using that uid

#### Scenario: Signed-in read fails

- **WHEN** the signed-in refetch fails
- **THEN** the feed SHALL show an error state instead of the anonymous page

#### Scenario: Back navigation keeps loaded pages

- **WHEN** a visitor opens a post from the feed and navigates back
- **THEN** the previously loaded feed pages SHALL still be shown

### Requirement: Shared authentication with the rest of the site

The community board SHALL reuse the site's single Supabase client and `EsportsAuthProvider` session. Signing in with Apple on any community page MUST NOT create a second auth client, and the signed-in state SHALL carry over between community, esports ratings and skins pages.

#### Scenario: Session carries over

- **WHEN** a visitor signs in on `/ratings/esports` and then opens `/community`
- **THEN** the community board SHALL treat the visitor as signed in without a second login

### Requirement: Posting requires a linked Riot ID

Only signed-in accounts whose social profile can post SHALL see an enabled composer. A signed-in account that cannot post SHALL be shown a dialog explaining how to link a Riot ID, including a QR code to the app. A signed-out visitor SHALL be prompted to sign in when attempting to post, comment or react.

#### Scenario: Account without Riot ID

- **WHEN** a signed-in account with `canPost` false opens the composer
- **THEN** the link-Riot-ID dialog SHALL be shown and no post SHALL be created

#### Scenario: Signed-out visitor reacts

- **WHEN** a signed-out visitor presses a reaction button
- **THEN** the sign-in prompt SHALL be shown and no reaction SHALL be sent

### Requirement: Idempotent post creation with images

Creating a post SHALL use a client-generated id so that retrying the same draft never creates a duplicate. The composer SHALL accept at most 5 images, compress them before upload, and upload them through the `media-upload` edge function. If creation reports that the target already exists, the client SHALL treat the post as published.

#### Scenario: Retry after published draft

- **WHEN** a create request fails with `target_exists` for the draft id
- **THEN** the client SHALL show the post as published and SHALL NOT submit a second create

#### Scenario: Too many images

- **WHEN** a user selects more than 5 images
- **THEN** the composer SHALL reject the extra images with the `too_many_images` message

### Requirement: Reactions are ordered per target

Reactions on a post or comment SHALL be applied optimistically and sent in order per target through a queue; the UI MUST settle on the last confirmed server state, and a failed request MUST roll the UI back to the last confirmed state.

#### Scenario: Rapid toggling

- **WHEN** a user presses like, then dislike, then like on the same post within one second
- **THEN** requests SHALL be sent in that order and the final state SHALL equal the last confirmed server response

#### Scenario: Request fails

- **WHEN** a reaction request fails
- **THEN** the UI SHALL return to the last confirmed state and show an error notice

### Requirement: Moderation actions

Post and comment menus SHALL offer report and block for other authors' content and delete for the viewer's own content. Destructive actions (delete, block) SHALL require a confirmation dialog.

#### Scenario: Delete own post

- **WHEN** an author selects delete on their own post and confirms
- **THEN** the post SHALL be removed from the feed and the detail page SHALL show the not-found state

#### Scenario: Own content has no report

- **WHEN** an author opens the menu on their own post
- **THEN** the report and block actions SHALL NOT be shown

### Requirement: Localized community copy

All user-visible community text SHALL come from the `communityBoard` message namespace, and the `zh-TW` and `en` message files MUST contain the identical set of `communityBoard` keys.

#### Scenario: Key parity

- **WHEN** the message files are compared
- **THEN** the key sets under `communityBoard` SHALL be identical in both locales

### Requirement: No new dependencies and shared design system

The community board SHALL be built with the site's existing components and tokens (Phosphor through `Icon`, `HudModal`, site color and font tokens) and MUST NOT add shadcn, Radix, lucide, zustand, swr, motion, sonner or vaul to `package.json`.

#### Scenario: Dependencies unchanged

- **WHEN** `package.json` is compared before and after the change
- **THEN** no runtime dependency from the forbidden list SHALL be present
