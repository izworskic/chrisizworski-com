# Pukaskwa Living Trail Map: source audit and Experience OS review

Research checked: October 31, 2026. Owning repository: izworskic/chrisizworski-com.
Canonical (unchanged): https://chrisizworski.com/pukaskwa-national-park/

## Visitor job

A Circle Tour visitor chooses a Hattie Cove hike by time, effort and landscape, then needs to find the actual day-use parking and identify shore features without guessing which trail path joins where. A public point is not a certified trailhead, route, signed access point, parking entrance or open-now guarantee.

## Results of the official data audit

**Zero official trail polylines** intersected the Hattie Cove WGS84 envelope (-86.36,48.54,-86.22,48.64) in either tested public Parks Canada Trails APCA FeatureServer layer on Oct 31, 2026. The portal describes one layer as temporary and the other as deprecated; its metadata warns that records can be incomplete and a temporary service contains some data not meant for public-facing releases. That prevents safe trail-line extraction.

Official public Interest Points data yielded 15 features in the same area, but not all should become public visitor attractions. Precisely seven unambiguously public points were approved with individual feature OBJECTID and six-decimal coordinates. They are in public/pukaskwa-national-park/access-points.json, checked by public/assets/pukaskwa-map-contract.mjs against exact IDs and coordinates. A source revision cannot silently change a point or append sensitive landmarks.

Official source list:
- Open Canada public Interest Points dataset: https://open.canada.ca/data/en/dataset/cf5c266c-3a6a-4a3b-aed1-2ddd6e49d5e6
- Actual Parks Canada public layer: https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/Interest_Point_Interet_APCA_OpenOuvert/FeatureServer/0
- Open Government Licence Canada: https://open.canada.ca/en/open-government-licence-canada
- Trails layer metadata and incomplete/deprecated warnings: https://open.canada.ca/data/en/dataset/64a90e8d-5bc0-4027-8645-b5881b4068d4
- Official Hattie Cove campground/trails map image: https://pcweb2.azureedge.net/-/media/pn-np/on/pukaskwa/WET4/activ/maps/Carte-map-HCCAT.jpg
- Parks Canada day hiking and trail names: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking
- Park's day-use parking instructions: https://parks.canada.ca/pn-np/on/pukaskwa/visit/services/boutique
- Official red chairs coordinates: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/chaises-chairs
- Official trail condition dates: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions

Approved public points: Visitor Centre **day-use parking** (1005), visitor centre (990), park kiosk (996), Horseshoe Beach (973), Middle Beach (988), Southern Headland red chairs (985), visitor picnic area (1003). No other features, unlabelled locations, culturally sensitive sites, bridge closure coordinates or camp/backcountry routes are published in this map.

## Two alternatives compared

**A. Trace trail paths from temporary GIS, OSM or the printed brochure.** Rejected: there are no relevant public official GIS lines; tracing by eye and mixing third-party paths would create an apparently navigable but unverified route. The three-way relationship between parking, boardwalk segments and signed starts cannot be proven from that source.

**B. Official illustrated trail-network map plus interactive authoritative visitor-point atlas.** Selected. The park's actual illustration depicts trail paths as it chose to publish them. Separate interactive map pins identify exactly approved open-data places and show the limits of that evidence. Visitor chooser selection highlights a relevant place only, never a route line. The optional map loads on demand, preserving an immediate useful first-screen answer.

Inspiration: Parks Canada's official illustrated map for authoritative path orientation; AllTrails (https://www.alltrails.com/) and Gaia GPS (https://www.gaiagps.com/hike/534512/hattie-cove-visitor-centre-loop-from-horseshoe-bay-via-bimose-kinoomagewnan/) for selection/map relationships, not copied artwork, data, directions or proprietary route geometry. Applies EXPERIENCE_OS_V1, FIELD_GUIDE_V1 real-source evidence and JOURNEY_ATLAS_V1 trip handoffs.

## Interaction and resilience

The official diagram is visible by default and works without JavaScript. Users may load the interactive viewer, which fetches the public tile key from /api/carto-basemap-config. Leaflet 1.9.4 renders only approved Parks Canada points. The map reaches ready only after a raster tile actually decodes, not simply when a library is initialized. CARTO failure attempts real OpenStreetMap tiles; if both tile providers or the library fail, the official illustrated map returns with all seven direct Google Maps **search** links. No driving directions, route polylines, local storage, GPS permission, Redis, new page or AdSense configuration.

A 2-hour moderate coast choice links Southern Headland to publicly mapped red chairs (not trailhead); changing to 30-minute easy beach links to Horseshoe Beach (not boardwalk start). Boardwalk and Beach connections trace to Parks Canada's descriptions, not speculative GIS joins. White River Suspension Bridge is closed as last reported Oct 22; no remote bridge pin is offered. Source status and mapping layers are distinct.

## Verification

Unit: tests/pukaskwa-map.test.js; no-JS public list and rights evidence; tests/pukaskwa-visitor-chooser.test.js. Chromium: scripts/verify-pukaskwa-map-browser.cjs at 360, 390, 768, 1366 pixels, real raster decode, seven markers, chooser synchronization, blocked-tile fallback and no-JS. Existing visitor Chromium suite and repository npm run verify:all plus emitted public HTML audit remain release gates. Do not merge while red.

QA score NOT MEASURED before real browser tests. No claim of verified trail GPS alignment, parking open now, traffic growth, revenue uplift or real-user device performance.

## Next bounded investment

When a licensed public and navigationally reliable trail path graph becomes verifiable, individually cross-check trail starts, junctions, segment edges and closure dependencies against Parks Canada and the actual signed route, then add qualified GeoJSON overlays. Never approximate a hiking route from a beach pin or publish culturally sensitive sites.
