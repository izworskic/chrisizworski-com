# Flight tracker: stateless signed pickup links

The `/flight-tracker/share/:token` URL is a public, no-login recipient view with no
database lookup of the share record. It is a signed, nonencrypted bearer URL:
anyone holding the URL can see its flight status. Do not include passenger names
or other private details in the payload.

## Construction

The existing `POST /api/flight-assignment?flightV3=1&action=share-create`
requires same-origin and fetches the live unified flight assignment. The server
creates a versioned, compressed JSON claim with the requested flight number,
resolved flight number, service date, optional flightId, origin, destination,
creation timestamp, scheduled-arrival timestamp, fixed expiry timestamp and
minimal pickup fallback (including its original observation timestamp).

The signature is HMAC-SHA256 over a domain-separated, versioned token body.
`SHARE_LINK_SECRET` is a server-only random secret of at least 32 bytes,
configured on the Vercel project in preview and production. Never include the
secret in browser code, Vercel public variables, or Git. Keep the same value
across instances and deploys: rotating it invalidates existing links.

`GET /api/flight-assignment?flightV3=1&action=share&token=...` validates
the signature and signed expiration **before** looking up live flight status.
Expiry is fixed at **six hours after the scheduled arrival UTC**, even if
estimated or actual times change. Tampered and expired URLs receive safe JSON
errors; the noindex pickup page presents a friendly explanation.

After verification, the server fetches the same unified flight-state endpoint
used by the main tool, at the moment the pickup view opens. It checks that the
resolved flight and origin/destination still match the signed claims. A source
outage or identity mismatch returns the **signed creation-time fallback**,
with its original timestamp and clear stale labeling. Since no database is
used, this is the last known status **at creation time**, not a rolling cache.

Share creation and pickup reads intentionally set `recordHistory:false`
when fetching unified state, so this path does not depend on writable
Postgres or Redis. Flight notification and reliability history continue to
use their existing durable state adapter.

## Dependency audit (October 18, 2026)

- `lib/flight-v3.js` previously stored `flight:v3:share:` records via
  `lib/tool-state.js`. That adapter is now PostgreSQL-backed, despite older
  descriptions of the problem as Upstash.
- The same module also uses state for flight-watch subscriptions, queue work,
  and reliability history. Those functions were preserved.
- `lib/nyc-crossing/ny511.js` uses shared state in the scheduled refresh.
  It and other repo consumers were not changed.
- `.env.example` retains existing Upstash variables because other code and
  historical deployments may still reference them. This patch does not delete
  old credentials, suspend projects, or modify external storage.

## Release checks

1. `node --test tests/flight-tracker-v3.test.js` and the standard repository
   test and verification gates.
2. Confirm `SHARE_LINK_SECRET` exists on the target Vercel production and preview
   environments, but do not print its value.
3. Deploy; search for a real same-day flight on `/flight-tracker/` and create
   a share URL. Open it in a fresh logged-out browser window and compare
   against the main live assignment's flight, route, status, time and terminal.
4. Change one character in the token; confirm the page says the link is invalid
   rather than showing flight information.
5. Simulate a provider outage; confirm a dated, *stale* fallback. Verify an
   expiry timestamp beyond scheduled arrival + 6h is rejected.

Privacy and tradeoffs: Link data is signed and compressed, **not encrypted**.
The fallback snapshot cannot improve after the link is made; it is used only
when live data is absent or does not match the signed identity. There is no
individual-link revocation without rotating `SHARE_LINK_SECRET`, which
invalidates every outstanding pickup link.
