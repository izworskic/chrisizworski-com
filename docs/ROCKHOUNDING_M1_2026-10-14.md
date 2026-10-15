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

**Exactly one next action:** Verify the nine pilot facilities' exact legal shoreline entry routes and collecting rules with operator sources, then map exposed versus sheltered segment geometries for the Grand Marais pair.
