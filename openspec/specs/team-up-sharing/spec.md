# Team Up room sharing

## Requirements

### HTTPS room previews

Room shares SHALL use `https://rooms.dailyval.com/room/{uuid}`. The website
SHALL serve English and Traditional Chinese versions at `/en/room/{uuid}`
and `/zh-TW/room/{uuid}`, using the existing locale redirect for bare URLs.

- Given an open room, a visitor sees its title, Riot server, mode, player count
  and links to view it in DailyVal or download the app.
- A full room is identified as full. Closed and expired rooms explain that
  they no longer accept players. An unswept open row past `expires_at` is expired.
- A missing room or disabled feature shows an unavailable page. Network,
  timeout, malformed response and unexpected backend errors offer a retry.
- A refresh reloads the server snapshot while retaining the chosen language.

### Public read contract

The page SHALL use the anonymous `teamup.room(p_room_id)` RPC with the public
publishable key, without a visitor JWT or service key. Only the explicitly
projected room fields SHALL enter the page. Invalid UUIDs SHALL cause no read.
Room responses and OG images SHALL NOT use a persistent application cache.
Metadata and page rendering MAY share a request-local read.

### App handoff and version compatibility

The new room-sharing domain SHALL be declared in the new iOS build's associated
domains. Its AASA SHALL match only bare and supported locale-prefixed room
paths. Existing apex-domain AASA behavior SHALL remain unchanged.

- A compatible installed App handles HTTPS and custom-scheme room links through
  the same config-gated router; latest-link ordering and Riot-account gates remain.
- Older Apps without the new associated domain leave the share in the browser.
  The explicit App button uses `dailyval://room/{uuid}?src=web`, which existing
  Team Up builds understand. Download/update remains available for older builds.
- Metadata SHALL use the room-sharing domain for canonical, hreflang and OG URLs,
  include the room preview and Smart App Banner, and mark ephemeral rooms noindex.

### Deployment

Deploy the website and bind `rooms.dailyval.com` without an apex redirect before
shipping the iOS build that emits these shares. DNS/TLS and real-device universal
link verification are release steps, not consequences of local tests.
