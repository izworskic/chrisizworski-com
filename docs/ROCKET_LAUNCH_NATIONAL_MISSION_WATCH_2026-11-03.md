# Rocket Launch Live USA — National Mission Watch v1
November 3, 2026 · implementation and acceptance note

## Visitor job
When a visitor picks a mission on the six-coast national rocket tool, present genuinely
mission-linked webcast choices without confusing them with old replays, unrelated camera
feeds, range permission or official launch readiness. The national site previously linked
to independent journalism but did not provide a mission-aware watch surface.

## Architecture
- Reuse `normalizeLaunch().media` from LL2 `vid_urls` already sanitized by
  `lib/space-coast-media.js` and stored with the existing national signed Postgres snapshot.
- Add `mediaDesk` to the existing `GET /api/rocket-launch-usa` response. No visitor LL2 calls,
  extra cron jobs, new tables, Redis, Supabase, or credentials.
- Exact mission ID equality gates the frontend. An empty LL2 listing means "no link listed yet",
  not "no webcast" or "no launch".
- Do not promote LL2 "Official Webcast" classification into independent publisher verification.
  An LL2 "live" boolean is historical source reporting, not a stream-health check.
- Media recency uses the selected record's observation timestamp and national schedule
  freshness; retained stale group records cannot display a recent media-source state.
- The two independently sourced general Space Coast cameras are shown **only for Florida**
  and explicitly separated from this mission's webcast. No other region receives their
  cameras or speculative pad-camera URLs. A missing camera is not a lack-of-launch claim.
- Video URLs are server-allowlisted and normalized. Media titles are inserted with
  `textContent`. YouTube iframe embeds are created only on an explicit Play click using
  a validated eleven-character video ID on `youtube-nocookie.com`; no automatic playback
  or invented "LIVE NOW" labels. Non-YouTube source links open the publisher.
- The national mission watch is visually distinct and mobile-adaptive, with disclosure
  of stream uptime, camera angles, source checks and the operator's final authority.

## Value benchmarks
1. Every selectable mission can show up to five same-ID listed media links, or an explicit
   absence-of-listing message. No guessed mission/video text search.
2. Zero Florida area cameras in Texas, California, Virginia, Alaska or Hawaiʻi.
3. Zero visitor-triggered LL2 fetches, new API keys, backend services or caches.
4. No iframe request before the user's Play action; external links remain usable if
   a stream disappears or embedding is restricted.
5. An overdue national snapshot is never labeled as recently checked mission media.
6. The Florida specialist page's existing camera/source contracts are preserved;
   HTML canonical, metadata, sitemap and location-access logic remain unchanged.

## Verification
Run:
```bash
node --test tests/space-coast-media.test.js tests/rocket-launch-usa.test.js
node --test tests/rocket-launch-national-v2.test.js tests/space-coast-launch-day.test.js
npm run build
```
Also run the repository release checks and preview before merging. After merge, open
`/national-tools/rocket-launch-live/?region=florida` and
`?region=texas`, switch missions, inspect live `mediaDesk` (including
source observation age), check camera segregation and a Play-click on mobile.
Confirm production deployment independently; CI checks alone do not establish that
a third-party YouTube video is actually playing.

## Not included
YouTube streaming health, archival video validation, specific camera angle verification,
mission trajectory inference, private-domain camera scraping, licensed footage mirroring,
or unverified viewing-site recommendations.
