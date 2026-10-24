# Great Lakes Freighter Winter Layup Explorer — foundation release gate
Date: 2026-10-24
Status: development branch only. NO modifications to production Freighter Central, AIS endpoints, freeze-up APIs, redirects or build pipeline.

## Objective
Answer "Where is that freighter spending winter, and what is its story?" with a verified historical answer, a harbor-level map, dated events, photos with explicit rights and truthful uncertainty. The future 2026–27 season MUST NOT inherit winter 2025–26 positions.

## Research — foundational evidence
- Duluth Seaway Port Authority, Jan 30, 2026: https://duluthport.com/news/duluth-superior-tonnage-falls-amid-trade-headwinds/
  - Burns Harbor — Redwood Group Elevator M
  - Honorable James L. Oberstar — Fraser Shipyards
  - Indiana Harbor — Ogdensburg Pier
  - John J. Boland — Fraser Shipyards
  - Lee A. Tregurtha — Fraser Shipyards
  - Mesabi Miner — Fraser Shipyards
  This is an EXACT six-vessel sample within Superior harbor, not a count of all laid-up ships in the Great Lakes.
- Duluth Harbor Cam, Jan 16, 2026 (Lee A. Tregurtha winter arrival):
  https://www.duluthharborcam.com/2026/01/lee-tregurtha-arrived-in-duluth-01162026.html
- Fraser first Mesabi Miner layup, Jan 29, 2026:
  https://shipyards.marinelink.com/news/mesabi-miner/mesabi-miner-winter-lay-up-fraser-shipyards
- MPR, March 24, 2026 (Mesabi Miner first movement March 22):
  https://www.mprnews.org/story/2026/03/24/great-lakes-shipping-season-starts-up-again-in-duluth-port
- Duluth Harbor Cam seasonal departures:
  https://www.duluthharborcam.com/search?max-results=5&updated-max=2026-04-05T08%3A40%3A00-05%3A00
  https://www.duluthharborcam.com/search/label/Lee%20A%20Tregurtha
- Winter yard interpretation: https://frasershipyards.com/winter-lay-up-where-the-real-grind-begins/
- Lee A. Tregurtha public-domain photo, USACE, 2021:
  https://commons.wikimedia.org/wiki/File:Lee_A._Tregurtha_in_Soo_MI.jpg
- Mesabi Miner CC BY-SA 2.0 photo, Tony Webster, 2018:
  https://commons.wikimedia.org/wiki/File:Mesabi_Miner_Cargo_Ship_in_Lake_Superior_-_Minnesota_(43981918974).jpg

## Accepted phase-1 surface
- New static, server-rendered /great-lakes-freighter-winter-layup/ page, not a rewrite of /freighters/.
- Versioned registry JSON with exactly two season objects and a stable id for each record.
- Historic status as-of dates and source-level event references. Date for event is NOT a substitute for publication date.
- One group marker at an APPROXIMATE harbor reference point, not six invented dock positions.
- CARTO basemap via already-existing /api/carto-basemap-config, OSM tiles on outage.
- Desktop/mobile vessel search, berth filtering, detailed timelines, season switcher, 2 rights-verified ship photos.
- Current upcoming season expressly displays no verified layups. No inference from missing/stale AIS.
- External Google Maps link for discovering public waterfront options, NOT directions to industrial docks.
- Separate cross-links to established live tracker and ice explorer. No dependency on either endpoint.
- Static roster in HTML for non-JS and data load failure; JSON drives richer interactions.
- No extra remote API polling / Vercel compute cost except existing optional basemap configuration endpoint.

## Data model
Public artifact: public/assets/freighter-layup-registry.json
season: id, label, state, asOf, note, records[]
record: id, name, aliases[], harborId, berth, status, statusAsOf, evidence, summary, events[], photo?
harbor: id, name, lat/lon, coordinatePrecision, note.
Future candidate records must use stable IMO identity where valid and structured aliases; the current sample uses locally unique slugs and is NOT an authoritative complete ship identity registry.

## Functional value function
For investment ordering only, score each dimension 0–5:
  P = 6*userUtility + 5*evidence + 3*differentiation + 3*existingReuse + 2*searchPotential + 1*costEfficiency
Maximum 100.

Hypothesized top investment priorities (NOT user-tested):
- Verified roster / attribution: 96
- Vessel name and alias search: 95
- Harbor map: 92
- Dated chronology: 91
- Seasons: 88
- Vessel stories: 87
- Rights-verified photos: 87

Product quality (score each 0–100):
  Q = .35*accuracy + .20*taskCompletion + .15*mapUsability + .10*storyQuality + .10*performanceAccessibility + .10*reliability
Release target >=92; zero unsupported confirmed layups; task success >=95% on predefined journeys; 100% legacy-tool regression pass.
These are RELEASE TARGETS, not measured results. No invented score from unrun UX testing.

## Acceptance tests (automated)
Run from repo root:
  node --test tests/freighter-layup.test.js
This covers 6 sourced records, exact historical status dates, unique IDs, source-backed timeline events, photo rights,
deliberately empty 2026–27 season, no AIS classification dependency, static-readable page and parseable JavaScript.

## Hands-on journeys still required on preview BEFORE merging
1. Default 2025–26: six ships; select Lee A. Tregurtha: Fraser berth, WW2 history, two independent dates, licensed photo.
2. Search Oberstar, including abbreviated alias; can open story and return to full list.
3. Berth filter Ogdensburg Pier returns exactly Indiana Harbor. Reset returns six.
4. Switch 2026–27: no ships, no harbor pins, no legacy location or fabricated status; switch back restores six.
5. Harbor marker card click, all-lakes reset, focus button, narrow mobile popup: no jumping, no overlapping, no wrong ship.
6. Disable JavaScript: six static records and original roster link remain readable.
7. Block Wikimedia photos: legible cards and properly labeled detail remain available.
8. Block CARTO or basemap endpoint: fallback tiles; block Leaflet entirely: source list remains readable.
9. Observe screen-reader labels, keyboard tab order, focus on selected details; test 360px to 1440px.
10. Inspect site build/preview. Existing /freighters/, /great-lakes-freighter-tracking/, /soo-locks/ and /michigan-ice/ remain unmodified and functional.

## Deferred: phase 2+ (not part of this branch)
- Expand verified harbors across Michigan/Wisconsin/Ohio/New York/Ontario/Quebec; coverage denominator by fleet and harbor.
- Ship identity crosswalk with IMO, MMSI and historical aliases; no current-position inference from last received AIS.
- Fine-grained dock coordinates ONLY if permission, specificity and map geometry are verified; never route visitors to secure yard.
- Historic voyage/port-call coverage audit and explicit missing-data model before any seasonal travel animation.
- Curated ship-specific photographs with checked licensing and non-Wikimedia external rights.
- NOAA GLERL ice overlay with separately time-scoped legends and no cause attribution.
- Evidence workflow (pending > corroborated > confirmed > archived), stale-report invalidation, editorial review trail.
- Canadian port-authority reporting, company fleet notices, source cost and terms checks.
- Read-only API can be added later; do NOT change the existing freighter AIS contract.
- Only after source depth: permanent vessel biography pages with distinct user value and no thin SEO page generation.
- Alerting/webcams, once primary core is measured usable and reliable.

## Change isolation
This branch adds only: a new page, registry, its CSS/JS, tests, and this planning document.
No modifications to existing shipping tools, Vercel config, package scripts, source sitemaps, or deployment policy.
Do not merge or claim production rollout until CI/preview and user journeys have passed.
