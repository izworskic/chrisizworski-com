# Sleeping Giant Explorer — engine foundation and release plan

**Research review:** 2026-10-28. **Implementation:** first engine foundation on feature branch. **Publication:** not yet published or merged. No public URL, sitemap entry, ad changes or search-ranking assertions in this phase.

## Product to differentiate

"Given my available time, my hiking/cycling preference, and the next forecast window, which genuine Sleeping Giant experience can I plan, what will I actually have to walk, and which critical access details remain unverified?"

This is different from another route list. It resolves three recurring mistakes:
1. Mistaking the **3.3 km named Top of the Giant Trail** for the **21.8 km full return trip from South Kabeyun**.
2. Treating a bike/hike trip as either 21.8 km of walking or 21.8 km of legal cycling.
3. Applying good-looking weather to a summit without checking the complete outing duration, forecast coverage, daylight and official park notices.

## Official primary sources (checked Oct 28, 2026)

- Ontario Parks activity and difficulty/distance table: https://www.ontarioparks.ca/park/sleepinggiant/activities
- Ontario Parks authored bike-and-hike explanations (2024-09-14): https://blog.ontarioparks.ca/bike-hike-sleeping-giant/
- Operating seasons and park context: https://www.ontarioparks.ca/park/sleepinggiant
- Current notices and alerts (separate official page, do NOT infer trail opening from absence of alerts): https://www.ontarioparks.ca/park/sleepinggiant/alerts
- Ontario Trail Network dataset and permitted-use fields, open government license; segments and access-point data have July 2021 vintage and cannot certify current conditions: https://data.ontario.ca/en/dataset/ontario-trail-network
- Environment and Climate Change Canada GeoMet machine-readable catalog: https://api.weather.gc.ca/?f=html ; data contract research only; exact hourly forecast product / spatial representativeness must be verified before implementing a fetch adapter.

### Official route facts

| Route | Round-trip from documented start | Bike-permitted return | Mandatory walking return | Official full-trip walking time |
|---|---:|---:|---:|---|
| Top of the Giant from South Kabeyun | 21.8 km | 13.4 km | 8.4 km | 6–10 h for most hikers |
| Head of Giant from South Kabeyun | 16.2 km | 12.2 km | 4.0 km | Not supplied |
| Nanabosho from South Kabeyun | 17.0 km | 11.8 km | 5.2 km | Not supplied |
| Sea Lion from South Kabeyun | 2.4 km | Not a verified complete cycling route | 2.4 km hike | Roughly 1 h |
| Middlebrun Bay Beach from its own trailhead | 4.6 km | Unknown | 4.6 km hike | Not supplied |
| Pass Lake Overlook from its own trailhead | 1.0 km | Unknown | 1.0 km hike | Not supplied |

The legal cycling routes appear in Ontario Parks activities; the three specific split distances appear in the provincial blog. The top route has **bike racks at the Kabeyun/Talus junction**. Head and Nanabosho have no documented racks. A parking lot's **name** is verified, but its coordinates, current accessibility and vacancy are not.

Never collapse named-trail one-way distance, parking-to-destination return distance, and mixed-bike travel into one number.

## Implemented code

- `data/sleeping-giant/official-routes.json` — six human-reviewed route records with source keys, legal cycling splits, distinct access points, null unverified map pins, and an explicit current-trail-status unknown.
- `lib/sleeping-giant/route-engine.cjs` — deterministic, dependency-free route ranking, official time-range checks, bike permission checks, daylight budget gates and conservative handling of notices. Exposes `plan({hours,mode,interest,remainingDaylightMinutes?,reserveMinutes?,closures?})`.
- `lib/sleeping-giant/summit-window.cjs` — deterministic full-outing forecast and daylight assessment. Accepts **supplied cached** ECCC hourly periods with issuance time and explicit zone offsets; rejects gaps, stale/missing data and trips without source-certified duration. No fetch occurs on page load or in this module.
- `tests/sleeping-giant-engine.test.js` — positive planning, official mileage, legal cycling, short daylight, closure provenance, no fabricated duration, weather gaps, forecast age, timezone, storm signals and contract regression tests.

Use `node --test tests/sleeping-giant-engine.test.js` to run the focused tests. Follow with `npm run verify:all` on full-history checkout and CI before any release. No existing HTML/SEO/canonical asset was changed at this stage.

## Product boundaries and nonclaims

**No public "open today" or "safe to hike" advice.** The core models interpret published trail distance/permission rules; they do not inspect physical trail surfaces, trail closures, parking inventory, wind exposure or the reality of an approaching storm. A "planning_candidate" only means the published walking-time upper bound fits a supplied budget.

- Source-certified full-trip duration is currently limited to Top of the Giant and Sea Lion. Head, Nanabosho, Middlebrun and Pass Lake remain **duration unknown**, even when the distance is known.
- Bike trips have **unknown total duration**. We cannot convert cycling distance into a credible time saving without calibrated cycling/terrain/conditions evidence. The engine can show legal cycling portions but will not call a mixed trip "time-feasible" yet.
- One-hour daylight reserve is an editorial planning buffer, not a safety margin backed by the park.
- No verified trail graph, ascent/elevation profile, junction geometry or parking coordinates are present. Do not draw a line between points or generate Google driving directions until verified independently.
- No API endpoint and no live ECCC cache/feed have been deployed. The weather engine accepts a snapshot from a future adapter. Missing snapshots return unknown, not false green.
- Weather grading thresholds are **initial decision heuristics** and not meteorological safety thresholds. Full-trip temporal coverage matters more than a single sunny hour; park warnings and advisories require separate provenance.
- Date/time inputs must include time zones. The park is in Ontario (`America/Toronto`); don't use Michigan/server local time implicitly.
- Source snapshot dates don't prove a trail is open that day. The source records are immutable research evidence until re-reviewed.

## Proposed next phases, with explicit gates

### Phase 2 — verified geometry and access
Cross-check the government park map, OTN segment/access-point layers and official named junctions. Build an *edge-level route graph*: vertex references, official path classes, walk/bike restriction, junction ID, verified source, uncertainties, and no path if disconnected. Verify top access anchor, Sawyer Bay approaches, Kabeyun/Talus junction, Sea Lion junction and optional access routes. Do not infer path from straight-line coordinates. Obtain terrain profile from NRCan elevation raster only after geometry is source reconciled. Gate: zero invented parking locations and zero bike permissions on hiking-only segments.

### Phase 3 — forecast acquisition
Select one exact ECCC machine-readable point/hourly product after documentation and payload inspection. Add bounded scheduled fetch, source-issued time, spatial representativeness/altitude note, max age, official alerts separately, strict no-data handling and archived contract fixture. Serve a small same-origin cached JSON snapshot to the browser. Never call ECCC on each page load; no Redis dependency. Validate forecast cadence and inspect actual payload before determining the max source age. Gate: no "favorable" result on stale, spatially inappropriate, missing or incomplete forecast data. Require independent validation of forecast conditions against observed historical days before any stronger claims.

### Phase 4 — HTML + JavaScript visitor interface
One distinct canonical `/sleeping-giant-provincial-park/`, only after source and usability gates. Use semantic crawlable HTML with explanatory ranger-style text and the main official mileage table readable with JavaScript off. Layer progressive enhancement via vanilla JS: three destination decision modes, route comparison and full-trip bike/walk bar, time/daylight controls, season/date selection, accessible chart, CARTO/OSM map with official route overlays, no-JS fallback and direct links to Ontario Parks. Use existing `design-systems/field-guide-v1/` design standard and genuine sourced photographs. Mobile QA at 360px, 390px, 768px and desktop; keyboard, screen reader announcements and no horizontal overflow.

Keep one broad destination canonical, separate route URLs only after distinct query intent and evidence support. Maintain Person `https://chrisizworski.com/#person`, author attribution, standard site auto-ads policy, existing Circle Tour canonical and bidirectional stop navigation. Never modify ad placements or existing published guides while building the engine.

### Measurement and PR/release gate
Score first release for route-source truth 30, decision usefulness 25, verified access/geometry 20, frontend usability 15, search distinctness 10. **Any false safe/open/cycling permission/parking assertion vetoes release** regardless of score. Measure GA4 completed route selections, source/directions link opens, GSC impressions/clicks from equivalent 28-day time windows after deployment. New demand and traffic are hypotheses until actual data exists.

**Current next concrete action:** verify the official trail topology and access/parking anchors, then add edge-level graph fixtures and tests. This precedes an interactive map or server-side forecast acquisition.

## GIS/topology implementation completed — October 28, 2026

The initial verified-source topology INVESTMENT is now committed. See `docs/SLEEPING_GIANT_ROUTE_TOPOLOGY_EVIDENCE.md` for exact external endpoints, counts, GIS source IDs, nine non-routable junction candidates, and Ontario Parks vs OTN legal-use conflicts.

- 30 park-managed government GIS trail-feature shapes (simplified **research** geometry, not navigable route geometry); 13 unlabeled government access-point records.
- Geospatial candidate screening from official OTN line endpoints, with deterministic source-ID-preserving proximity report and source-policy conflicts.
- Nine park-described trail relationships audited; all `routeEligible:false`, `manuallyCertified:false`.
- Ontario Parks cycling overlay blocks the incorrect full-length Kabeyun cycling inference, identifies Sawyer/Top/Head/Nanabosho walk-only branches, and flags that OTN omits permitted Sawbill cycling.
- 13 OTN access points remain non-certified as named parking or driveable trailheads.
- Government lengths Kabeyun 40 GIS vs 37 km park; Nanabosho 0.7 vs 0.8; Sibley Creek 1.7 vs 2.3 preserved as conflicts, not silently reconciled.
- Dedicated CI now runs both route/forecast and topology tests, and saves a machine-readable topology audit artifact.

**Remaining geographic gate:** exact official parking approach, cycling cutoff and signed junction locations, full resolution topology, on-the-ground/current access evidence. No user-facing turn-by-turn route or precise ascent/ETA output before those are reconciled. HTML/JavaScript map remains a later product phase.

## October 28, 2026 — stacked release verification

The separate baseline repair PR #1274 passed its 59-step `npm run verify:all` gate in [GitHub Actions run 40800109022](https://github.com/izworskic/chrisizworski-com/actions/runs/40800109022). Other focused baseline checks passed. Public build-and-audit and Sleeping Giant merge-base re-verification must still finish before any release.

This feature PR #1273 is stacked onto `fix/winter-search-ci-baseline-20261028`. It must pass GitHub's **synthetic merge ref** tests against that base (not only the standalone Sleeping Giant unit tests). Neither PR authorizes a main-branch merge, publication or visitor navigation claim.

## October 29, 2026 — named parking and official cycling transitions

Added `data/sleeping-giant/visitor-access-evidence.json` and `lib/sleeping-giant/visitor-access-engine.cjs`, with a source-ledger document `docs/SLEEPING_GIANT_OFFICIAL_ACCESS_EVIDENCE_20261029.md`.

Ontario Parks' own current camping description confirms that the South Kabeyun Highway 587 trailhead is a **large, signed public parking facility** (36.5 km south along Highway 587, with no usable route start reference for automatic navigation), that it can fill, and that vehicles require a valid permit. This upgrades **narrative facility existence and approach**, not exact parking coordinates or today's opening status.

Ontario Parks' bike/hike guide and activity policy verify the Kabeyun/Talus cutoff with a named bike rack and the documented round-trip split for Top (13.4 km ride, 8.4 km walk), plus Head (12.2/4.0) and Nanabosho (11.8/5.2) walking transitions. Head/Nanabosho have no official racks. Seven owner-sourced named anchors are now captured with `coordinates:null`, `parkingCoordinates:null`, `currentOpeningVerified:false`, `turnByTurnEligible:false` and a stable no-GPS gate. It is safe to display owner-authored **textual** wayfinding, not park-at-this-pin links or line routing.

Existing OTN access points remain distinct from the separately confirmed parking lot. GIS topology still has **zero** certified parking coordinates, traversable junction edges or live access checks.

**Next substantive phase after this:** independently anchored full-resolution geometry and signed-trail intersection verification before any turn navigation or dynamic elevation.
