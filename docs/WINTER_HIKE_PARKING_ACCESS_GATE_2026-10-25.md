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

## Operational manager verification workflow

1. Contact the listed DNR park/pathway manager or NPS ranger, identify the **specific** signed winter route and **named lot** (not generic park), request official winter access/closure status for **both** trip day and chosen entrance.
2. Obtain written official or directly manager-confirmed evidence of plowing, vehicle passability, exact maintained *parking entrance* lat/lon, route openness, and applicable grooming, closure and restricted-use rules. Record when the manager actually checked, not when we read the page.
3. Review source provenance and effective dates, record separate trail/road/parking rows for each route that actually uses the lot. Do not propagate a park-wide "open" statement to unrelated entrances.
4. If conflicting or uncertain, preserve **unknown/restricted/closed** and the contact question. Manual field validation or manager operational records are required; old website maps and weather reports do not resolve missing access.
5. Once route geometry + closure identity and weather checks also pass and a separate publication decision is made, implement verified-only *lot* directions (never source reference dots) and verify on mobile with working maps.

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

Next evidence-gathering focus: the first 10 locations above, beginning with Bartlett Road Vasa and the independent Upper/Lower Falls day-use lots. No assumption of snow or plowing is justified merely by the fact the trail is a good winter recreation destination.
