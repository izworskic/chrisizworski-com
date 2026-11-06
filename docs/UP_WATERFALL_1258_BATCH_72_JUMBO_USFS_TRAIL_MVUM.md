# Issue 1258 / B72 — Jumbo Falls official federal trail and visitor location repair

Investigated November 5, 2026. The new visitor experience is at /upper-peninsula-waterfalls/jumbo-falls/. This is a verified, seasonally constrained federal forest trail, not a live opening or GPS parking recommendation.

## Official trail and geography

The U.S. Forest Service EDW National Forest System Trails service at https://apps.fs.usda.gov/ArcX/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0 publishes one exact JUMBO FALLS trail #60056 with 23 WGS84 vertices. Published GIS length 0.079 miles; hiker/pedestrian management 01/01–12/31; accessibility explicitly NOT ACCESSIBLE. Its end point 46.4495918,-88.9130712 lies just 23 metres from independently documented falls location 46.44963,-88.91278 (https://www.waterfallsofthekeweenaw.com/jumbo-river/jumbo-falls/). The trail begins at 46.4503638,-88.9141901. This is authorized source geometry for a pedestrian trail, not an invitation to infer a parking bay.

The earlier USFS recreation site marker (recarea 12356, 46.457753,-88.912228) is 904 metres from the natural waterfall. Michigan state GIS waterfall #29 point (46.453006,-88.912138) is 379 metres north. State GIS original coordinates stay unchanged in the provenance ledger; the curated map uses the independently documented natural point close to the actual USFS trail end. All distances are straight-line source reconciliations, not driving or walking distances.

## Forest road jurisdiction and season

The USDA Forest Service EDW Motor Vehicle Use Map service, https://apps.fs.usda.gov/ArcX/rest/services/EDW/EDW_MVUM_01/MapServer/1, returns two existing FR4589-B road segments classified "Roads open to all Vehicles, Seasonal". The passenger and high-clearance vehicle date field is 05/16–03/14 on both. An official motor-road vertex coincides with the pedestrian trail beginning, a geographic crosscheck rather than a verified parking-space point. March 15 through May 15 is outside this designated driving period. These motor vehicle rules are not proof of day-specific road passability, snow plowing, actual parking capacity or a currently open gate.

The USFS Recreation Opportunities service https://apps.fs.usda.gov/ArcX/rest/services/EDW/EDW_RecreationOpportunities_01/MapServer/0 identifies Jumbo Falls recarea 12356, with published status "open" and January–December recreation season. That listing does not substitute for a live trail and bridge inspection. Regional Copper Country trail guidance (https://www.coppercountry.com/experiences/hiking/ottawa-national-forest-trails/) names an informal parking area and two puncheon bridges, but does not supply approved precise GPS parking.

## Visitors

The field guide interprets the forest, includes an interactive CARTO/Leaflet foot-trail map with actual 23 USDA vertices and a separate natural waterfall marker. Visitor planning presents the motor road seasonal designation, the "NOT ACCESSIBLE" trail classification and the uncertainty about physical gate/bridge/current road conditions. No auto driving route to any of the three historical geographic points, to the trail start or to the forest road geometry. Do not advise roadside, gravel-pit or private parking as a substitute for an approved spot.

The published source records, exact GIS reconciliation and waterfall catalogue now support 76 curated destinations, 69 exact GIS links, and 92 pending GIS research features. The indexable visitor guide and one hub card are added, while the historical 2026-10-31 B37 research page remains noindex and links to the new verified trail. Sitemap 74 URLs, visitor-hub JSON-LD ItemList 74 entries, Python nearby index 68 verified arrivals / 8 excluded, and research queue 92 pending.

## Other falls evaluated

Gwinn First/Second Falls have an officially documented municipal riverside park trail, but independent field descriptions characterize them as approximately 3-inch drops; a 357m discrepancy remains for the second GIS point and township does not identify two signed viewing endpoints. Existing B53 source-gated reviews remain, with no artificially promoted waterfall stops. Cataract Dam Falls remains blocked by dam-area safety and visitor-access uncertainty.

## Verification gate

Run the exact current PR head through B72 tests, Python nearby and Node queue generator checks, full npm run verify:all, waterfall browser/map smoke, public HTML audit, search protection, and successful Vercel preview. Do not merge while checks fail or are pending. Record production Vercel status separately.
