# Great Lakes Freighter Winter Layup Explorer — foundation release gate
Date: 2026-10-24
Status: development branch only. Phase 3 adds 5 harbors in US/Canada, 14 total season-specific records, 6 substantial vessel biographies. NO modifications to production Freighter Central, AIS endpoints, freeze-up APIs, redirects or build pipeline.

## Objective
Answer "Where is that freighter spending winter, and what is its story?" with a verified historical answer, a harbor-level map, dated events, photos with explicit rights and truthful uncertainty. The future 2026–27 season MUST NOT inherit historic 2025–26 or 2024–25 positions.

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
- Three harbor-group markers at APPROXIMATE reference points. Not dock, public entrance or exact vessel positions.
- CARTO basemap via already-existing /api/carto-basemap-config, OSM tiles on outage.
- Desktop/mobile vessel search, harbor and berth filters, event-dated timelines, season switcher, 2 rights-verified historical vessel photographs.
- Current upcoming season expressly displays no verified layups. No inference from missing/stale AIS.
- External Google Maps link for discovering public waterfront options, NOT directions to industrial docks.
- Separate cross-links to established live tracker and ice explorer. No dependency on either endpoint.
- Static roster in HTML for non-JS and data load failure; JSON drives richer interactions.
- No extra remote API polling / Vercel compute cost except existing optional basemap configuration endpoint.

## Data model
Public artifact: public/assets/freighter-layup-registry.json
season: id, label, state, asOf, note, records[]
record: id, name, aliases[], identity:{key,imo?,mmsi?,matchPolicy}, harborId, berth, berthPrecision, status, statusAsOf, evidenceClass, evidence, summary, events[], storyFacts?, photo?
harbor: id, name, lat/lon, coordinatePrecision, note.
Stable internal IDs and curated aliases are mandatory. IMO and MMSI are deliberately null until verified, never guessed. The browser/Node shared validator rejects alias collisions, invalid IMO/MMSI check digits, misclassified confidence and unverified future-season carryover. This is NOT an authoritative fleet registry.

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
This covers 10 sourced records across 3 harbors, mixed evidence classes, per-record dates, unique IDs and collision-safe aliases, timeline sources, photo rights,
deliberately empty 2026–27 season, no AIS classification dependency, static-readable page and parseable JavaScript.

## Hands-on journeys still required on preview BEFORE merging
1. Default 2025–26: ten ships in three harbors, nine verified and one community-reported; select Lee A. Tregurtha: Fraser berth, WW2 history, two independent dates, licensed photo.
2. Search Oberstar, including abbreviated alias; can open story and return to full list.
3. Berth filter Ogdensburg Pier returns only Indiana Harbor. Sturgeon Bay selects Barker, Speer and Manitoulin; Milwaukee selects Stewart J. Cort. Reset returns ten.
4. Switch 2026–27: no ships, no harbor pins, no legacy location or fabricated status; switch back restores ten.
5. Harbor marker card click, all-lakes reset, focus button, narrow mobile popup: no jumping, no overlapping, no wrong ship.
6. Disable JavaScript: ten static ship records and original published sources remain readable.
7. Block Wikimedia photos: legible cards and properly labeled detail remain available.
8. Block CARTO or basemap endpoint: fallback tiles; block Leaflet entirely: source list remains readable.
9. Observe screen-reader labels, keyboard tab order, focus on selected details; test 360px to 1440px.
10. Inspect site build/preview. Existing /freighters/, /great-lakes-freighter-tracking/, /soo-locks/ and /michigan-ice/ remain unmodified and functional.

## Deferred: later phases after three-harbor evidence foundation
- Expand verified harbors across Michigan/Wisconsin/Ohio/New York/Ontario/Quebec; coverage denominator by fleet and harbor.
- Complete external IMO/MMSI identity crosswalk where authentic registries establish values; local curated identity/alias model now in this branch. No current-position inference from last received AIS.
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
This branch adds only: a new page, registry, its CSS/JS and shared identity model, tests, and this planning document.
No modifications to existing shipping tools, Vercel config, package scripts, source sitemaps, or deployment policy.
Do not merge or claim production rollout until CI/preview and user journeys have passed.

## Phase 2 expansion — completed in isolated feature branch (2026-10-24)

### Additional sourced winter 2025–26 vessels
- James R. Barker — Sturgeon Bay, Fincantieri; Jan 5 arrival and original graving-dock position: Wisconsin Marine Historical Society (Jan 8): https://wmhs.org/james-r-barker-arrives-at-fincantieri/
- Edgar B. Speer — Sturgeon Bay, Fincantieri; Jan 18 arrival: Wisconsin Marine Historical Society (Jan 21): https://wmhs.org/edgar-b-speer-arrives-at-fincantieri/
- Manitoulin — Sturgeon Bay, Fincantieri; Jan 18 community-reported arrival and February berth reports: https://search.boatnerd.com/viewtopic.php?p=274441 and https://search.boatnerd.com/viewtopic.php?t=178499. **LOWER CONFIDENCE**. Do not upgrade to verified without new independent evidence. Exact dock is unverified.
- Stewart J. Cort — Milwaukee, Jan 20 winter layup arrival: Wisconsin Marine Historical Society: https://wmhs.org/stewart-j-cort-arrives-in-milwaukee/. Exact berth not documented.

### Current coverage, deliberately limited
- Three approximate harbor reference markers: Superior (Lake Superior), Sturgeon Bay (Green Bay / Lake Michigan), Milwaukee (Lake Michigan).
- Ten individual historic vessel records: nine backed by port authority or maritime historian, one backed only by shipping-community observers.
- No shipyard berth coordinates, no live positions, and zero current-winter inferences.
- Each history has an `identity.key` invariant and curated aliases; IMO and MMSI remain null until independently verified.
- Dated operational events stay separate from permanent vessel biography facts. Community events are labeled `reported_*` instead of becoming proof of confirmed repairs.
- Search, harbor selection, berth selection and map-card cross-navigation now support >1 harbor.

### Scorecard, target vs verified work
- Data integrity and alias tests: 10/10 in-memory checked-in assertion scenarios passed against fetched branch contents. This is **not** a native Node test result.
- Registry validator: 0 issues across 10 records, 3 harbor references and 2 season objects, in connector-backed validation.
- Preview build: Vercel reported READY on the feature branch; externally testing the protected preview redirects to login.
- Map/mobile/keyboard functional journey success: **not measured**; cannot assign 95% success or overall quality score without independent browser tests.
- Existing-tool regression suite: **not run**; no existing tool files modified.
- Next release gate remains native `node --test tests/freighter-layup.test.js`, browser interaction review and `npm run verify:all` before merge.
- Build costs: successive feature-branch commits prompted automatic previews; future revisions should batch or temporarily pause branch previews using approved project settings, not bypass existing protection.

### Resolved quality loss
1. Previous single-harbor hardcoding is removed: the map and list now share the selected harbor.
2. "Confirmed" is no longer blanket-applied to every historical card: community entries are visibly downgraded.
3. A year-specific archive never infers present movement, even when a vessel has reported a berth shift or departure.
4. Source dates are per ship; a Jan 30 Superior source must not be silently reused as Jan 20 Milwaukee evidence.
5. Alias collision and unsafe source-class promotions fail validator checks.

## Phase 3 (2026-10-24) — cross-border coverage and permanent biographies
Implemented, feature branch only. Existing live shipping/ice tools not changed.

### Source-backed 2025–26 additions
- Owen Sound, Ontario, Canada — Algoma Compass: January 19, 2026 icebreaker-assisted arrival and layup, with Community Waterfront Heritage Centre's January 24 account: https://waterfrontheritage.ca/the-algoma-compass-arrives-for-winter-layup/ ; https://waterfrontheritage.ca/ccgs-judy-lamarsh-breaks-the-ice/
- Toledo, Ohio — American Spirit: media reported reaching Toledo after Coast Guard help January 21, intending winter layup; **status reported, specific berth NOT verified**. https://maritime-executive.com/article/uscg-icebreakers-aid-great-lakes-shipping-as-arctic-front-ices-the-lakes
- Fleet dataset now has twelve historical records in 2025–26 across Superior, Sturgeon Bay, Milwaukee, Owen Sound and Toledo. Ten classified verified / two reported. The sample is still incomplete.

### Separate 2024–25 archive
- CSL spokesperson confirmed Oakglen wintering in Owen Sound after December 31, 2024 arrival, with general maintenance: https://www.bayshorebroadcasting.ca/2024/12/31/large-cargo-ship-docks-in-owen-sound/
- Owen Sound maritime museum and January 2026 news caption support Algoma Compass's January 2025 winter visit:
  https://waterfrontheritage.ca/the-algoma-compass-arrives-for-winter-layup/
  https://www.bayshorebroadcasting.ca/2026/01/16/algoma-compass-expected-to-arrive-in-owen-sound-for-winter-berth/
- The Algoma Compass 2024–25 and 2025–26 records carry the same `identity.key` and independently verified IMO `7326245`. This is one hull, two winter records, not two vessels or a claimed continuous location.

### Permanent editorial ship biographies
- Generated from `public/assets/freighter-vessel-biographies.json` by `scripts/generate-freighter-layup-profiles.cjs` using a shared pure renderer.
- Six substantive source-linked pages: Algoma Compass, Lee A. Tregurtha, James R. Barker, Stewart J. Cort, American Spirit, Oakglen.
- Each page has a distinct SEO canonical, permanent ship history, sourced particulars, multiple interpretive chapters, a cross-winter table, an event chronology, and links back to all actual source pages. No generic thin mass generation.
- `node scripts/generate-freighter-layup-profiles.cjs --check` checks for drift without rewriting files.
- No API/DB jobs, no extra production polling, no broad unbounded fetches, and no future-season carryover.

### Image-rights research
- James R. Barker by Levi Gates, 2014, CC BY-SA 4.0: https://commons.wikimedia.org/wiki/File:James_R_Barker.jpg
- American Spirit by USACE Detroit District (Michelle Hill), 2011, CC BY-SA 2.0: https://commons.wikimedia.org/wiki/File:American_Spirit.jpg
- Oakglen by GuavaTrain, 2021, CC BY-SA 4.0: https://commons.wikimedia.org/wiki/File:Ship_Oakglen.jpg
- Earlier photos of Mesabi Miner and Lee A. Tregurtha remain in the archive with credits. None of these are represented as photos of a different winter layup.

### Post-build loss-function and acceptance requirements
- 100% of historic records need dated source, status, confidence and harbor-scale positions.
- 100% of biography historical claims must have cited supporting pages; no guessed engineering particulars.
- Multi-winter continuity preserves stable internal ID and verified IMO where known.
- Check 2024–25 selection: two records, one harbor, zero 2025–26 carryover unless independently documented.
- Check 2026–27 selection: zero records/markers. No live AIS-to-layup inference.
- Verify generation determinism and canonical uniqueness for all six biography pages.
- Run local/native Node tests, responsive preview screenshot/browser checks, and legacy regression suite before merge.
- Product quality threshold remains ≥92 with >=95% human-measured task success, **not yet measured**.

### Known remaining gaps
- Coverage of active commercial fleets is not complete; do not calculate a layup percentage from this sample.
- Public photo coverage is incomplete for many records; no unlicensed photo or generic AI image substitution.
- No attempt to claim a ship's full 2026 cargo/port history without sufficiently complete historic tracking data.
- Canadian Port Colborne, Hamilton, Sarnia and Thunder Bay still require ship-specific 2025–26 evidence before adding pins.


## October 24 coverage release addendum

The later [coverage ledger](FREIGHTER_LAYUP_COVERAGE_2026-10-24.md) supersedes earlier sample sizes and photography gaps: 2025–26 now has 27 ships across 18 harbors, with real licensed photos for every ship; 2024–25 has 14 records across 11 harbors. Newly added roster entries remain community-reported. The six substantial biographies are regenerated from shared hull/photo and season data; no thin vessel or harbor pages were added. Exact SHA, gate and preview acceptance are recorded in PR #1161.
