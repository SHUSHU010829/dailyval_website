# Room sharing

The share URL is `https://rooms.dailyval.com/room/{uuid}`. The existing locale
middleware selects `/en/room/{uuid}` or `/zh-TW/room/{uuid}`. This is an anonymous
preview; the App remains responsible for account checks and joining the Riot party.

## Why a separate domain

The existing `dailyval.com` AASA claims all non-excluded paths. Older App builds
receive `/room/{uuid}` but their web router does not handle it. A new associated
domain lets those users reach the website. The website's explicit App button uses
the existing custom-scheme room route. New App builds accept both web domains and
emit shares on `rooms.dailyval.com`.

`next.config.ts` internally rewrites this host's well-known AASA request to
`public/.well-known/rooms-apple-app-site-association.json` before static files.
This must return JSON with HTTP 200, without a redirect. Apex-domain associations
and legal/ratings exclusions are preserved.

## Reads and freshness

`src/lib/teamup/room.ts` calls `teamup.room` anonymously through PostgREST, with a
five-second timeout and `cache: no-store`. The response is reduced to title,
server, mode, count, state and expiry. Room code, members and account identifiers
are not forwarded to the browser. The existing RPC enforces the feature switch.

`React.cache` merges the page and metadata read within one render. Pages are
dynamic, and the room OG endpoint sends `Cache-Control: no-store`. Closed and
expired rooms have explicit copy, including rows whose sweep has not run yet.
The page is a snapshot; **Refresh room status** performs a new document request.
Chat services may retain their own share-preview cache independently.

## Deploy and verify

1. Deploy the website and attach `rooms.dailyval.com` to the same Next.js service.
   Configure its DNS and TLS; retain the request host and do not redirect to apex.
2. Verify `/.well-known/apple-app-site-association` on the new domain returns 200,
   `application/json`, App ID `46U3CJ7CE5.Kr1s.Valorant`, and only the three room
   path patterns. The apex AASA must retain its existing routes and exclusions.
3. Verify an English and Chinese page, its `/og/room?id=...&locale=...` image,
   and open/full/closed/expired/missing/error outcomes.
4. Release the iOS build with `applinks:rooms.dailyval.com`. Tap a share from a
   different app on a physical device: verify room, disabled-feature, signed-out,
   and cross-server behavior. Test an older build and a device without the App
   for the web fallback and explicit open/download actions.

No migration or new Supabase permission is needed. Local route tests cannot
verify Apple's domain cache, DNS/TLS provisioning or the real Riot party join.
