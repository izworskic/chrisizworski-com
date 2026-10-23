# St. Lawrence Seaway — research, design and release contract

Date: October 23, 2026 (America/Detroit). Owner: `izworskic/chrisizworski-com`.

## Product and canonical gate

Owner requested implementation of `ST_LAWRENCE_SEAWAY_BUILD_PLAN.md` in this session. The first release contains the corridor hub `/st-lawrence-seaway/` and the distinct public-visit destination `/eisenhower-lock/`. Existing `/welland-canal/`, Soo, Duluth and lake-wide tracker retain their intent ownership and working logic. Welland gets additive discovery links only.

The hub answers where ships have recently been reported and how the seven-lock corridor works. Eisenhower answers how to plan a documented public lock visit at Massena. These are distinct utilities, not per-lock keyword clones. The hub includes verified Iroquois public-viewing context without creating another thin destination URL. No Montreal, Beauharnois or Thousand Islands public access is implied by a ship-map region.

Search-volume validation: **NOT AVAILABLE** (Semrush API-unit response during planning). New-page GSC, GA4, AdSense and revenue baselines: **NOT AVAILABLE**, not inferred from other tools. Search targets are hypotheses. No ranking, click, impression or revenue uplift is claimed.

## Research findings and source/method ledger

| Layer | Source | Evidence/use | Limits and refresh |
| --- | --- | --- | --- |
| AIS | Existing [Open Waters vessel endpoint](https://openwaters.io/api/ais/) and shared `lib/soo-ais.js` | Explicit `kind=vessel&max_age=30m`; fresh nine-digit MMSI, valid coordinates, recent timestamps; contributor credit retained | Received reports, not a complete census; named regions include nearby waters and port reports. No schedule/queue inference. CDN 90 seconds, browser refresh 120 seconds while visible. |
| Lock order | [Official order of turn](https://seaway-greatlakes.com/vessel-transit/order-of-turn) | Direct source link at launch | No scraping, ingestion or republication of official operational queue. Need supported permission/feed before first-party predictions. |
| Locks and dimensions | [Official Montreal–Lake Ontario reference booklet](https://greatlakes-seaway.com/wp-content/uploads/2019/10/montreallakeontario.pdf), [current lock overview](https://greatlakes-seaway.com/en/the-seaway/our-locks-and-channels/) | Seven locks, approximate reference lifts; 233.5 × 24.4 m chamber reference; gravity lock mechanism | Booklet is historical (2003). Reference figures are educational, not current operating values, water levels or navigational allowances. Iroquois illustration is 1.2 m, explicitly variable. |
| Lock positions | [Seaway DIS reference, tables 6 and 8](https://greatlakes-seaway.com/wp-content/uploads/2019/10/DIS_ImplementationSpec_rev_8August2016_en.pdf); [NOAA Coast Pilot 6, chapter 4](https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C04_WEB.pdf) | Approximate facility landmarks cross-checked against the US lock references | Historic reference coordinates/datum are not chamber polygons, safe routes or public entrance coordinates. Do not geofence occupancy from these dots. |
| Eisenhower visitor plan | [Official GLS visitor center](https://www.seaway.dot.gov/explore/seaway-visitor-center), page updated September 8, 2026; reviewed October 23 | 76 Barnhart Island Road; free admission; operator's peak/non-peak hours; accessible building/restrooms; decks, exhibits, simulator | Separate reviewed access information from live AIS; recheck operator for holidays and closures. Directions use the named center and official address. |
| Iroquois public viewing | [Municipality of South Dundas](https://www.southdundas.com/recreation-tourism/attractions/iroquois-lock) | Documented viewing, parking, green space at Iroquois Point | Hours, restrooms and accessible paths are not established by this source; those are not invented. Map pin is approximate; directions use the named public viewpoint. |
| Visitor map context | [OSM Eisenhower public viewing point](https://www.openstreetmap.org/node/7891570851), [visitor parking](https://www.openstreetmap.org/way/591642839) | Public-site orientation independently checked against address | OSM attribution retained with basemap; viewpoint marker is not a precise entrance or facility boundary. |
| Historical traffic | [BTS/GLS Seaway Performance, swpm-impx](https://data.bts.gov/dataset/Great-Lakes-St-Lawrence-Seaway-Performance/swpm-impx); [metadata](https://data.bts.gov/api/views/swpm-impx.json); [data](https://data.bts.gov/resource/swpm-impx.json) | Fields `month`, `vessel_transits`, `tonnage_metric_tons`; public `USGOV_WORKS` metadata; reviewed 2022–2024 snapshot of 36 monthly rows | Missing values stay null. Dataset is the published Seaway performance series, not counts at an individual selected lock, unique ships or arrivals. 2025 incomplete and 2026 mixed reporting dates deliberately excluded. No new data-collection job. |
| Photographs | [GLS visitor page](https://www.seaway.dot.gov/explore/seaway-visitor-center), files listed below | Actual Eisenhower observation-deck and visitor-center photographs, credited to U.S. DOT / GLS | Photos are not webcams. No AI generation, compositing or substitute location. Published official images have no third-party photo credit in the reviewed source; provenance retained. |
| Basemap | Existing `/api/carto-basemap-config`, CARTO Voyager raster; OSM fallback | Reuse existing public key contract; copyright attribution visible | Browser-visible basemap public key only. No new map billing or secret access. Tile failures preserve cards and directions. |
| Seasonal information | [Official opening/closing information](https://greatlakes-seaway.com/en/commercial-shipping/seaway-opening-and-closing-information/), [current notices](https://greatlakes-seaway.com/en/news-and-information/notices/seaway-notices/) | Direct source access | No hardcoded “open now” or assumed annual opening/closing day. |

Photograph provenance:

- `public/assets/seaway/eisenhower-deck.jpg`: official original `https://www.seaway.dot.gov/sites/seaway.dot.gov/files/2026-03/3.png`; 1418 × 945 retained; JPEG optimization only. Alt text and visible credit link preserved.
- `public/assets/seaway/eisenhower-center.jpg`: official original `https://www.seaway.dot.gov/sites/seaway.dot.gov/files/inline-images/Seaway%20Visitor%20Center_Observation%20Decks.png`; 800 × 600 retained; JPEG optimization only.

### Live feasibility observations — not a coverage guarantee

Initial parallel regional check at 2026-10-23 12:59:58 UTC received 17 Montreal, 2 Beauharnois and 9 Thousand Islands reports; Massena and Iroquois returned no reports. Named examples included CSL ST-LAURENT, POLSTEAM WELTYN and NOELLE G. This is a source check, not evidence that other regions had no vessels.

A subsequent end-to-end handler call around 13:25 UTC returned HTTP 200, 29 fresh reports: Montreal 18, Beauharnois 2, Thousand Islands 9, Massena 0 and Iroquois 0. Examples included OCEAN INTREPIDE and CTMA VOYAGEUR 2. This confirmed the Node endpoint's real fetch → normalization → regional state → response contract.

The broader Beauharnois rectangle now includes Lake St. Francis to avoid an unqueried gap between the canal and Massena. Regions are bounded rectangles and can include harbor/non-transiting boats; the page labels that limitation. Every region reaching the provider's 50-report threshold is conservatively marked partial. Cross-region duplicates keep the latest observation and union region memberships.

The proposed 72-hour continuous coverage study was **not completed** in this interactive build. No scheduled monitoring was started. Release copy therefore promises received recent reports, not proven corridor-wide receiver continuity or guaranteed ship encounters. Arrival windows and notifications remain outside this release.

## Technical and visual contract

One Leaflet map instance per page; one SVG lock cutaway; one SVG summed-reference-lift chart; one SVG dimension comparison; one historical SVG bar chart. Vanilla JavaScript owns coordinated state and SVG geometry; no new D3/runtime/chart dependency is needed for these small datasets. SVG supplies readable labels and a DOM structure; tables provide non-graphic historical/reference alternatives.

Source inputs: `data/seaway/places.json` and `data/seaway/history.json`. `scripts/generate-seaway.mjs` emits the two canonical pages and the browser reference data. The generator runs in the normal site build. Source content/SEO is static and useful without hydration; interaction enhances the map, charts and models.

Color roles: dark teal structure; sea blue received ships/reference geometry; brown slow/stopped ships; neutral gray unknown speed; rust selected ship/chart mark; gold numbered lock marks; green public viewing. Essential labels carry the meaning independently of color.

Screen-stable ship silhouettes reuse the existing Duluth design family. They have stable MMSI identities and are updated in place. No flashing animation or fake position interpolation. Course is not treated as heading for a stopped vessel. Closely spaced lock pairs use a round combined locator at overview zooms and separate at detailed zooms. Public viewing pins appear at local zoom to avoid hiding the lock dots.

Map selection, region, selected lock and viewpoint are URL-backed. Refresh does not fit bounds or pan. Intentional region/ship/lock actions can focus the map. Manual region choice works without location permission. Requested geolocation stays in browser memory and is excluded from URLs and analytics. US/Canada viewing-side choice is explicit; the UI does not silently recommend crossing the border.

Portrait mobile places the map before the long interpretation and destination material, then stacks the ship list. Inputs and controls have tap targets and keyboard actions; chart values are available by tap/focus and as tables. Reduced-motion users step through the model rather than receiving automatic animation. Educational animation stops when the tab is hidden.

The cutaway uses a five-stage educational sequence: entry, secure/close, gravity water-level change, equalize, departure. Both gates remain closed throughout water change; downbound travel reverses entry, level change and exit. The 23-second animation is not actual lockage duration.

The staircase sums reference lock lifts only. It is conspicuously **not a water-surface elevation profile**; no sea-level datum or implied river gradients are fabricated. The dimension comparison uses one equal scale in plan view and requires known positive length and beam. An AIS ship supplies dimensions only when both are present and the user explicitly chooses it; otherwise the example is labeled illustrative.

No new paid API, LLM, Redis, Upstash, cron, alerts, camera stream, or inferred queue is introduced. The shared standard ad loader remains under the existing central policy; no AdSense account/configuration change is included.

## Release verification and status

- Main prerequisite: Agent branch verification on base `6d9e85f3fa0ecf58ec8c6cb598a1805b59009ea2` succeeded (run 39956454383).
- Focused tests cover freshness, geometry/identity, stale/future reports, explicit and optional kinds, newest-dimension deduplication, truncation, partial/all outages, method/scope validation, region/cargo filters, unknown heading, lock-stage invariants, missing dimensions, missing monthly values and the two pages' source/entity contracts.
- `npm run verify:quick` passed the initial implementation.
- All 55 `npm run verify:all` steps passed on the final source, including 3,038 repository tests. The initial branch CI also passed the complete build and public audit; all eight reported checks succeeded on `da06a4c`.
- [PR #1129](https://github.com/izworskic/chrisizworski-com/pull/1129) is open. [Seaway preview](https://chrisizworski-com-git-feat-s-02e16e-izworski-gmailcoms-projects.vercel.app/st-lawrence-seaway/) and `/eisenhower-lock/` were inspected in the deployed browser. No production merge or deployment is claimed.
- Desktop browser acceptance: 21 actual received reports at approximately 19:52 UTC; ship-name search, selected ship details, reported-dimension comparison, upbound/downbound closed-gate water-change stages, historical year/measure/month selection, Iroquois public viewing selection, Eisenhower's honest no-report state and corridor recovery all worked. Map tiles loaded. No application console errors observed; an extension metadata error was external to the page.
- Keyboard chart selection exposed lost focus when rebuilding the lift SVG. The follow-up preserves focus through chart replacement and the periodically refreshed region/viewing controls. Ship-card silhouettes also receive the blue palette. Final deployed verification follows this change. Portrait viewport and reduced-motion browser emulation were unavailable in this browser surface; responsive CSS and reduced-motion logic are present, but those device modes have not received visual acceptance.

No demand uplift or actual visitor ship-sighting outcome has been measured. Revisit indexing, page × query evidence and fixed-label actions after a comparable observation period.

Exactly one next product action after this release: evaluate received-report gaps at Massena against the official source before designing any Eisenhower “next ship” feature.
