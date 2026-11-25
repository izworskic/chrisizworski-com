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


## Browser QA and AIS license gate update

- First fully passing real Chromium acceptance: https://github.com/izworskic/chrisizworski-com/actions/runs/45031104129. All eight public-watch unit tests passed on its head, including 1,002 source NOAA fixes; at 390px and 1280px the tested map displayed actual tiles and markers, responded to park selection, fresh vs stale AIS, history manual next/previous and date change, live->history->live, keyboard-native buttons, no horizontal page overflow, no script exceptions. The no-JS page offered four functional agency links. Screen captures were inspected: the initial offshore-history problem was resolved and the central Cuyahoga map visibly showed working bridge/park geography. Browser implementation uses a deterministic mocked current AIS response; it does NOT independently confirm production AIS receiver coverage.
- After browser verification, labels were refined to clarify '2025 AIS history' instead of a complete 'voyage', and per-source AIS credits were surfaced. Re-run the browser and full CI after these changes before marking final branch head verified. Screenshots from previous commits do not validate later edits.
- The existing site's /api/freighter-ais delegates to lib/freighter-feed.js, which uses ais.openwaters.io. Public provider policy https://openwaters.io/ais/ states that commercial service access requires appropriate service-tier rights or qualifying contributor status and source-attribution/license compliance; https://openwaters.io/api/ais/ describes personal access as free and other commercial access as tier-specific. This ad-supported site's **commercial permission for the hosted AIS service has not been independently verified**. The new page reuses an existing endpoint in a noindex preview and adds no separate provider account or infrastructure, but this does NOT confer additional commercial rights. Do not promote a new live AIS surface to production until rights/attribution are confirmed without incurring an unapproved fee. The archived public-domain NOAA mode and Metroparks links do not require the Open Waters service.
- In current preview, upstream AIS source credits returned in the existing normalized feed appear in the public live rail via safely inserted text. Missing source attribution is disclosed rather than fabricated. The user can instead follow the existing full tracker, and static historical/park modes operate without an active AIS feed.


## Next investment: park observation intelligence and working-bridge truth (Nov 22)

- The four park choices now report an actual nearest fresh AIS position within 1.25 *straight-line miles* of each approximate park-area reference, if one is present. The selected park detail includes source time, speed-report classification and explicit warnings that the measurement is not river mileage, a sightline, a scheduled passage or a predicted arrival. Missing or stale reports remain unknown, not zero traffic. The original /api/freighter-ais is reused without a new API.
- Historical park mode offers an accessible action to jump to the nearest actual NOAA recorded fix for the selected vessel/date. A gap is never filled by animation. Tests compare exact 2025 source timestamps, each park's truly nearest recorded fix and region bounds. This is interpretive location context, not independent ground truth for a bridge crossing.
- Published U.S. Coast Guard LNM 37/2026 (September 16, 2026, Cleveland Harbor pp. 5) https://navcen.uscg.gov/sites/default/files/pdf/lnms/lnm09372026.pdf describes a *planned* Eagle Avenue Bridge removal window January 18–March 4, 2027; the Ohio DOT project https://www.transportation.ohio.gov/travel/projects/118527 documents the removal project. The preview keeps a dated source-linked notice with automatic pre-window/during/post-window wording but **never claims a live bridge open/closed state or completed removal**. Eagle Avenue uses a distinct notice marker. NOAA fixed viaducts and Coast Pilot "permanently open" draws are distinguished from ordinary operational drawbridges.
- There is an accessible, compact NOAA bridge landmark selector below the public-park list, populated from the published 19 main-river source records. It works even if Leaflet tiles fail; selecting a bridge changes the focus panel and (when present) the map. Park/bridge choices are reversible.
- Vessel markers now use modest illustrative SVG hulls for broad AIS type categories and size bands, using the site’s existing freighter-tracker design concept. Course over ground is applied only when actually reported. A drawn freighter is not an exact hull, measured ship scale, heading guarantee or implied route. Text/list alternatives remain available.
- Permission handling: **the site owner instructed development to proceed on the assumption that the existing AIS provider's commercial use is authorized**. This is an owner-supplied working assumption, not an independently verified provider license document. No new account, token, payment, service tier or external provider has been added. The historical and park-only modes continue operating if live AIS is unavailable.
- Real browser QA for near-park observations, historical park jump and Eagle Avenue notice/bridge selector passed on 390px and 1280px before the vessel-shape pass: https://github.com/izworskic/chrisizworski-com/actions/runs/45045905706 (16 focused unit tests, mobile and desktop map tiles and interactions, no-JS fallback). Latest head still requires its own final CI and browser check.
- Release remains a draft PR, noindex page and no deployment. Sitemap, Tools card, JSON-LD ItemList ordering, production AdSense verification, live provider sampling and public screenshot must be reviewed in a separate explicit release after current head is green. Do not treat the Playwright mock live response as proof of live Cuyahoga reception.


## Visual source-density decision

The live 390px screenshot revealed that rendering all 19 main-river NOAA bridge reference pins at once obscured the shore-watching task, although all pins were source-correct. The map now defaults to **five intentionally selected landmarks**: Center Street, Columbus Road, Carter Road, West Third Street, and the dated Eagle Avenue work notice. The other fourteen NOAA charted main-river references remain reachable in the accessible compact selector, and the visitor can opt in to all 19 pins and reverse that choice. Selecting any non-default crossing still creates its individual marker and shifts the map, with the same source/published-notice caveats. This is a visual-layer filter, not a removal of source facts or a ship routing model. Playwright exercises five → 19 → five, mobile and desktop, while keeping the vessel marker and public park pins distinct. This eliminates the crowded first-map screenshot instead of stacking more explanatory boxes over it.

The site owner's explicit working assumption about commercial AIS permission continues to apply. No external paid feed or additional request has been added. Full repository CI and deployed public check remain independent release gates.
