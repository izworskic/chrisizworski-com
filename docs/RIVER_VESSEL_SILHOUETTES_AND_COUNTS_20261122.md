# River ship silhouettes and truthful type counts

**Scope:** Calumet Freighter Watch and Cuyahoga Freighter Watch only. **Owner:** izworskic/chrisizworski-com. **Date:** 2026-11-22. **Release:** PR review, not an automatic merge.

## Problem / visitor question
People expect boats on a working-river map to look like boats and to understand the actual mix of current commercial and other AIS vessels. Calumet used generic square/diamond/circle characters; Cuyahoga had detailed moving hulls but reverted to a dot when course/speed were unavailable. Neither displayed a count by reported vessel type. Rotating a side-profile ship with its reported course would flip the picture upside down.

## Reused evidence and architecture
**Existing canonical silhouette engine:** `public/assets/seaway-vessel-icons.js`, already used by the Soo Locks and St. Lawrence Seaway. This provides **nine** published AIS broad type groups (cargo, tanker, passenger, tug/tow, pleasure, sail, fishing, work/service, unknown). A missing AIS type is always unknown, not deduced from name, length, or geography. Valid vessel length controls an indicative screen size band, not nautical scale.

**New isolated adapter:** `public/assets/river-watch-vessel-ui.js` and matching scoped CSS used by both river pages without changing `seaway-vessel-icons.js`, `soo-ais.js`, any existing AIS route, provider credentials, cost, map tiles, map zoom behavior, or site-wide styles.

The ship *side-profile* stays upright in every travel direction; when a moving vessel has both valid positive AIS speed and course over ground, a separate tiny compass arrow indicates reported **travel course**. There is **no claim of verified bow heading, ship sightline, future bridge approach, or ETA**. Missing, stopped and unknown-course reports still show an accurately typed ship silhouette without a false travel arrow.

Source of counts is the **same existing** `/api/freighter-ais` as the map. The adapter groups only bounded, admitted, 30-minute-fresh positions by distinct MMSI. It uses the exact type classifier as the marker. It never equates a missing feed or blank recent sample with an empty river. Group chips show numeric counts, have a manual All reset, and filter **both map markers and vessel list**. Unknown types count explicitly; every count remains a report count, never a ship-passage forecast. Each list row mirrors the map icon. Keyboard, focus, mobile wrap and reduced motion are retained.

## Design choices
- **Rejected:** Nine always-visible categories with zeroes, a category pie chart, a rotating side-elevation hull, arbitrary vessel classes inferred from names, or a giant new dashboard above the map. These compete with each page's actual map-first visit decision and exaggerate AIS certainty.
- **Selected:** Type-count pills only for categories present in fresh local reports, in the existing reported-ships panel; SVG hulls on the map and matching list. Only one selection detail, no duplicate vessel card. Calumet remains an industrial bridge corridor; Cuyahoga remains a park-first river bends and bridge-to-public-shore experience.
- HTML and CSS: existing page and small shared stylesheet; JS: local renderer/classifier adapter and minimal app changes. Python/Rust/Java: no production role justified, no new computational engine.

## Ground truth / release contract
The upstream response shape and freshness are enforced by `lib/soo-ais.js` → `lib/freighter-feed.js` → `/api/freighter-ais`. The adapter adds a defensive checkedAt + per-vessel seen gate before showing counts and dedupes MMSIs for counting. No new source, paid service, cron, database, map dependency or Redis. The original Cuyahoga public-place/source catalogs, NOAA bridge references, historic bend model, and Calumet bridge lesson remain unchanged. Canonical URLs, noindex status, Person identity and existing auto-ads remain unchanged.

## Verification required
- `node --test tests/river-watch-vessel-ui.test.js tests/calumet-watch.test.js tests/cuyahoga-public-watch.test.js`
- Repo gate `npm run verify:all`; no release if failed.
- Five-viewpoint browser QA (360, 390, 768, 1280, 1440 px) and screenshots: real tiles, ship silhouette for motionless and course-unknown craft, separated 0/90 degree arrows, correct count pills, cargo→tug→all filter map/list sync, focus, accessible labels, stale/missing AIS, no-JS fallback, no overflow, no new duplicate cards or map popups. Existing Cuyahoga browser smoke updated for source-oriented instead of rotated side-view indicators. No browser/CI green claim without logs.
- Follow with post-deploy public screenshot and check that the full icons and type count scripts have actually been propagated to both routes. Do not claim CTR or earnings gain without analytics.

## Rebase note
The latest main branch includes a Cleveland-specific Open Waters request (`?region=cuyahoga`), source-scope validation, visitor-present one-minute refresh and a no-pan path when preserving ship selection. All of these changes were retained during rebase; Calumet keeps its existing general feed. Type counts remain a presentation over admitted fresh local reports.
