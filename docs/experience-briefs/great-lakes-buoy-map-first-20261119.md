# Great Lakes Buoys: map-first Experience Investment
Date: November 19, 2026
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/great-lakes-buoys/
Mode: IMPLEMENT
Constraint: Preserve canonical, Person JSON-LD, all existing NDBC data/API/units, ad treatment and useful history/compare capabilities. Explicit owner request to remove first-person promotional explanation and make the map plus clicked activity the lead.

## Visitor task and diagnosis
**Question:** I am heading out fishing, paddling, swimming, sailing or diving. Which actual Great Lakes station reports near the place I care about, what has it observed, and how does that report compare with my activity's screening thresholds?

**Action:** Choose activity, choose a buoy, inspect measured wave/wind/water and observation age, consult NDBC/NWS, optionally compare a second buoy or inspect history.

**Observed November 19, 2026 baseline:** Source and the live map at 390px and 1280px were inspected. The map did load with CARTO raster tiles and NOAA-derived markers at both widths. The problem is that the map appeared only after a long author narrative, a full two-station instrument deck, lake counters and a filter heading. At 390px the map itself was readable but the main task started too far down. Existing safety colors labeled any matched editorial threshold as “Safe,” even when some required sensors were missing. There was no selected-station dossier directly attached to map interactions, only a modal.

**Evidence:** Existing source `public/great-lakes-buoys/index.html`; existing exact-page snapshot and pre-existing `scripts/buoy-observation-bridge-browser.cjs`; NOAA primary station source https://www.ndbc.noaa.gov/ and US NWS marine forecast https://www.weather.gov/marine/ . Actual map screenshot observed via browser capture (not saved in repo as an artifact). Current nearshore safety at any location NOT VERIFIED from offshore point observations.

## Three opportunities
1. **Reduce pre-map friction:** move activity filters and real map immediately after compact title. Preserve source answer and the entire comparison below. Low complexity, high first-screen benefit.
2. **Connect map marker to observed evidence:** show small selected-station dossier with source age, missing readings, activity interpretation, history/compare next step. Medium complexity; uses existing normalized NDBC and history engine.
3. **Prevent false safety assurances:** require recent timestamps and every sensor the editorial activity screen uses; replace “safe/unsafe” with “within/outside/unknown.” Small to medium complexity, material source-truth improvement.

## Two design directions
**A. Map + activity choice + selected-station dossier (selected).**
- 390px: compact H1; six native activity buttons; Great Lakes map; nearby selected-station readout on tap; clear NDBC and forecast links.
- Desktop: generous full-basin map, activity choice above, station dossier as a wide instrument strip directly below.
- Controls: selecting an activity changes marker evidence colors and selected station interpretation; selecting a buoy updates an actual reading and its recent/old/missing state. List and station picker work if map does not.
- Failure: no scripts or tiles -> NDBC source and station directory; API outage -> labeled old snapshot, no current GO verdict.
- Cost: existing code + scoped CSS/JS; no new API, framework or Vercel function.
- Tradeoff: map needs readable markers and reliable basemap; robust station selector and list remain mandatory.

**B. Activity-by-activity ranked bulletin board (not selected).**
- 390px: selected activity atop a ranked list of recent stations, with a compact mini-map as secondary spatial index.
- Desktop: two-column conditions table and small linked map.
- Advantage: keyboard browsing is efficient and weak map connectivity less disruptive.
- Disadvantage: ranking all stations by one heuristic can suggest safety and does not respect geographic specificity; would look like generic weather leaderboard rather than an invitation to explore the actual Great Lakes.

## Distinctiveness veto
Relative to **Great Lakes Beaches**, which coordinates named shoreline beaches, this tool asks for the actual offshore/coastal sensor chosen on a lake-wide map, not a beach trip verdict. Relative to **Great Lakes Water Temperature**, this tool uses an activity-specific evidence screen across three measured sensors, with mandatory timestamp recency and explicit unknown states. Map marker → measured dossier → official NDBC source → compare/historical observations forms a distinct task flow. It does not clone Snow Totals' numerical leaderboard, generalized multi-card hero, or a park photo-first itinerary.

## Changes
- Remove promotional first-person “why I built this” and the excessive About block; keep concise visible creator line below data coverage and footer.
- Keep search-visible H1, existing static NOAA quick answer, FAQ, authoritative reference links and all original tool features. Static quick answer moves after map, which still has an HTML-first title and station instructions. Preserve no-JS links.
- Make native activity tabs and the map the first interaction. Each tab exposes `aria-pressed` and visibly changes station colors and selected-station explanation.
- Add a native station picker and on-map station dossier that surfaces original measured wave/wind/water values and observation timestamp; a single selected ID drives map highlight, keyboard selection and dossier; source and existing history/compare accessible in one action.
- Correct activity thresholds from permissive missing sensor matches to “unknown” when a required sensor or report time is absent or old. No safety clearance inferred.
- Make old snapshot/API failure explicit; collapse verbose CTA into a recent observation-only network sample. Preserve activity screening thresholds as editorial, not Coast Guard rules.
- Map viewport fits the full Great Lakes by bounding box; existing raster source, key, attribution and Leaflet library unchanged. No invented navigational location or travel-time metric.
- Add a focused unit/structure test and expand the exact-head browser QA to 360/390/768/1280/1440, API outage, no-JS, map blocked, activity switch and A-B-A marker/picker selection.

## Acceptance and limits
| Scenario | Required observed outcome | Evidence status at creation |
| --- | --- | --- |
| Initial 390 and 1280 screen | Activity choice and map precede comparison/narrative | Source implemented; browser pending |
| Kayaking on a recent complete report | Marker status within/outside; station dossier updates; not declared safe | Unit and browser tests authored |
| Missing water/wave sensor | Gray unknown; no inferred pass | Unit test authored |
| Older or saved snapshot | Old badge and no active boating verdict | Browser test authored |
| Map marker / station picker A to B to A | One selected ID, same named station, source and measured metrics | Browser test authored |
| Select station then Compare | Existing A station matches marker, scrolls to original comparison | Browser test authored |
| Blocked tiles or script | A useful station picker/list and NDBC source remain | Browser fallback incomplete until verified |
| No JS | Static authoritative answer and official NOAA link; no empty oversized map | Browser test authored |
| Ads, Person, canonicals, sitemap | Unchanged except accurate dateModified/lastmod where required | Full CI pending |

### Release state (do not conflate)
Code commits and targeted tests: pending verification.
Responsive Chromium screenshots: pending.
Owning repository 60-step CI: pending.
Deployed preview: NOT VERIFIED, Vercel may skip non-production previews.
Production, public live render and measured engagement/CTR: NOT DONE.

**Next:** complete exact-head CI, inspect real mobile and desktop screenshots and page errors. No merge without passing all gates and owner authorization.
