# Michigan Rockhounding Now — Milestone 1 research

**As of October 14, 2026. Research-only.** This branch does not publish a page, modify deployed APIs, change ad behavior, or claim that live waves are evaluated.

## The problem

Answer, for a chosen Michigan stone or fossil: **Which reachable shoreline can I legally collect at, has wave or ice action plausibly exposed stones, and when is it safe to walk?**

Treat these as separate sources of truth: **facility owner; public entry and parking; legal pedestrian route; collecting permission; exact shoreline segment; documented stone occurrence; environmental conditions.** A Great Lakes public-trust shoreline-walking right is not permission to cross private uplands or blanket permission to remove rocks.

### Sources and legal controls

- EGLE rockhounding guidance: https://www.michigan.gov/egle/public/learn/geology/rockhounding — early season and post-storm, **never during dangerous high waves**; general 25-pound/person annual state-land limit is NOT a site-specific permission.
- EGLE Michigan fossils: https://www.michigan.gov/egle/public/learn/geology/rockhounding/fossils — fossil localities including Frankfort public beach. Glacier-derived material means bedrock maps alone are insufficient.
- NPS restriction: https://www.nps.gov/subjects/geology/permits.htm ; Pictured Rocks park instruction: https://www.nps.gov/piro/getinvolved/supportyourpark/leavenotrace.htm — National Lakeshore collection controls must be explicit **prohibited/observation-only**.
- DNR rules: https://www.michigan.gov/dnr/places/state-parks/rules — Recreation Passport and park hours; current local alerts override general guidance.
- Grand Marais Chamber: https://grandmaraismichigan.com/visit-us/attractions/beaches/ — agate beach and harbor beach leads (visitor directions are NOT independently verified exact access points).
- Source beach-area seeds: `data/beaches.json` in this repo. Coordinates are **park/beach-area anchors, not precise entrances**.

## First inventory tranche

`data/rockhounding/pilot-sites.json` has **15 candidates**, **nine priority pilots**, two NPS prohibition controls and **zero cleared collection recommendations**.

**Priority pilots:** Petoskey State Park; Fisherman's Island State Park; Frankfort Public Beach; Grand Marais Agate Beach; Grand Marais Harbor Beach; F.J. McLain State Park; Bay City State Park; Tawas Point State Park; Lakeport State Park day-use.

A useful distinction in the first tranche:
- **Fisherman's Island:** DNR currently reports temporary day-use **vehicle** closure for culvert work; walking access remains described as possible, but the alternative parking route is not verified. https://www.michigan.gov/recsearch/parks/fishermans
- **Lakeport:** DNR lists the day-use area Memorial Day–Labor Day and a precise reference coordinate for the day-use **area**, distinct from the site centroid. https://www.michigan.gov/recsearch/parks/lakeport
- **Tawas Point:** Lake Huron and sheltered Tawas Bay face different directions; split one park into multiple beach segments. https://www.michigan.gov/recsearch/parks/tawaspoint
- **Grand Marais:** open-coast Agate Beach versus protected Harbor Beach provides an exposed/sheltered paired case.
- **Bay City:** mostly sandy Saginaw Bay negative-control. Do not label waves as stones.
- **F.J. McLain:** DNR explicitly notes rockhounding and varying sandy/rocky shoreline. https://www.michigan.gov/recsearch/parks/mclain

## Normalized access and exposure schema to build

For each facility, maintain source and last-check timestamp. Store distinct **entry gate** (owner-backed coordinates), **parking** (entrance, fee, season), **legal walking path** (verified link to shore), and **shoreline segment geometry** (polyline, normal bearing, sediments, sensitive habitats). A single facility may have multiple segments and entrances. Keep **collecting rules** separately (permitted/prohibited/unknown, owner, source URL, area/scope/limit). Record evidence grade and citations for each stone type.

Do not route on approximate park or beach anchors. Avoid suggesting rock collection when exact public entry, lawful route, site-specific collection permission or hazards are unverified.

## Wave prototype

- Operational NOAA NCEP GLWU WAVEWATCH III: https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/wavemodels.php — four runs per day, approximately 3-hour lead steps to 84 hours; regional fields including significant wave height and direction. Access: https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu
- NOAA NDBC recent text: https://www.ndbc.noaa.gov/data/realtime2/45022.txt — observed Little Traverse Bay buoy. `WVHT` is observed wave height; `MWD` (wave *from* direction) is not `WDIR` (wind direction). Handle `MM`, UTC dates, freshness, and seasonal gaps.
- Experimental model comparison only: https://glerl.noaa.gov/emf/waves/WW3/ — not a replacement for operational GLWU.
- NOAA operational GLWU download archive is short-lived (~day). A 72-hour disturbance model requires **scheduled retention of time-stamped wave summaries**, with model cycle/version and wet-cell coordinates. Do not fetch multi-GB GRIB directly per visitor.

`lib/rockhounding/exposure-core.cjs` is an **offline deterministic prototype** only. It compares a trusted segment outward-bearing against wave-approach direction using `H² × period × max(0, cos(direction difference))`. This is *uncalibrated* and has no probability, physical wave-power or safety interpretation. Null segment bearing, missing wave direction or stale source prevents assessment.

## Production gates and validation

1. Never recommend collection when access or rules are unknown; no NPS collection recommendation even after a storm.
2. Distinguish park pins from navigable entrances, walking routes and rock-bearing segments.
3. Test offshore model wet-cell distance, island/headland shelter and beach-side exposure. Tawas and Grand Marais are paired-case priorities.
4. Compare GLWU extracted time series to NDBC observations, logging model run and valid time.
5. Backtest at least three contrasting storm episodes; collect human shoreline observations. **Do not set 'great rockhounding today' thresholds until validated.**
6. NWS marine hazards, lake ice, local park closure and wildlife protections are hard vetoes.
7. Missing feed must yield `CONDITIONS_UNAVAILABLE`, not a middling score.
8. Before launch, confirm official entrance coordinates, parking and area collecting rules for every displayed collection recommendation.

Run locally: `node --test tests/rockhounding-m1.test.js`. Six deterministic tests cover permissions, no guessed route, parsing, directional exposure and staleness.

## Handoff

**Completed:** pilot research inventory with primary-source links; specific closure/season risk annotations; fail-closed wave parser and geometry comparator; six tests. **Not completed:** 20–30 verified *entrances*, site-specific collection authorizations, GIS shoreline segments, NOAA GRIB extraction, field validation or live backtests. No SEO or revenue changes claimed; no live public feature.

**Original next gate (research advanced):** See the continuation below for the now-completed nine-facility documentary review and the narrower remaining on-the-ground verification.


## Milestone 1 continuation: nine access reviews and the Grand Marais spatial pair

**Completed, research stage — October 14, 2026.** Adds `data/rockhounding/pilot-access-reviews.json`: nine official facility/access evaluations linked by site ID to the original pilot list. The corresponding `lib/rockhounding/pilot-audit.cjs` performs explicit eligibility checks; `tests/rockhounding-m1-access.test.js` verifies data integrity. **All nine have documented public beach facilities; zero have an independently proven precise navigable entrance + complete pedestrian route + site-specific collecting authorization.** None are eligible for collection guidance or a turn-by-turn parking pin.

### Evidence levels from primary sources

- **Petoskey State Park:** DNR provides 2475 M-119 Hwy, day-use beach, accessible waterfront walkway, and explicit Petoskey-stone searching. `https://www.michigan.gov/recsearch/parks/petoskey`
- **Fisherman's Island:** DNR describes Bell's Bay Road, rockhounding, and current closure of day-use areas to vehicles during culvert repairs; shoreline and trails may be reached **on foot**. No alternative parking route substantiated. `https://www.michigan.gov/recsearch/parks/fishermans`
- **Frankfort Public Beach:** City recreation plan confirms public west-Main-Street beach and pedestrian walkways; EGLE identifies local fossils. Specific current municipal gathering rule, parking gate and walking-line coordinates still require owner confirmation. `https://cms3.revize.com/revize/frankfortmi/REC%20PLAN%202022-2026%20FINAL.pdf`
- **Grand Marais Agate Beach:** Burt Township identifies its public beach/boardwalk. Chamber gives directional access via north end of main street. A *third-party candidate* pin at 46.675556,-85.985176 is recorded but NOT exposed as navigable. Township's 2026 boardwalk renovation bid proposed changing steps to ramps; completion/closure **not verified**. `https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/`
- **Grand Marais Bayshore Park:** Township confirms municipal harbor swim beach with parking. Michigan Water Trails publishes 46°40.36740′, -85°59.00880′ = 46.672790,-85.983480 as **park/site GPS**, not an exact parking entrance. `https://burttownshipacmi.gov/recreation/bayshore-park-public-swimming-areas/`, `https://www.michiganwatertrails.org/location.asp?aid=4911&ait=av`
- **F.J. McLain:** DNR provides 18350 Hwy M-203, a public Lake Superior beach, an accessible waterfront walkway and explicit rockhounding. Exact park-to-water route still untraced. `https://www.michigan.gov/recsearch/parks/mclain`
- **Bay City:** DNR provides 3582 State Park Drive, boardwalk and seasonal accessible beach mat. Predominantly sandy, with no sourced rock-deposit claim; retains **negative-control** status. `https://www.michigan.gov/recsearch/parks/baycity`
- **Tawas Point:** DNR provides 686 Tawas Beach Road and documented day-use parking next to the *Lake Huron side*. Tawas Bay is a separate shore; do not share wave exposure from one side. `https://www.michigan.gov/recsearch/parks/tawaspoint`
- **Lakeport day-use:** DNR specifically publishes day-use **area** at 43.105475,-82.488804; the campground address is about a mile away. Day-use season Memorial Day–Labor Day. The published point is not an exact parking gate. `https://www.michigan.gov/recsearch/parks/lakeport`

### Legal distinction

EGLE: `https://www.michigan.gov/egle/public/learn/geology/rockhounding` and `.../fossils` state general annual 25-pound rock/fossil/mineral limitation on state land/public-trust shores, subject to specific restrictions. Public park status and this general allowance do **not** prove a particular beach segment authorizes collection. Municipal parks may have separate rules. Our software does not turn `GENERAL_EGLE_LIMIT` or `SITE_ROCKHOUNDING_RECOGNIZED` into `EXPLICIT_SITE_PERMISSION`.

### Two sourced beach-area polygons

`data/rockhounding/grand-marais-research-footprints.geojson` holds **two closed OpenStreetMap beach polygons (research only)**, with copyright attribution and ODbL license recorded, acquired via Overpass on October 14, 2026:

- open-Lake-Superior Agate Beach study footprint: OSM way 434583711, clipped around the candidate N. Lake Avenue access area (the original way is a broader beach polygon);
- sheltered harbor Bayshore Park beach footprint: OSM way 929622678.

These are not the changing waterline, a legal right-of-way, a validated exposure normal or an authoritative boundary. Both set `shorelineWaterwardNormalDeg: null`, so the experimental wave comparison **must not** use them as production geometry. They do allow distinct map footprint layers and manual review without drawing arbitrary rectangles as if they were shorelines. See `lib/rockhounding/pilot-audit.cjs`.


### Candidate pedestrian connections

`data/rockhounding/grand-marais-route-candidates.geojson` adds OSM way **369178056** (Agate Beach boardwalk-style footway/bridge near north Lake Avenue), way **361081154** (Bayshore Park footpath) and **361081155** (steps at harbor access). These three lines were acquired via Overpass with ODbL attribution; they are **crowd-mapped connections and not verified legal entry routes or confirmation of current ramp/step accessibility**. The source facility already documents a township public beach, but current closure, lot-to-footway connectivity, operator permission and shoreline transit still require independent checking.

The access benchmark now includes eight deterministic access/geometry tests plus the original six wave parser/directional tests.

### Testing and release status

Run `node --test tests/rockhounding-m1*.test.js` as a focused suite and `npm run verify:all` before merge. CI on the existing draft PR is the authoritative check; no public deployment or Search Console effect is claimed.

**Superseding research direction, October 15:** Burt Township's 2026 recreation plan documents Agate Beach as a public rockhounding site with boardwalk parking. The user approved proceeding without an operator email. Location discovery may use source-backed general arrival guidance, retaining posted-rule caveats and never inventing an exact parking pin or collection permit. See `docs/ROCKHOUNDING_PUBLIC_DESTINATION_AND_WAVE_PROTOTYPE_2026-10-15.md`.

**Exactly one next action:** Implement and validate NOAA GLWU nearshore wet-cell sampling and exposed/sheltered shoreline bearings for the Grand Marais pair; the township email is not a prerequisite.
