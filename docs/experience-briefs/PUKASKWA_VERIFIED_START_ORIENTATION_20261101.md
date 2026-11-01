# Pukaskwa verified Visitor Centre origin and unverified start connectors
**Review:** November 1, 2026. Owner: izworskic/chrisizworski-com. Canonical: https://chrisizworski.com/pukaskwa-national-park/

## Verified official evidence
1. Parks Canada day hiking: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking . All eight published lengths and hiking durations are returns from the Hattie Cove Visitor Centre. The Combination Hike specifically goes Visitor Centre -> Southern Headland -> Horseshoe Beach -> Beach Trail -> North Loop Campground -> Halfway Lake -> road back to the Visitor Centre.
2. Parking: https://parks.canada.ca/pn-np/on/pukaskwa/visit/services/boutique . Official day-use parking is at the Visitor Centre, not a verified precise signed trail entrance.
3. Original illustrated trail map: https://pcweb2.azureedge.net/-/media/pn-np/on/pukaskwa/WET4/activ/maps/Carte-map-HCCAT.jpg . Official illustration is not a navigation-grade coordinate survey.
4. Seasonal facilities: https://parks.canada.ca/pn-np/on/pukaskwa/visit/heures-hours . Visitor Centre regular season ends September 15, kiosk October 15; November staffing and road access are not assured.
5. Official public condition notices: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions . As reviewed Nov 1 the White River bridge notice remains closed dated October 22; ordinary day-trail open observations are still dated October 12 and thus stale.
6. Prior verified partial OpenStreetMap geometry: https://chrisizworski.com/pukaskwa-national-park/trail-centerlines.geojson . The 14 named segments across five trails do NOT reach all signed starts, mapped junctions or complete returns. ODbL rights: https://www.openstreetmap.org/copyright . Seven public Parks Canada GIS places include day-use parking but are not trailhead GPS coordinates.

## Alternative concepts and decision
A. Trace missing parking-to-path connectors by aligning the colourful official illustrated map with OpenStreetMap. Rejected: the diagram is not georeferenced trailhead evidence, and joining paths would imply reliable navigation and access where neither is established.
B. Connect the documented official Visitor Centre origin, named path and any ordered intermediate places to the user's selected hike, while keeping GIS points separate and failing closed. Implemented. No fabricated GPS coordinates, hiking connectors, complete route, GPX, permit or opening claims.

## Interaction and state contract
The existing single selected trail ID drives the map highlight and a new starting-reference panel. Every one of eight entries has official Visitor Centre origin, location-specific destination, a source-backed interpretive description, ordered named steps and original official URLs. On Boardwalk Beach selection the panel identifies Horseshoe Bay; on Southern Headland it identifies the headland viewpoints; on the Combination Hike it shows the exact seven ordered official landmarks. Reversing selection reverses the advice. The White River documented closure always overrides the itinerary.

The panel explicitly says that verified signed entry and junction coordinates do not exist. An unverified community map segment never becomes a route from the parking lot. Without script it shows initial Southern Headland interpretation, starting place, original source URLs. Without tiles the existing official illustrated map remains available. Mobile, keyboard and failure states use existing original Pukaskwa browser checks. No change to source-feed cadence, ad policy, author/canonical or existing tool registry.

## Verification / release stage
New Node tests cover all eight official starts, Combination route order, bridge closure and missing coordinates. Existing Chromium map QA extended for changing selection and no-JavaScript official origin. No certified trailhead points were added; no engagement, search or ads outcomes measured. Record actual final CI run, PR and merge SHA separately.

**Single next source gate:** independently verify public, licence-compatible coordinate evidence for signed starts and actual connections from Visitor Centre to named hiking ways before expanding map geometry. If it does not exist, maintain partial-map disclosure.
