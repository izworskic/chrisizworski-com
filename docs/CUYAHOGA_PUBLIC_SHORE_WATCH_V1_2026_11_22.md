# Cuyahoga Freighter Watch: public-data visitor preview investment

Date: 2026-11-22. Owning draft PR: https://github.com/izworskic/chrisizworski-com/pull/1841
Preview source: public/cuyahoga-freighter-watch/index.html
Proposed canonical after separate release review: https://chrisizworski.com/cuyahoga-freighter-watch/
Status: IMPLEMENTED ON A RESEARCH BRANCH, NOINDEX, NOT MERGED OR DEPLOYED.

## Visitor decision and independent public sources

The visitor wants to stand in a public place near Cleveland's working Cuyahoga River and watch freighters without confusing absent AIS with absent ships, or a historical replay with a live passage. The first answer is fresh/absent/unavailable AIS reports, then a river map with public parks, NOAA bridge references and selectable vessels. The current-data surface reuses the existing site endpoint /api/freighter-ais, with a 30-minute explicit freshness gate and no new commercial provider.

A second mode follows dated NOAA historical broadcast observations one fix at a time. It can show what a vessel reported, not a continuous route or a verified bridge opening. Three original nationwide source archives were parsed on the research branch, and a static 69 KB viewer asset was compiled from previous verified public-domain NOAA results with original archive SHA256: 2025-07-07 Mark W. Barker (434 points); 2025-08-15 Sam Laud (215); 2025-08-21 Mark W. Barker (353). Total 1,002 actual fixes. Browser opens the voyage at the first recorded fix inside the selected central river box so the river, not an offshore first fix, is visible. All other points remain selectable on the scrubber.

Data/source ledger:
- NOAA source/rights, public domain historical AIS: https://coast.noaa.gov/accessais/ ; full archive hashes and matches in public/cuyahoga-freighter-watch/noaa-historical-2025.json.
- NOAA Coast Pilot 6 main-channel bridges: https://www.nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_WEB.pdf ; published coordinates are not exact span crossing axes. The Center Street NOAA vs CFR river-mile disagreement remains documented.
- Cleveland Metroparks: Scranton Flats Pier https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/scranton-flats-pier ; Rivergate Park https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/rivergate-park ; Heritage Park https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/heritage-park ; Wendy Park https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/wendy-park .
- Map pin coordinates are approximate public park-area refs (data/cuyahoga/public-watch-spots.json; sourced individually), NOT independently surveyed entrances, water-edge viewing decks, guaranteed sightlines or directions into industrial parcels. All detail panels link directly to park managers. Current access and parking require a day-of check.
- OSM basemap and Leaflet 1.9.4, reused existing tooling. Real tile and 390px/1280px Chrome evidence must pass before release.

## Two materially different concepts compared

A. **Plain “where to watch” directory**: photo-led text blocks and a park list, with a link to the general Great Lakes ship tracker. Very cheap and legible, but visitors cannot align the working river, reported vessels and shore options spatially. The existing Great Lakes Ship Watching Spots page already does the broad destination directory.
B. **River observation desk, selected**: river map is the primary spatial answer, selectable public viewing places/NOAA bridge reference points, distinct fresh-AIS/historical-evidence modes, source-aware popovers and historical manual fix scrubber. This serves the tightly winding Cuyahoga specifically, unlike the lake-wide Great Lakes tracking view or the Soo Locks single-chamber experience. The result is not a clone of the existing lake-wide tracker because the park-choice task, primary detail rail and historical comparison are different. The site’s existing /api/freighter-ais carries only observed reports, never ETA.

This selects the smallest capable stack: HTML/CSS and browser JS with existing Leaflet and the established AIS endpoint. Offline Node.js compiles genuine NOAA public data. Python is used only in an ephemeral GitHub Actions browser QA environment. Rust, Java, new serverless API and new production dependencies are rejected as unnecessary.

## Interaction and failure matrix

| State | Visitor sees | Key safeguard |
|---|---|---|
| Initial | River map, NOAA bridge pins, four public park selections, fresh AIS feed status | Map-first and useful source fallback, no ads change |
| Fresh AIS | Recent named vessels within study bounding box, reported time and speed if recorded | Up to 30 minutes old; does not imply next arrival |
| No fresh local AIS | Zero confirmed recent positions | Does not assert empty river |
| AIS error/stale checkedAt | Explicit unavailable/stale status and tracker handoff | Does not assert no ships |
| Park selected | Verified managing-agency link and interpretive place advice | General park-area point, not a certified entrance |
| NOAA bridge selected | Published type, mile, source and known disagreement | Not an opening or exact crossing |
| Historical voyage selected | 2025 date, ship, real NOAA fixes with manual next/previous/scrubber | Offshore reports retained; initial state focuses on actual central-river fix |
| Rapid history → live → history | No mixed markers, source-specific state retained | No cross-time leakage |
| No JavaScript or no map | Manager and full tracker links, source text | Not a fake blank/working map |
| Reduced motion | Explicit manual controls without animated path | No inferred trajectory |
| Narrow viewport | Stacked content, large map, source rail | No 4-ad stack; Google Auto ads settings unchanged |

## Release and validation boundaries

- Implemented: preview HTML, unique scoped CSS, map/places/bridge/ship/history JS, immutable history JSON, public park and Coast Pilot JSON, offline normalizer and deterministic source tests.
- Unit QA: tests/cuyahoga-public-watch.test.js (real static 1,002-fix content, stale/unavailable AIS and source/SEO contracts).
- Browser QA: scripts/cuyahoga-browser-smoke.py in a one-time branch GitHub Action; 390px and 1280px, selected park and NOAA voyage, live→history→live, no-JS fallback, actual tile loads and screenshots. Record final passing run or unresolved failures before claiming a passing browser gate.
- This branch deliberately retains meta robots noindex,follow and is excluded from current public Tools page discovery, registry and sitemaps. Production release will require reviewed identity/canonical, network, sitemap and ad QA. No new production cron, paid services, Redis, data collectors or changes to the source freighter API.
- Map tiles are publicly sourced from OSM as already used by the freighter tracker, not a precomputed offline map; when tiles do not load the text and official manager links remain functional.
- Analytics and user outcomes: NOT MEASURED. No claim of CTR or AdSense growth. Full repository verification and post-deploy public acceptance NOT YET CLAIMED.

Next action: finish actual browser verification, inspect screenshots, clear latest full branch CI, synchronize with main, and keep PR draft until explicit merge/release authorization. Do not enable future bridge arrival estimates without independently validated event time records.
