# Issue #1258 — Carp River Falls: visitor-first managed overlook experience

**Reviewed November 1, 2026.** Public internet sources only. No owner outreach, photography reuse, invented legal corridor or GPS trail geometry.

## Visitor problem and decisive evidence

The original source queue held Marquette Carp River Falls #169 as a risky, unverified gorge-bottom scramble. Continued research found the NTN's completed **Carp River Falls Trail** and maintained waterfall viewpoint, a materially better route choice that removes the motivation to descend a hazardous gorge. The NTN director described the new trail connection in a public August 15, 2024 report. Travel Marquette separately identifies official NTN South Trailhead parking, a designated crossing on M-553, and the traditional nonmotorized Mount Marquette Road / Morgan Falls continuation to Carp River. Travel Marquette also publishes an authentic photograph of a visitor at a wooden waterfall viewpoint fence; it is **linked, never copied**.

Source links:
- [NTN South Trails](https://www.noquetrails.org/south-trails/)
- [Travel Marquette waterfall descriptions, parking and highway-crossing caution](https://www.travelmarquette.com/outdoor-adventure/waterfalls/)
- [NTN director's 2024 Carp River Falls Trail / Raging River completion announcement](https://www.uppermichiganssource.com/2024/08/15/ntn-hosts-business-after-hours-cuts-ribbon-updated-pavilion/)
- [Travel Marquette authentic overlook photograph](https://www.travelmarquette.com/listing/carp-river-ntn-south-trails/514/)
- [Travel Marquette 2025 waterfalls sheet, older continuation to Carp](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/marquettemi/waterfalls10_2025sheetA_eb3543b3-af0c-44a9-9a3b-140f872272db.pdf)
- [MI state waterfall GIS layer](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7)
- [2026 source identity review](UP_WATERFALL_1258_BATCH_46_MARQUETTE_ACCESS.md)

## The three distinct geographic features

1. #169, **Carp River Falls near Marquette**. State GIS natural feature 46.503807,-87.44655 approximately 18 metres from Travel Marquette's waterfall point. The GIS field **MORGAN CREEK** is a waterway-label conflict; no GIS pin can substitute for a visitor parking waypoint.
2. #166, **Morgan Falls**, separate established Morgan Creek waterfall with public NTN South lot and designated highway crossing. Its existing indexable guide remains intact.
3. #163, **Upper Carp River Falls**, near Ishpeming. Its old approach near utility property has reported No Trespassing signs. It remains research-only, with no visitor route.

## Page, decision engine, and discovery

- `/upper-peninsula-waterfalls/carp-river-falls/`: independently themed river atlas with four visitor choices: managed Carp River overlook, Morgan Falls, rejected gorge-bottom attempt and rejected Ishpeming upper-falls misnavigation. Three seasonal considerations, accessible radio/selection, copy-plan action and server-rendered initial decision.
- Source-backed CARTO/Leaflet point map only for natural geographic falls. **No generated visitor route polylines, waterfall-to-parking driving URLs, guessed parking/crossing latitude-longitude or club/private road detours.**
- Destination included in 72 curated waterfall records and 70 indexable waterfall sitemap URLs. Crosslink from Morgan Falls and the primary waterfall explorer; page uses the existing ad script and author Person identity.
- Five verified **published access-source axes**: manager, visitor permission to maintained public trails, NTN South parking, visitor-walking context and distinct natural location. This does NOT claim an exact verified track to the 2024 overlook, ADA accessibility, current winter opening, safe scrambling or live flow.
- Preserve Batch 46 research page as `noindex,follow` documentary record and do not place it in sitemap.

## Inventory

Before: 71 curated, 65 exact GIS links, 96 pending (161 named features).
After: **72 curated, 66 exact GIS links, 95 pending**. Research overlay automatically excludes published GIS #169 from unverified candidate pins because `data-gis-oid=169` is on its card.

## Release gate

- `node scripts/build-up-waterfall-review-queue.mjs --check`
- `node --test tests/up-waterfalls-carp-river-experience.test.js` and all other waterfall tests
- Waterfall mobile/browser smoke, full repository validation and emitted HTML audit
- Name search-surface protection and Vercel preview verification
- Production verification after merge
- Current NTN signage and authoritative georeferenced trail alignment remain future evidence needed before introducing a trail path on the map


## November 1, 2026: NTN trail alignment, without an invented parking connection

A new source investigation found the individual **Carp River Falls Trail #766002** in Trailforks. **NTN's current South Trails page embeds Trailforks** as the network's own map viewer, and an NTN-affiliated map record describes this exact trail. The single trail segment is **3,363 feet (about 0.64 miles)**, intermediate/blue, opened in 2024, and connects **Carp Eh Diem Trail west end** to the **Raging River bridge**. Hiking is listed as an activity. The NTN director's 2024 statement independently confirms waterfall viewing along the route. This is a real mapped trail, not a generated line between arbitrary waterfall pins.

Evidence:
- [NTN current public South Trails map](https://www.noquetrails.org/south-trails/)
- [Carp River Falls Trail #766002 — exact mapped segment on Trailforks](https://www.trailforks.com/trails/carp-river-falls/)
- [Trailforks published single-trail widget API](https://www.trailforks.com/widgets/config/trail/)
- [NTN director's 2024 completion statement](https://www.uppermichiganssource.com/2024/08/15/ntn-hosts-business-after-hours-cuts-ribbon-updated-pavilion/)
- [Travel Marquette official public trailhead, designated crossing and historic route](https://www.travelmarquette.com/outdoor-adventure/waterfalls/)

**Decision:** Avoid copying Trailforks's proprietary GPS vertices into our own map without an appropriate license. Instead, include its **working single-trail map widget**, verified by direct browser scrape from the official `/widgets/trail/?trailid=766002...` endpoint. Load the iframe only upon the visitor's explicit click so visitors can use the mapped trail without being sent offsite or exposing every page view to a third-party map service. Keep a linked source fallback if the provider blocks embedding or is unavailable. The existing CARTO/Leaflet map retains the distinct falls locations.

**Do not overstate the geometry.** The 0.64 miles is only the published segment, **not** South Trailhead-to-viewpoint round-trip mileage. We have not independently verified the specific current trail connections from NTN South Trailhead, georeferenced M-553 crossing or exact railing/overlook coordinates. No extra parking points, no waterfall driving directions, no lines joining disconnected endpoints, no ADA claim, no live opening. `routePolylineAuthorized=false` and `destinationCoordinatesForDriving=false` remain unchanged.

The new page includes a visible **Waterfall locations / Mapped NTN trail** control with native map preservation and a consent-on-click trail geometry viewer. The visitor answer and hub card distinguish source segment distance from actual walking effort. Node regressions and Chromium/mobile smoke test this behavior.


## November 1, 2026: NTN named access graph and full network map

The missing visitor question was not simply where the **0.64-mile Carp River Falls Trail** lies, but *how the public South Trailhead connects to it*. Continued research establishes a source-backed **named sequence**, without establishing an exact continuous georeferenced walk:

1. **Park:** NTN's current South Trails page names **South Trailhead on County Road 553**; Travel Marquette directs waterfall visitors to that lot, rather than across the highway on the shoulder.
2. **Cross:** Travel Marquette instructs visitors to use a designated pedestrian crossing of **M-553**. Hiking Project independently describes **Carp Eh Diem** as beginning on the west side of the highway, opposite the main South Trails lot.
3. **Carp Eh Diem:** Trailforks' NTN-association trail record maps the named **3.0-mile full trail**, allowing hiking, and identifies its river setting. That is **not** an asserted required walk length to the falls junction.
4. **Carp River Falls Trail:** Trailforks #766002 directly describes its link from the **west end of Carp Eh Diem** toward the **Raging River bridge**, a **3,363-foot (approx. 0.64-mile)** segment. The NTN executive director's August 2024 account corroborates the named connection and waterfall viewing.
5. **Overlook:** Travel Marquette shows the fenced waterfall lookout and NTN reports waterfall views on the trail, but neither source in our audit provides a surveyed railing waypoint tied to a fully verified parking-to-rail route.

Authoritative link origins:
- NTN full regional map: https://www.noquetrails.org/south-trails/ (embeds Trailforks region **11149**)
- Hiking Project Carp Eh Diem west-of-highway access: https://www.hikingproject.com/trail/7037827/carp-eh-diem
- Trailforks Carp Eh Diem full named trail: https://www.trailforks.com/trails/carp-eh-diem/
- Trailforks Carp River Falls segment: https://www.trailforks.com/trails/carp-river-falls/
- Travel Marquette safety/arrival: https://www.travelmarquette.com/outdoor-adventure/waterfalls/
- Trail completion announcement with named connection: https://www.uppermichiganssource.com/2024/08/15/ntn-hosts-business-after-hours-cuts-ribbon-updated-pavilion/
- Travel Marquette real fenced viewpoint photo: https://www.travelmarquette.com/listing/carp-river-ntn-south-trails/514/

**Implementation:** Five source-attributed disclosure stages appear on the Carp River visitor page with an explicit "distance still an open question" outcome. A third map tab embeds the actual **NTN-used Trailforks full-region network map**, solely after an explicit visitor "Load NTN network map" action, in addition to the existing CARTO natural-features map and the individual Trailforks mapped falls segment. Third-party geographical data is not scraped or rehosted; the network-map source is preserved.

**Nonnegotiable missing evidence:** Exact signed crossing latitude-longitude, continuous verified trailhead-to-viewpoint route, complete one-way/round-trip distance and elevation, precise railing coordinates, and live current access. The 3-mile Carp Eh Diem number and 0.64-mile waterfall segment **must never be summed** into a supposedly verified trip. No navigation to a GIS waterfall pin; no new local Leaflet polyline. Nearby 18-mile MTB loops are contextual trail evidence, **not** substitutes for a dedicated waterfall walking itinerary.

The regression suite asserts source identities, measured segment boundaries, no preload of either third-party viewer, network map's correct region identity, and browser accessibility/mobile layout. No unrelated site or sitemap changes are required.
