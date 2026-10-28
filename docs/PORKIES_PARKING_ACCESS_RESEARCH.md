# Porcupine Mountains — parking and trailhead access verification
**Research performed:** 2026-10-28. **Publication gate:** Source-corroborated *map references* only; NOT certified current parking, vehicle entry, accessible route or trail conditions.

## The visitor outcome
From a selected approach and date, visitors can identify a **specific DNR mapped parking asset** near a named DNR trail, compare park areas on the map, open Google Maps at the asset, and get driving directions **only when seasonal restrictions do not require withholding them**. It does not imply that Google directions account for winter road closures. Six source-corroborated places are available; unverified lots remain excluded.

## Independent official evidence

1. [Michigan DNR parking asset layer](https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/6) (read-only). Query the envelope \`-90.05,46.60,-89.55,46.91\` using \`geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID,ASSETTYPE,ASSETDETAILTYPE,DESCRIP,OWNEDBY&outSR=4326&returnGeometry=true&f=geojson\`. Returns **16** state-managed asset points named Porcupine Mountains with type Pavement Surface (Parking Lot). DNR asset coordinates are WGS84 points, not surveyed entry-gate polygons.
2. [Michigan DNR named Recreation Search Points](https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRRecreationSearchPointsOPENDATA/FeatureServer/0) query \`Title LIKE '%Porcupine%'\`, \`outFields=OBJECTID,Title,Latitude,Longitude,PageURL,LocationTypeTags\`; returns named park trails, sites, lodgings and representative locations. These points are **not inherently parking**, and several *different trail titles share exactly the same generic coordinate*, so do not treat every Recreation Search coordinate as a trail entrance.
3. [Official park GPS map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf), issued July 14, 2025. Displays named park roads, facilities, scenic areas, trailheads, waterfalls and unbridged crossings. Map supports naming/access-corridor checks; it does not establish operational status.
4. [DNR park operations](https://www.michigan.gov/recsearch/parks/porkies) on October 28, 2026: Dec 1–late spring vehicle closure on M-107 from Whitetail parking and South Boundary Road from Headquarters Road to Pinkerton Trailhead; opening only when road commission deems safe. Presque Isle Scenic Area retains independent County Road 519 approach from the west. Winter sports complex access from east, subject to operations. The published notice is a **seasonal policy**, not a real-time gate feed.
5. [DNR 2025 visitor guide](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf): Lake of the Clouds 100-yard paved/boardwalk approach; campers/trailers are directed to the middle ski hill lot on busy summer/fall days. Summit Peak 0.5-mile dirt approach plus steps and tower; campers/trailers use designated lower lot by South Boundary turn. Presque Isle has a day-use/pavilion area and separate contact booth gravel path to Nawadaha. None of those *alternate trailer/contact* parking coordinates has been independently confirmed from the 16 point inventory.

## Source-corroborated parking records

The **meter value is separation between DNR parking-asset and DNR named recreation POINT**, not walking distance, safe route distance or driving distance.

| Visitor destination | DNR parking asset id | DNR named recreation id | Separation | Vehicle approach |
|---|---:|---:|---:|---|
| Lake of the Clouds / Escarpment access | 1409 | 3761 | 74 m | M-107, subject to winter closure |
| Summit Peak Tower Trail | 72 | 3749 | 31 m | Summit Peak entrance from South Boundary, subject to closure |
| Presque Isle East/West River trail area | 841 | 3763 | 66 m | Western County Road 519; individual lot condition not live-verified |
| Pinkerton Trailhead | 1294 | 3752 | 27 m | Western South Boundary, seasonal access uncertain |
| Visitor Center Nature Trail | 11 | 3744 | 25 m | East-side park/Headquarters Road; hours/parking seasonal |
| Winter sports trail-network area | 171 | 3747 | 38 m | East-side ski complex approach, verify operations |

Records reside in \`public/porcupine-mountains/access-points.json\`; the full 16-asset positive/negative inventory is \`data/porkies-parking-crosswalk.json\`. Each published record retains both source IDs and coordinates. The test calculates independently that cross-source geodesic separation is <=100 meters; this proximity is **necessary but not sufficient** for safe navigation. Printed map and narrative access remain mandatory. These six are *DNR source-corroborated*, not independently inspected, and are never marked “open today.”

### Ten deliberately rejected asset coordinates

| Asset id | Disposition |
|---:|---|
| 129 | South of Summit network; unmatched named parking facility |
| 130 | Interior roadside asset; no sufficiently matched named entrance |
| 148 | Western trail approach area, no distinct named trail pin |
| 223 | South Summit approach area; no source-supported exact public trailhead |
| 291 | ~253m from White Pine Outpost; campground rather than confirmed day-use lot |
| 609 | Presque separate lot; ~255m from generic river trail point; exact approach unverified |
| 639 | ~502m from Union Mine/Spring representative recreation point |
| 689 | Summit area asset ~1.2km from named Summit Tower trail reference |
| 1153 | 26m from White Pine overnight outpost, NOT assumed public day-use parking |
| 1393 | Southern Presque campground-area asset ~450m from campground representative point |

The map excludes these points, even if they look plausible on a basemap. Future work may promote a specific point only with **a named, source-supported signed public access match**. The unverified trailhead names section includes Government Peak, Little Carp River, Speakers, Lost Lake, South Mirror Lake, Union Mine/Spring, Nonesuch and the exact Nawadaha contact booth approach. It links to the official DNR map without inventing an entry coordinate.

## Season and directions decision policy

- **June–October, roads otherwise unverified**: permit a Google driving-directions link to six individually mapped assets depending on their named seasonal type; tell visitors to check actual opening and parking.
- **November**: no automatic directions to seasonal M-107/South Boundary parking, even though the DNR policy generally starts December 1; transient weather restrictions remain possible. Presque Isle County Road 519 approach can still be linked with caution.
- **December–April**: M-107/South Boundary seasonal assets stay *map-view only*. Preserve County Road 519 directions for a **west-origin** visitor and the east-side winter sports option for an **east-origin** visitor, both with operational caveats. Explicitly withhold the opposite origin-to-destination direction in winter to avoid blindly routing over closed cross-park roads.
- **May**: do not infer M-107/South Boundary reopened; source-backed west approach remains a potential option **only for west-origin directions**. Visitor-center and ski operations remain unverified until their season begins.
- No live traffic, lot occupancy, GPS-routing service, terrain safety assertion, or exact park driving/walking ETA.
- Buttons point to the **DNR parking asset GPS coordinate**, not a waterfall/overlook/cabin attraction coordinate. A Google Maps route may be wrong; park signage and official closures control.
- No directions auto-generated to a backcountry wilderness hike without a verified route, crossing and return path.

## Product architecture

- \`public/porcupine-mountains/index.html\`: accessible, crawlable six-card source facts, dual official map/park links and named unresolved trailhead disclosure.
- \`public/assets/porkies-access-map.js\`: read-only public JSON, real six-marker Leaflet map, same-origin \`/api/carto-basemap-config\` when usable, OSM tile fallback; cards/map synchronized to current preliminary itinerary, accessible map controls and date-based directions.
- \`public/assets/porkies-explorer.js\`: selecting visitor inputs recommends one or more districts and correctly preserves the CR519 Presque Isle winter alternative.
- \`tests/porkies-parking.test.js\`: 16/6 split, two-source coordinates, distance test, withheld parking, all six HTML source cards, Google Maps coordinate target, seasonal negative-case matrix.
- \`scripts/verify-porkies-browser.cjs\` + GitHub action: 390px/340px mobile & desktop screenshot, map with six pins and multiple loaded tiles, mobile overflow, panel selection, winter withheld directions, no-JS source fallback.

## Critical unresolved dependencies

1. No GPS-verified *alternate trailer parking* pins for Lake of the Clouds or Summit Peak; do not route RVs to the small upper lots.
2. Not all Presque lots are interchangeable; especially the Nawadaha contact booth versus riverside day-use/waterfall access. DNR day-use signage is still the final guide.
3. No verified driveable road routing graph/turn restrictions. A source-matched parking point is a useful navigation destination, NOT confirmation that Google routed it along an open legal road.
4. Trails GIS contains 819 feature geometries with known overlap and discrepancies; no end-to-end trail distance, water-crossing clearance or hiking ETA should be generated until topology is reconciled.
5. Vercel preview is protected by SSO and production is untouched. Keep **noindex** and draft PR until full CI and mobile/map browser evidence are green and final field-guide release score is assessed.

**One next investment:** reconcile the real road/turn and trail geometry network (bridges/crossings and point-to-point trail lengths), adding selected arrival-to-parking travel ranges only after source and routing tests establish actual feasibility. No invented travel times.
