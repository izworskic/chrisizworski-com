# Wildlife evidence and public access — release contract (October 25, 2026)

## Scope
Deepen **existing** /waterfowl-freeze-line/, /winter-eagle-watching/, /michigan-shed-antlers/, and /great-lakes-birding/ without replacing NWS, NOAA, Michigan DNR, the existing map, or existing observation feeds. The sister repository michigan-birding-report has its own companion feature PR.

## Decision truth table

| Evidence | What we can say | What we must never infer |
|---|---|---|
| DNR / USACE dated survey | Agency surveyed particular named management unit on stated date; count with source and age | Birds remain there today, birds moved to adjacent lake, region-wide totals |
| Research-grade iNaturalist | Community observation of qualifying taxon on original event date in broad search radius | Bird at the selected public viewpoint; reports equal individual birds |
| GBIF indexed occurrence fallback | Indexed community occurrence exists; lower record-quality confidence, may be delayed or duplicated | Independently research-grade, current eagle concentration |
| eBird checklist reports | Species observation record at an eBird hotspot, event date, effort caveat | Public access at that hotspot or bird currently at report coordinates |
| NOAA ice / snow raster | Dated reference-cell or whole-lake measurement/model | Safe local wetland ice, open river water, local birds |
| NWS hourly forecast | Future observer comfort and possible habitat-pressure context | Animal appearances, eagle cartwheels, shed timing or success percentages |
| Visitor-entered ground state | Visitor's own observation at their intended walking route | Representative ground conditions for another region; actual antler casting |

**Two independent dimensions:** source quality (higher / moderate / limited / not animal evidence) and recency (event-date today or <= source threshold / aging / historical / no verified date). A high-quality old survey must remain **historical**.

## Curated public approaches

- Waterfowl Saginaw Bay: Nayanquing Point viewing platform (end of Kitchen Road); Bay City State Park / Tobico Marsh; Shiawassee Ferguson Bayou Trail; Fish Point's approved visitor routes.
- Waterfowl elsewhere: Horicon Refuge Highway 49 TernPike; Horicon State Marsh visitor facilities; Detroit River Refuge gateway. More regions intentionally show **no vetted public approach** rather than made-up points.
- Shed walking only: Bay City State Park walking paths; Shiawassee Woodland Trail. Walking access **does not authorize removing antlers**. These are not verified locations of deer, sheds, winter yards, or recoverable antlers.
- Eagles: 19 existing source-owned public viewpoints remain intact; weather, dated community reports within 40 km, and exact-site Corps counts remain clearly separated. Do not plot nest/roost or individual eagle observation points.

**Operational closure risk:** Check each operator before travel. Shiawassee Wildlife Drive, Woodland, and Ferguson Bayou have 2026 deer-hunt closures (including October 30-November 5 and late November/December); no calendar-derived "open now" label is supplied. Refuge drive is seasonally closed. Never map an access claim from eBird/observer data.

## Acceptance gates and value function

Quality dimensions, weight and required minimum after release:
- Evidence semantics/truth (35%): 100% of animal claims dated and source-qualified; weather/habitat scores never become presence claims.
- Public access and wildlife protection (25%): 100% curated places link official land operator and directions; no guaranteed current access or collecting entitlement.
- Freshness/failure handling (20%): 100% invalid/future/missing event dates flagged; stale counted but not called fresh; upstream outage not shown as zero birds.
- Usability/clarity (15%): date age and original source visible at relevant decision, mobile responsive; region change updates approaches without stale content.
- Network continuity (5%): existing UI/data models/maps, internal links, source calls and SEO identity preserved.

Release vetoes: incorrect access claims, modeled animal sighting, missing/zero conflation, private wildlife locations, invalid date accepted, script parse failure, red CI, or mobile failure.

## Verification actually performed
- JS syntax checks for updated main tool scripts and sister birding scripts by parsing the fetched branch files.
- Deterministic spot checks for 10 shared evidence classifications and 7 eBird API decisions, including future and invalid dates, age, source and access flags. The main repo adds a node:test file to the standard npm test glob; sister repo adds a standalone Node assertion test.
- Not yet verified: full npm test suite, GitHub Actions, production deployment, rendered mobile/browser smoke checks, maps on device, and live upstream API response differences.
- Release remains in **draft PRs**, do not automatically merge pending checks.

## Source references
- https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa
- https://www.michigan.gov/recsearch/parks/baycity
- https://www.fws.gov/refuge/shiawassee/visit-us/trails
- https://www.fws.gov/locations/shiawassee-national-wildlife-refuge (2026 closures)
- https://www.fws.gov/refuge/detroit-river/visit-us
- https://www.fws.gov/refuge/horicon/visit-us/activities/auto-tour
- https://www.michigan.gov/dnr/managing-resources/wildlife/deer/deer-wintering-complexes
