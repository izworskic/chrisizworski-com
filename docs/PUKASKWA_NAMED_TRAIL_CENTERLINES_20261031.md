# Pukaskwa Hattie Cove: georeferenced trail centerline audit
Date checked: 2026-10-31
Canonical: https://chrisizworski.com/pukaskwa-national-park/

## Evidence result

Parks Canada's public Trails APCA layer remains incomplete for Hattie Cove: neither the current temporary nor the deprecated public FeatureServer gave a single intersecting trail polyline in WGS84 bbox [-86.36,48.54,-86.22,48.64]. The agency's own illustrated hiking map is still authoritative for paths.

A separately licensable, edit-history-backed source, the OpenStreetMap API 0.6, contains 14 individually named public hiking footways, with 290 ordered WGS84 coordinate pairs, across five Pukaskwa day-hike names. Every way was retrieved using https://api.openstreetmap.org/api/0.6/way/ID/full and checked as a named highway=footway with no restrictive access tagging. Saved source history has last-change timestamps 2023-07-26 through 2025-10-02.

**These are OSM community-mapped GPS-coordinate centerline segments, NOT Parks Canada-certified GPS surveys or complete turn-by-turn hiking itineraries.** It is unknown whether every OSM vertex came from a GPS device or was mapped using imagery. The mapped sections exclude missing approaches and return legs. We will not infer missing connectors or publish downloadable directions.

## Verified feature inventory

| Public trail name | Named OSM way IDs | Mapped km | Official full hike km |
|---|---|---:|---:|
| Beach Trail | 443602400, 742968743, 742968746, 1434966488, 1434966489, 1434966490, 1434966491 | 1.239 | 2.0 |
| Boardwalk Beach Trail | 742332531, 1307756994 | 0.216 | 1.2 |
| Southern Headland Trail | 742973686, 742973687, 769800690 | 1.032 | 2.2 |
| Manito Miikana Trail | 742973685 | 0.846 | 2.0 |
| Bimose Kinoomagewnan | 1115333798 | 2.033 | 3.7 |

The 14 published ways appear in the distinct ODbL database: public/pukaskwa-national-park/trail-centerlines.geojson. Original raw 15 named ways including one deliberately excluded backcountry feature remain for source review at docs/pukaskwa/osm-named-centerline-research-20261031.geojson. Distances are different because official durations/distances reflect the entire return from the Visitor Centre while named community ways often cover only trail-specific corridors.

Endpoint-node topology: all named ways for a given trail form one connected component, measured within 3 metres at source endpoints; no synthetic lines were inserted.

Independent Parks Canada point comparisons: named Beach Trail line is approximately 2m from official Middle Beach GIS OBJECTID 988. Boardwalk Beach Trail is ~18m from Horseshoe Beach OBJECTID 973. Southern Headland line is ~23m from red-chair GIS OBJECTID 985. These are corroborating geographic associations, NOT guarantees of individual vertex accuracy or a verified trailhead. The first signed connector from day-use parking is unresolved for several trails.

Excluded by design: anonymous paths in the campground, all coastal/backcountry paths, the October 22 closed White River Suspension Bridge, sensitive cultural sites, automatic GPS files, and inferred parking or junction access.

## Primary source and rights ledger

- Parks Canada authentic Hattie Cove trails map: https://pcweb2.azureedge.net/-/media/pn-np/on/pukaskwa/WET4/activ/maps/Carte-map-HCCAT.jpg
- Parks Canada official complete hike distances and route descriptions: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking
- Parks Canada dated access and White River closure: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions
- Parks Canada public Interest Points geographic source (separate point database): https://open.canada.ca/data/en/dataset/cf5c266c-3a6a-4a3b-aed1-2ddd6e49d5e6
- Public Trails APCA incomplete/deprecated source: https://open.canada.ca/data/en/dataset/64a90e8d-5bc0-4027-8645-b5881b4068d4
- OpenStreetMap exact original OSM 0.6 way API: https://wiki.openstreetmap.org/wiki/API_v0.6
- OpenStreetMap required attribution and licence: https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/
- OSMF Attribution Guidelines: https://osmfoundation.org/wiki/Licence/Attribution_Guidelines

© OpenStreetMap contributors. Published trail line subset made available under the Open Database License 1.0 (ODbL), with the original way IDs, open coordinates and source edit timestamps. Attribution must remain visible near the interactive map and in the GeoJSON. OpenStreetMap data is separate from Parks Canada's Open Government Licence point data.

## Two user-experience alternatives evaluated

Alternative A: build a full GPS navigation engine using named and unlabelled OSM path segments, guessed trail-to-parking connectors and downloadable GPX. Rejected: original coordinate source cannot certify GPS precision, road legality, every trailhead junction or current access. A continuous synthetic line on the ground would conceal dangerous gaps.

Alternative B: source-qualified named OSM footway centerlines as an OPTIONAL vector overlay in the already-tested CARTO/OSM viewer. Selected: 14 actual line segments grouped into five public trail names, selected-trail highlighting, independently labeled official outing length and mapped length, actual original-way popups, ODbL credits, a hide/show control, and the default Parks Canada illustrated map as authoritative route orientation. No new framework, geolocation request, Redis, or ad changes.

## Release controls

The source contract in public/assets/pukaskwa-trail-geometry.mjs pins the exact 14 way IDs and five route IDs, WGS84 region and source date. It enforces source and licence metadata, coordinate ordering, source-length agreement, maximum 350m gap between recorded vertices, within-route endpoint topology, and three agency-landmark correlation gates. An unexpected replacement way ID, location change, synthetic long jump, source rights discrepancy or added backcountry segment is rejected.

Expected test proof: tests/pukaskwa-trail-geometry.test.js, tests/pukaskwa-map.test.js, actual Chromium overlays for 360/390/768/1366, seven official Parks Canada visitor pins plus fourteen actual SVG OSM walking paths, selection and line toggle, simulated missing trail source, both tile providers failing and no JavaScript. Existing full repository verify:all, authored canonical/ads/Person identity checks and emitted public-site audit remain mandatory. No claim of 100/100 UX, traffic lift, current trail access or production deployment until independently verified.

## Next single investment after release

Investigate the currently absent or undocumented signed access connections between Hattie Cove Visitor Centre parking, the Boardwalk/Southern trail starts, Bimose shoreline approach and Manito Miikana. Obtain independent public route records or a Parks Canada GPS dataset with approval before treating any centerline as an end-to-end navigable track. Never use the source polygons or a beach destination as a presumed entrance.
