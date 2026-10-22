# Michigan winter hiking & snowshoe decision engine — implementation checkpoint

**October 22, 2026. Phase 1 research staging only; not published.** Tracking issue: #1109.

## What is actually connected

- Michigan DNR [Recreation Search Points OPENDATA](https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRRecreationSearchPointsOPENDATA/FeatureServer/0). A **65-record** point snapshot is in `data/winter-hike/michigan-dnr-candidates.json`. Stable DNR IDs, names, hiking/snowshoe tags and **destination reference coordinates** are preserved. It is a deliberately sampled set drawn from pagination offsets 0, 70, 140, 210 and 280, not an exhaustive or statistically representative statewide inventory. Some candidates are generic or mixed-use trails needing manual adjudication. Sampling and source dates are part of the file.
- Michigan DNR [Trails OPENDATA](https://gisagodnr.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/MapServer): layers 0 temporary closures, 1 reroutes, 2 hiking and 6 snowshoe. Count queries were 193 closure line segments, 9,469 hiking segments and 1,726 snowshoe segments on 2026-10-22. Segment counts **are not** trail counts, open-trail counts or safe-trail counts.
- `lib/winter-hike-decision.cjs` is a **pure offline interpreter**. It does not fetch live NOAA/NWS, resolve a road/parking location, process GIS line intersections, or generate routing. It must not be wired to a public go/no-go output without evidence adapters and manager access checks.
- `tests/winter-hike-decision.test.js` includes offline permission, provenance, age, closure and severe-weather fixtures. It is included automatically by the repository's existing `node --test tests/*.test.js` suite.

## Hard trust boundaries

1. DNR point `Latitude/Longitude` and PageURL are **unverified candidates**, not validated winter parking or confirmed responding official URLs. No Google Maps driving link to them yet.
2. `ActivitiesTags` are permissions candidates; do not assume snowshoe access on groomed XC tracks or motorized trail segments. Cross-check official local manager policy for every destination.
3. NOAA NOHRSC snow is modeled grid depth, not measured packed trail surface. The live NOAA raster is not time enabled. Reuse the first-party snow adapter, verify meters-to-inches and dated layer validity, never construct a fake historical NOAA series.
4. NWS hourly weather is forecast weather, not an observed trail report. A forecast must cover the actual weekend date; warnings need location and effective-time verification.
5. A numeric score in the pure module is an **uncalibrated internal heuristic**. Never present it to users as a quantified safety or trip quality probability.
6. Routine positive decisions require a recent manager-confirmed, **winter-specific** trail/road/parking status. Unknown, undated and contradictory statuses remain `verify`. Known trail/parking/road closures are always excluded. An uncertain geometry overlap is a check, not an asserted closure.
7. Do not resurrect the intentionally retired `/michigan-snowshoe-conditions/` path or duplicate the existing `/michigan-snow-depth/` and `xcski.chrisizworski.com` search intents.

## Next engineering gate (before any user-facing page)

- [ ] Curate 40–60 actually useful snowshoe/hike **destinations** from the raw candidate points: remove duplicates, mixed-use conflicts, park-center placeholders and generic long-distance routes.
- [ ] Validate each official destination URL, activity rule, route length, surface and **plowed winter trailhead parking** with manager citations and date.
- [ ] Implement ArcGIS line-to-trail matching by stable trail/facility ID and actual geometry; overlay current closure/reroute evidence; validate that layer's definition of open/closed is not equivalent to winter road access.
- [ ] Integrate cached first-party NOHRSC and NWS weather adapters with target time windows, units, staleness handling, timeout and source conflict fixtures.
- [ ] Add walk/snowshoe-specific elevation, exposure, daylight, turn-around and ice risk, no-snow hiking alternatives and seasonal access rules.
- [ ] Build a CARTO-driven UI and genuine trailhead navigation **only after** parking coordinates are validated. Use Pictured Rocks content structure and avoid extra ad splits.
- [ ] Test with in-season manager observations, failure simulations, mobile rendering and source timestamp displays. No claims of live operations, trail safety or production deployment until verified.

## Scope and release

This is a research-only branch. Changes consist of a source snapshot, pure interpreter, tests and a handoff document; no public page, API routing, sitemap, advertising or deployment configuration is changed. Keep the PR draft until official winter-access and weather-source integration passes.

## October 22 source-reconciliation update

The DNR GIS `PageURL` values are historical content paths. Spot checks did not establish that synthesized `https://www.michigan.gov` + `PageURL` is navigable. The interpreter now exposes `legacyPagePath` solely as an audit clue and leaves `officialPageCandidate: null` until a public URL is individually verified. `data/winter-hike/michigan-manager-evidence.json` records independently checked **public** manager pages and route guidance; it is **not live status**.

**Critical closure finding:** the Hartwick Pines park page reports part of the Au Sable River Trail indefinitely closed because of bridge problems; it requires an out-and-back rather than a through route. This evidence must be considered even when DNR GIS layers show other segments as `Open`.

**Activity conflict:** the Muncie Lake park page permits snowshoeing beside groomed classic ski tracks. Tahquamenon Falls winter maps instruct visitors not to walk on groomed tracks and show distinct snowshoe and packed walking routes. Check rules per trail instead of applying one assumed statewide groomed-track policy. Historical winter map features do not prove current road plowing.

## October 22 ArcGIS closure-join adversarial fixture

Live DNR GIS queries showed the Au Sable River Trail point ID `090650cb-9a90-4507-92c0-7520eca49af7` appears in closure **layer 0** as `Hartwick Pines Au Sable River Trail`, OBJECTID `2043`, with status `Temporarily Closed Due To Bridge Maintenance Or Repair` and public comment `11/2022: Closed due to unsafe bridge conditions.` In snowshoe **layer 6**, the **same** `RecreationSearchTrailID` appeared as `Hartwick Pines Mertz Grade Trail`, OBJECTID `2091`, with status `Open`. These are two differently named line features, not a clean one-to-one identity join.

The observed mismatch is retained in `data/winter-hike/hartwick-closure-source-fixture.json` and verified with `lib/winter-hike-gis.cjs`. A shared identifier, the literal GIS `Open` field and a place-name similarity cannot establish a cleared/accessible winter route. For an official closure: exact trail identity **and** intersecting geometry **and** manager context are needed before asserting a *specific segment* closure. Ambiguous matching stays `verify`. The active Hartwick bridge closure remains independently documented on the park manager's public page.

## October 22 — live adapter research gate

`lib/winter-hike-live.cjs` fetches a bounded destination point from NOAA NOHRSC ArcGIS Snow Depth (Image layer 3/Footprint layer 2), NWS `/points` -> `forecastHourly`, and NWS `/alerts/active?point=...` independently with 8-second timeouts and a best-effort 15-minute module cache. Only curated Michigan coordinates are accepted. Hourly NWS results must span at least five forecast hours from 10 AM–4 PM on the **destination-local requested date**, with a recent update timestamp. The sampled NOAA pixel is **meters** before inch conversion, 0 is permitted only for a valid dated pixel, and the ArcGIS service time without a zone is treated at **date-only** accuracy using a conservative noon-UTC freshness proxy. Missing/stale/invalid fields are unknown, not zero.

Active NWS alerts are filtered to a conservative Detroit-local outing-date envelope, with fall/spring DST differences safely overincluded by up to an hour rather than missing a near-midnight active alert. **No-alerts-now is not a forecast of no future warning.** An unavailable alert feed remains a separate safety check. The current NOHRSC raster does **not** provide hourly/14-day history or a forecast of new snowfall; the adapter explicitly marks new snowfall `unavailable`.

`lib/winter-hike-trip.cjs` joins source evidence to static manager findings. It is deliberately research-only and can **never** upgrade a DNR reference point or current land-manager description to verified winter parking/road/access; even a good environmental signal returns `verify` until those independent prerequisites are met. `data/winter-hike/michigan-winter-parking-audit.json` logs four manager-source examples. Hartwick Pines has an official visitor-center street address and winter opening schedule, but this does **not** verify winter parking at the selected trail. The Tahquamenon Falls historic winter maps depict plowed road/walking access and actual snowshoe loops; the historical map is not current-season proof of plowing, or a routable lot coordinate.

Tests: `node --test tests/winter-hike-decision.test.js tests/winter-hike-live.test.js` (expected 28 prior + 23 live/parking tests). The live-feed unit suite uses deterministic mocked upstream responses and does **not** claim an end-to-end paid/production deployment, field trail check, full NOAA history, or verified maintained winter parking. Do not publish or merge without the remaining gate.

**Fail-closed hardening:** duplicated hourly periods no longer count as complete forecast coverage. NWS active alert features with missing/invalid start or expiration dates retain their warning name and return `status: unavailable`, rather than being silently interpreted as `no warnings`.

## Phase 3: route geometry, winter access and official-source integration — October 22, 2026

Status: code and research validation complete on draft PR #1110; not an operational trail recommender and not a public release.

Official GIS: DNR Trails OPENDATA layers 0, 2, 6 were queried for WGS84 geometry and stored in data/winter-hike/hartwick-spatial-fixture.json. Hartwick Au Sable River temporary closure OBJECTID 2043 matches an actual co-located hiking geometry segment. Hiking segment 1864 is a separately mapped portion; Mertz Grade segment 2091 shares a DNR recreation ID but has a different trail name. ID alone is not a closure join.

lib/winter-hike-spatial.cjs detects segment-level closure with matching DNR OBJECTID and trail name, at least 40 m of co-located geometry and at least 80% close-path overlap. A selected route containing 2043 is excluded; an unknown route or adjacent open-labeled segment is not certified open. lib/winter-hike-arcgis.cjs reads complete paginated official layers using a curated UUID, fails closed when any layer is missing, caches bounded complete layer snapshots for 20 minutes, and recalculates the closure decision for each selected route.

Winter access: lib/winter-hike-access.cjs requires independent manager evidence for trail, road and parking, each on official HTTPS land-manager domains, date-checked within 72 hours, winter-specific. Plowed parking and a parking-entrance coordinate are distinct requirements; a park address, DNR point or historic map cannot supply a routable waypoint. Four parking research records remain explicitly unverified; no public driving directions were added.

Real-source shape test: a NOAA October 22, 2026 dated modeled grid cell at the Muncie Lake destination reference was 0 inches; NWS October 24 selected 10 AM–4 PM weather contained seven distinct periods, 51–68 F and 5 mph wind. The NWS active-alert point query was empty at check time. This is dated screening context, not observed ground conditions, a current forecast in perpetuity, or proof of weekend trail access. Sample is preserved under data/winter-hike/official-live-shape-2026-10-22.json.

Tests: 75/75 passed in the current-turn source-level JavaScript harness using exact GitHub branch files, including official geometry and weather response fixtures, synthetic failure states and time-bounded cache behavior. Three native node:test files are committed. An independent full native Node test run and production deployment smoke have NOT been completed. No website page, sitemap, public API route, ad behavior, or production configuration changed.

Unfinished launch gates: independently confirm specific winter trailhead and road access at destinations; curate actual chosen routes with vetted lengths and permissions; run full Node and live upstream integration tests; test user-facing CARTO/HTML/JS UX on mobile; reconcile current main branch before considering publication. Neither a GPS route nor a positive winter visit verdict may be issued from static point data.


## October 22, 2026 — curated winter-route inventory

**38 actual named Michigan trail routes across 13 distinct park/trail systems** are now captured in `data/winter-hike/michigan-curated-routes.json`. This is a static editorial/catalog layer, NOT 38 open winter trips. It includes 25 official route-length values (22 in current manager pages/maps and historical source labels separately) and 13 intentionally unknown lengths. A verified official mile count describes only the *specified route*, not the drive, approach walk, concatenated network or seasonally usable length. The numbered DNR trail GIS records remain ancillary geography, not computed loop mileage.

Count by park/system: Muskegon 8, Negwegon 3, Vasa 4, Paradise 3, Pine Bowl 2, Tahquamenon Lower 2 / Upper 2, Hartwick Pines 2, Bay City 3, Grand Mere 2, Harrisville 2, Port Crescent 3, Algonac 2. Geographic distribution: 9 Upper Peninsula, 11 northern Lower Peninsula, 18 southern Lower Peninsula.

**Officially named mapped winter snowshoe loops** include Vasa Orange 1.5 mi / Green–Yellow 0.6 mi / Red 0.25 mi, Paradise South M-123 1.6 mi / North M-123 3.2 mi / North Ridge 3.4 mi (shared with Nordic skiing; grooming uncertain), Pine Bowl short 2.0 mi / long 5.7 mi (DNR grooming text internally contradictory), and Tahquamenon Lower Falls Green 1.6 mi / Blue 2.4 mi from official historic winter map. Vasa's approximate 2.5-mile network total is a distinct **network** entry; don't add its stacked subloops into an invented cumulative journey. Tahquamenon Upper Falls has a real, historically mapped dedicated snowshoe corridor and packed walking corridor without an independently documented whole-route distance: both remain mileage-null.

**General nonmotorized trail systems documented with winter snowshoe permission** include Muskegon's eight named hiking-map routes (0.3–3.1 mi), Negwegon's Potawatomi / Algonquin / Chippewa (3.6 / 3.7 / 3.1 mi), Hartwick Pines Old Growth (1.25 mi) and Mertz Grade (historical 2.0-mi trail description), and named DNR nonmotorized trails at Bay City, Grand Mere, Harrisville, Port Crescent and Algonac. The correct current location and safety of each vehicle entrance remain unknown; official DNR trail point coordinates are labeled **reference locations only**.

**Seven quarantined false positives / known blockers:** Anderson Lake Loop 1, 2 and 3 (2.5, 3.5 and 4.3 mi in a historic XC map; DNR explicitly states campground and seasonal roads are not plowed); Hartwick's previously intact Au Sable River circuit (indefinite bridge closure, no verified new complete loop); Tahquamenon Upper Falls Lantern Loop (1.0-mi ski track, **not** a snowshoe loop); the Muncie Lake 9.8-mile pathway network (not a defined trip itinerary); and the Pine Bowl 5.9-mi pathway network total (not a distinct short/long-loop route). These items are **not** counted in 38 curated routes.

`data/winter-hike/michigan-route-access-research.json` contains 13 official-sourced geographic access investigations: Vasa's listed Bartlett Road parking is merely a historical/static address hint, Paradise shares lot spaces with snowmobiles, Muskegon's channel walkway has a separate 2026 closure, Negwegon's access includes dirt/two-track, and Port Crescent has materially separate park entrances. These contextual facts must **never** set `navigationReady=true`. The catalog's every route requires independent winter-specific trail opening, road condition, plowed lot and matching route geometry before routable travel advice. `lib/winter-hike-routes.cjs` can validate/filter the route inventory and produce intentionally non-navigable candidate cards. Its suite uses Node's built-in `node:test` and verifies provenance, DNR IDs, quarantine, distance scope and 13-area access cautions.

No existing XC ski app route, Michigan snow-depth page, sitemap or production API changed. Do not revive the intentionally retired `/michigan-snowshoe-conditions/` route. This curated source catalog does **not** imply the user-facing CARTO experience is built or that 38 snowshoe outings are presently worth the drive.
