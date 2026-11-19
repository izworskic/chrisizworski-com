# Great Lakes Buoys: Observation Bridge experience investment
Reviewed: November 19, 2026
Mode: IMPLEMENT
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/great-lakes-buoys/
Production source: public/great-lakes-buoys/index.html

## The visitor job
A boater, paddler, angler, beach visitor or weather observer needs to see what two reporting Great Lakes stations *actually observed*, then inspect the official source and marine forecast before making a shore or on-water decision.

## Baseline and friction
The existing page has NOAA NDBC observations, a station map, five activity filters, lake selection, a searchable station list and five-day observation history. But the visitor can only inspect one station at a time in a detail modal. Comparing two locations requires memory or juggling two pages. The older, border-heavy article and large station map also defer a useful comparison until after scrolling.

Baseline source reviewed on November 19, 2026. Current public page read for scope. Baseline 390px and 1280px screenshots: NOT CAPTURED. No assertion is made that source review equals full browser inspection.

The station observation time and data-retrieval time differ. Historical inline snapshot data may be months out of date when the live API fails. The design must not present a cached observation, absent wave sensor or stale timestamp as a current marine safety verdict.

## Three opportunities considered
1. **Two-station observation comparison:** selected. Existing enriched NDBC readings allow an immediately useful side-by-side view with source age. Small, no new feed and no new serverless costs.
2. **Map and station list synchronization:** valuable, but depends on functional third-party map tiles and adds complexity. Existing station map remains usable.
3. **Activity/shore suitability review:** important source-truth task because open-water reports are not site-specific safety clearance. A separate data and science review is needed before changing the existing activity thresholds. This investment adds explicit marine forecast handoff instead of a new invented GO/NO-GO score.

## Two credible, different experience concepts
### Concept A: Map-first water conditions canvas
First 390px screen: compact map, choose a first buoy and pin another. Desktop: wide geographic canvas with a floating dual observation card and optional time-series panel. It is geographically intuitive but depends on tile availability, screen real estate and precision tapping. A list-only fallback would need its own two-point selection model. Larger effort and accessibility risk.

### Concept B: The Observation Bridge (selected)
First 390px screen: clear comparison headline, two native station selectors and a stacked marine-instrument readout. Each selected report shows significant wave height, wind, water temperature, observation time and source. The conclusion states the *measured difference* only when both reports are recent and wave sensors available. On desktop the two instruments sit side by side over proportional bars. Existing map and full list remain below, with a new list-to-bridge handoff. In a failed API state the saved snapshot remains visibly labeled and older observations cannot generate a confident comparison. Small-to-medium scope and independent of map tiles.

## Why it differs from other tools
- **Great Lakes Beaches:** recommends a specific coastal visitor situation using several conditions and observations. The Bridge compares two actual buoy measurements without predicting any beach or boating safety.
- **Great Lakes Water Temperature:** explores temperature geography and seasonal context. The Bridge treats wave, wind and water-temperature sensor availability as separate inputs and shows explicit observation-age status for each station.
- The first screen centers a two-location **comparison task**, rather than a collection of weather totals, time layers or a generic card/map layout. Instrument readouts, paired evidence bars, native A/B selectors and direct source links make this a purpose-built measurement interface.

## Actual source changes
- Add a semantic, HTML-first comparison section immediately after the retained static NDBC answer, ahead of the legacy content.
- Add lightweight scoped CSS for legible ship-bridge-style instrument readouts. Phone layouts stack instead of squeezing the pair; keyboard focus and reduced-motion rules are explicit.
- Add dependency-free JS subscribed to the existing normalized station feed. Reuse station identifiers, wave heights, wind, water temperature and NDBC observation timestamps. Never interpolate missing measurements.
- Connect existing searchable station list to the A selector without replacing the full five-day history modal. Preserve previously implemented map/activity/lake functions.
- For API outages, display the source as a saved snapshot and distinguish observation from retrieval. Older than two hours, missing/future timestamps, same station or missing wave sensor refuse confident comparison.
- Add deterministic Node tests for HTML integrity and observation-time, missing-data and A to B to A behavior.

No API, feed schema, recurring job, runtime dependency, Rust/Python rewrite, new indexable route, Person/canonical metadata, AdSense policy, provider tile configuration, sensor inference or navigation destination was intentionally changed.

## Primary references
- NOAA National Data Buoy Center, current/realtime station data: https://www.ndbc.noaa.gov/faq/realtime.shtml
- NDBC official data: https://www.ndbc.noaa.gov/data/
- National Weather Service Marine Weather: https://www.weather.gov/marine/
- NWS marine FAQ about significant wave heights and localized marine conditions: https://www.weather.gov/marine/faq
Sources checked November 19, 2026 for the data and terminology contracts. Links do not establish that a station is reporting right now.

## Interaction and failure matrix
| Scenario | Expected visitor outcome | Coverage |
| --- | --- | --- |
| A and B recent, both measured wave height | Numbers, source/time and a measured difference are displayed | Pure function Node test; browser NOT VERIFIED |
| Change A to C, then back to A | Distinct new difference, original comparison restored | Pure function Node test; browser NOT VERIFIED |
| Same station on both sides | No fabricated cross-location difference | Pure function Node test; browser NOT VERIFIED |
| One station missing wave sensor | Wave comparison unavailable, other measured fields retained | Pure function Node test; browser NOT VERIFIED |
| One report older than 2 hours, future or unparseable | Reading flagged older/unknown; no current-difference verdict | Pure function Node test; browser NOT VERIFIED |
| Site API fails but snapshot loads | Data source disclosed as saved snapshot, legacy full list remains | Source path reviewed; browser NOT VERIFIED |
| Leaflet/CDN/map tiles unavailable | Pair selectors should render without map, static answer and official links remain | Architecture reviewed; browser NOT VERIFIED |
| JavaScript disabled | Original NDBC static answer, official references and navigation remain useful | Source inspection; browser NOT VERIFIED |
| Keyboard/narrow screen/reduced motion | Native select, action buttons, visible focus and stacked cards | Code/CSS reviewed; browser NOT VERIFIED |

## QA and release status
Experience OS v1.2.1: Distinctiveness rationale documented, but weighted scores NOT MEASURED without real browser observation. 360/390/768/1280/1440 pixel screenshots NOT CAPTURED. Source-only structural tests authored, but test execution NOT VERIFIED until CI runs. Foundry 0.3 improve/prove CLI: NOT RUN because no working full checkout was available in this environment; this document does not pretend to supply a Foundry proof. Live NDBC readings and real map tiles after deployment: NOT VERIFIED. No production change and no measured engagement, CTR, revenue or boating outcome attributed to this PR.

One next action: run the exact-head full repository CI and actual Chromium/browser scenarios before merging or deployment.
