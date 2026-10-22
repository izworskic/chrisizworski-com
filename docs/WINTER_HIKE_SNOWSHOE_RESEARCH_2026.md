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
