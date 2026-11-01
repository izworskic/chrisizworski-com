# Space Coast launch viewing: Playalinda NPS GIS, road policy, five-area weather
Date: 2026-11-01
Status: source-audited v2. Release checks required before public claim.

## Ground truth: all thirteen numbered parking lots
NPS public parking FeatureServer:
https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_ParkingLots/FeatureServer/0

Query: UNITCODE='CANA' AND FACLOCID in the thirteen independent identifiers below,
with returnCentroid=true and outSR=4326. Source edit date from records: 2025-05-08.
All thirteen source records have OPENTOPUBLIC=Unknown. That property must NEVER
be interpreted as confirmation of live open access.

FHWA National Park Service Road Inventory (historical, 2009):
https://fhfl15gisweb.flhd.fhwa.dot.gov/Nps/Reports/Rip/Cycle4/CANA_C4_RouteID.pdf
Official historical route inventory confirms Playalinda route 0010, numbered
CANA lots 0901–0913, independently named facility identifiers, and approximate
road mileposts.

| Lot | NPS facility | GIS centroid WGS84 (lat, lon) | 2009 road MP | NPS FAQ beach ramp |
|---|---|---|---|---|
|1|60815|28.654923, -80.632117|0.26|Not specifically named|
|2|60817|28.656906, -80.633413|0.43|Listed|
|3|60818|28.659059, -80.635044|0.61|Listed|
|4|60819|28.661045, -80.636472|0.75|Not specifically named|
|5|60820|28.666910, -80.640706|1.25|Not specifically named|
|6|60827|28.669220, -80.642375|1.44|Not specifically named|
|7|60826|28.671862, -80.644300|1.65|Not specifically named|
|8|60829|28.678293, -80.648803|2.16|Listed|
|9|60831|28.685651, -80.654907|2.82|Not specifically named|
|10|60832|28.688279, -80.657030|3.04|Listed|
|11|60833|28.694453, -80.661720|3.59|Listed|
|12|60834|28.697773, -80.664165|3.85|Listed|
|13|60835|28.701631, -80.666980|4.18|Not specifically named|

Data fixture is saved in data/space-coast-playalinda-gis.json with original
NPS polygon coordinate rings and service attributes (facility ID, last edit
date, status, route MP). This is not crowdsourced or geocoded from address.

NPS ramp FAQ: https://www.nps.gov/cana/faqs.htm
NPS accessibility overview:
https://www.nps.gov/cana/planyourvisit/physical-mobility.htm

NPS identifies accessible beach ramps for Playalinda lots 2,3,8,10,11,12.
It documents accessible parking at the lots, but a ramp listing is NOT proof
of an accessible parking-to-sand pathway today. First five have taller dune
crossings, while by lot eight the dune becomes flatter. The release carefully
says the other seven lots are NOT specifically identified as accessible
beach ramps, not that they are inaccessible.

NPS web source inconsistency: one park page describes thirteen beach parking
areas; another has text identifying fourteen beach access areas. We map only
the 13 named parking polygons validated against the FHWA route inventory.

## Road geospatial policy without fabricated dynamic restrictions

NPS public Roads FeatureServer:
https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Roads/FeatureServer/0

Official road features:
- Playalinda Access Road: facility 60798, route 0300
- Playalinda Beach Road: facility 60814, route 0010

NPS directions gives the exact entrance station 28.6450,-80.6834.
NPS published rocket-launch entry policy states inbound Playalinda Beach Road
closes ~30 minutes before liftoff between fee entrance and parking lot 1.
https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm

The new GeoJSON corridor is derived by snapping that official entrance
point and Lot 1 official centroid onto the corresponding NPS public road
centerlines, preserving the intervening official road vertices. Distances
from the source anchors to the snapped road are <0.0005 degrees.
The source data edits occurred in 2025, and the GIS is not a live closure API.

The corridor is ALWAYS labeled published NPS policy, not a current closure,
a navigable route, a precise barricade placement, or a legal authorization to
enter. The existing mission arrival policy derives a T−30 estimate only from
a minute/second precision launch; it does not infer an open gate. Current
NPS alerts may indicate additional specific closures.
FL511 is linked for surrounding regional incidents but is not interpreted
as a source of real-time NPS gate status.
https://www.fl511.com/about

Previous npsLotClosure logic could mistake "beach south of parking area #4
closed to foot traffic" for "parking lot #4 closed." Sanitize boundary-only
language before parsing lot closures. Verify with both a mixed notice and a
single-lot notice; a group with one closed lot must not mark every lot closed.

## Five NWS forecast reference points

Existing /api/space-coast-launch remains the sole LL2 schedule request.
Five area queries share that normal cached API and cover:
- Space View Park (Titusville): 28.6139417, -80.8037278
- Jetty Park (Port Canaveral): 28.407304, -80.591899
- Rotary Riverfront Park: 28.566364, -80.798183
- Parrish Park: 28.624745, -80.792944
- Playalinda Beach Lot 8 representative: 28.678293, -80.648803

For each exact mission NET inside seven days, NWS /points resolves its
hourly and gridData, skyCoverAt checks the observation's update freshness
and validTime. Missing/stale/absent data is explicitly unknown. The 13 lots
do NOT get thirteen falsely distinct forecasts: they share the representative
Lot 8 NWS grid, identified as district-scale and not proven cloud cover
along the rocket trajectory.

For coarse launch dates/times, do not fetch these forecast grids and do not
produce numeric comparisons or a site "winner". Forecast sky cover and
surface conditions never establish launch readiness or line-of-sight.

## UX and safety rules

A dedicated Playalinda section lets the visitor inspect all 13 polygons,
filter official FAQ accessible ramps, and sort by approximate ground
distance to their selected launch pad. Buttons zoom to official geometry.
No driving directions are generated to a lot polygon centroid because the
NPS GIS explicitly disclaims navigation suitability.

Map overlays:
- 13 NPS actual lot footprint polygons (not dynamic safety exclusions)
- corresponding numbered lot pins
- official road centerline between NPS entrance and lot 1, styled and
  labeled published policy, togglable and never treated as current traffic
- existing public park, visitor entrance and restricted launch pad pins
- dotted park/pad vector, NOT a rocket flight path

Reuses CARTO via existing config endpoint with OSM fallback; no Redis,
additional mapping account or Postgres migration. All GIS, weather and
operational sources are independently identified and can be inspected.

## Verification

- node --test tests/space-coast-playalinda-gis.test.js
- node --test tests/space-coast-geo.test.js
- node --test tests/space-coast-mission-sky.test.js
- node --test tests/space-coast-live.test.js
- Full repository CI gate and public-page audit
- Vercel preview READY and exact production commit READY
- Live browser DOM at desktop and mobile: 13 lot cards/pins, CARTO tiles,
  accessibility filter displays six lots, map state, published road label
- Live API: 13 polygons, no live-opening claim, road centerline and weather
  sites; inspect mission change with available LL2 selectedLaunchId.
- If no verified minute NET, NWS may properly show no forecast; never
  synthesize it.

Next: verified public lot-to-beach path GIS where available; authoritative
NASA-specific beach lot / road-closure polygons as dated overlays, and
explicitly verified current park-capacity status if a public feed exists.
NPS trails service did not return an accessible route result during research,
so no boardwalk route is invented in this release.
