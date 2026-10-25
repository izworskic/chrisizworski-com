# Winter hiking parking and road access verification — October 25, 2026

Tracking: #1109 · implementation draft: #1166 · 2026–27 winter

## What was actually verified

The official Michigan DNR/NPS *published location and rule descriptions* were inspected October 25, 2026. **No manager-issued, dated operational report confirmed 2026–27 trail opening + plowed access road + plowed specific lot for any route.** The [NPS current conditions](https://www.nps.gov/slbe/planyourvisit/conditions.htm) page was issued October 12 in **autumn**, and refers to open trailheads on that date. It is not proof of winter parking clearance later in the season.

Data: \`data/winter-hike/winter-parking-checkpoints.json\` (**10 source-reviewed access checkpoints covering 22 named route IDs**) and \`data/winter-hike/winter-access-operational-observations.json\` (**zero operational assertions**).
The other 28 routes remain clearly untracked by a manager-verified *specific* lot. The original 50 route identities remain intact.

### 10 priority checkpoint decisions

| Access checkpoint | Published manager clue | Unknown or active constraint | Official review |
|---|---|---|---|
| Vasa / Bartlett Road (4 routes) | DNR: 4450 Bartlett Rd and snowshoe trail entrance opposite grooming barn | Plowing and road status **unknown**; separate ski lanes | [DNR Vasa](https://www.michigan.gov/recsearch/trails/vasa-pathway) |
| Hartwick Old Growth / Mertz (2) | DNR: 3612 State Park Dr *park address*, visitor center serves Old Growth | Plowed lot **unknown**; Au Sable bridge closure remains a *separate* route caution | [DNR Hartwick](https://www.michigan.gov/recsearch/parks/Hartwick) |
| Tahquamenon Upper Falls (2) | Upper Falls day-use trail/access described | Current day-use lot **unknown**; historic winter plowed-map NOT current evidence; ski-only Lantern/Giant Pines | [DNR park](https://www.michigan.gov/recsearch/parks/tahquamenonfalls) |
| Tahquamenon Lower Falls (2) | Separate Lower Falls day-use area and historic snowshoe loops | Current plowing **unknown**; Upper–Lower connecting hike **not winter-maintained** | [DNR 2020 winter map](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/TF-2020-Winter-Trail-Maps.pdf) |
| Spring Brook Pathway (2) | DNR coordinates identify *trail location*, first and second ungroomed loops | No independent cleared winter lot or plowed forest-road entrance | [DNR Spring Brook](https://www.michigan.gov/recsearch/trails/spring-brook-pathway) |
| Alligator Hill Stocking Drive (3) | NPS: GPS and vehicle parking at Stocking Drive trailhead | Lot/approach maintenance **unknown**; do **not** equate with the seasonally vehicle-closed Pierce Stocking Scenic Drive interior | [NPS trailhead](https://www.nps.gov/places/000/alligator-hill-trail-stocking-drive-trailhead.htm) |
| Old Indian Trail (2) | NPS identifies trailhead and two 2.3-mile loops | Current trailhead lot/road clearance **unknown**; winter ski-track and pet restrictions | [NPS Old Indian](https://www.nps.gov/places/000/old-indian-trail.htm) |
| Windy Moraine (1) | NPS: Welch Road east of M-109 | Winter Welch Road access and lot clearance **unknown** | [NPS trail directory](https://www.nps.gov/slbe/planyourvisit/trails.htm) |
| Good Harbor Bay (1) | NPS: trailhead position and low wetland bridge | Lake Michigan Road and lot plowing **unknown**, bridge ice caution | [NPS Good Harbor](https://www.nps.gov/places/000/good-harbor-bay-trail.htm) |
| Bay City Tobico / Andersen (3) | DNR: 3582 State Park Dr is an **overall park address** | Need specific matching marsh/lagoon/Andersen winter entrance, not default park geocode; wetland ice | [DNR Bay City](https://www.michigan.gov/recsearch/parks/BayCity) |

For all NPS winter ski/shared trails, snowshoe users must stay off groomed ski tracks; winter pet restrictions may apply. [NPS winter activity rules](https://www.nps.gov/slbe/planyourvisit/winteractivities.htm).
For Pierce Stocking Scenic Drive, NPS explicitly says vehicles cannot use the interior scenic drive during winter closure. [NPS seasonal operation](https://www.nps.gov/thingstodo/explore-pierce-stocking-scenic-drive.htm).

## Engine behavior

\`lib/winter-hike-parking.cjs\` is a **source-scoped, target-day aware** operational validator with no user-origin open claims. Each editorial manager-observation row must independently specify:

- exact \`routeId\`, \`checkpointId\`, \`kind\` = \`trail|road|parking\`, \`status\` = \`open|restricted|closed\`
- trusted actual official manager source URL, \`sourceType=dated-manager-operational\`, \`winterSpecific=true\`, matching \`season=2026-27\`
- \`managerObservedAt\` no older than 72 hours (and never future), with \`effectiveFrom/effectiveThrough\` actually covering selected trip day and at most a seven-day effective interval
- open trail: \`namedRouteConfirmed=true\`; open road: \`roadMaintenanceConfirmed=true\`; open lot: \`plowedConfirmed=true\`, \`parkingEntranceConfirmed=true\`, and separate verified \`winter-parking-lot\` waypoint in Michigan

An automated crawl or a description last-checked date cannot set \`managerObservedAt\`. DNR sources cannot verify NPS sites, or vice versa. Valid contradictory manager reports stay blocked; a reported closure prevails until actively reconciled. A route is never certified solely from an NPS trailhead coordinate, GIS destination point or park address.

Even if all three manager assertions were complete, **this stage does not generate driving URLs or enable navigation**, because selected route geometry, conflicting closures, last-mile vehicle access, active NWS hazards, and full release gates remain separate. The research API still returns \`X-Robots-Tag: noindex, nofollow\`. The UI displays three independent statuses, manager source, official phone contact and the exact missing confirmation question.

## Remote-only winter access research workflow (October 25 decision)

**No phone calls, emails or other direct manager contact.** Satellite and published digital sources replace the earlier contact-first research plan. Source-grounded operational winter plowing remains unverified unless a dated, independently accessible agency notice specifically establishes it. Historic images never certify it.

1. Load NASA GIBS MODIS Terra corrected reflectance true-color (browse resolution 250 m) and MODIS NDSI snow-cover classification (approximately 500 m) over each existing DNR/NPS trail reference location. Use dated images from past winters, not current-conditions labels. Example: 2024-01-15 versus 2025-02-15; date, instrument and cloud limitations must be displayed.
2. Keep NOAA NOHRSC snow depth and NWS forecasts independent: modeled snow is not a MODIS observation or direct trail surface measurement. Overlay imagery on the CARTO map while preserving trail points and explicitly mapped closure line segments.
3. Inspect public official DNR/NPS road-closure posts, maps and seasonal rules without contacting staff. Record a proven closure as a block; do **not** infer an open plowed entrance merely because a park website lists an address or a MODIS image shows a snow-free pixel.
4. Cloud gaps, 250–500 m resolution and forest canopy make a visually cleared 10–50 m lot or narrow road **unresolvable**. Do not algorithmically calculate "probability plowed" from MODIS. Display winter travel access as `unknown` until independently verifiable road/lots evidence exists.
5. Use a historical imagery date picker, layer switch, transparency slider and per-trail zoom to let visitors compare real archived landscapes themselves. Preserve source date, map attribution, privacy and mobile stability. Missing tiles = unavailable, never snow-free.
6. If a later public authoritative operational bulletin supplies date-specific open/closed status, the existing winter-access validator can consume it **without contacting anyone**; route geometry and weather gates remain separate. Do not activate navigation based only on satellite data.

NASA Earthdata imagery: https://nasa-gibs.github.io/gibs-api-docs/access-basics/  
NASA MODIS 500 m snow-cover product: https://modis-snow-ice.gsfc.nasa.gov/?c=MOD10A1  
Daily historical browser: https://worldview.earthdata.nasa.gov/

## Failure budget

| Failure | Loss |
|---|---:|
| Direct a driver to an unverified/unplowed/closed lot or closed road | 100 |
| Present a static page as a recent winter access confirmation | 100 |
| Allow a closed segment/manager conflict to produce a positive itinerary | 100 |
| Issue directions to a mismatched route centroid instead of a lot entrance | 100 |
| Incorrect NPS/DNR source origin or season scope | 100 |
| Missing explicit source date or unscoped historical mileage | 10 |
| Unnecessary tap to reach land manager number/question | 1 |

**Merge requirements:** zero 100-loss regressions; pass all native Node tests, \`npm run verify:all\`, site HTML audit, and preview mobile smoke. **Production trip recommendations remain prohibited without current actual manager parking/road/trail observations and full route-closure validation.**

Next evidence-gathering focus: remotely inspect dated MODIS winter imagery at the first ten trail references, compare snow distribution with NOAA snow-depth context, and look for published official seasonal road restrictions. Do not contact managers or infer plowing from MODIS.
