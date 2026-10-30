# Sleeping Giant: official Ontario GIS trail topology, junction candidates and access truth

**Review date:** 2026-10-28, Ontario local.
**Research status:** Source geometry obtained, conflict audit implemented, route graph **NOT certified**.
**Deployment status:** Draft PR only; no new public map, trail router, parking coordinates or Google Maps navigation enabled.

## Reproducible government datasets

- Primary government trail segments: [Land Information Ontario, LIO_Open04 MapServer layer 19](https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/19).
- Government OTN access points: [LIO_Open04 MapServer layer 20](https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/20).
- [Ontario Data Catalogue OTN terms and coverage](https://data.ontario.ca/en/dataset/ontario-trail-network), [Open Government Licence Ontario](https://www.ontario.ca/page/open-government-licence-ontario).
- Controlling permitted-activity narrative: [Ontario Parks current activity listing](https://www.ontarioparks.ca/park/sleepinggiant/activities) and [Ontario Parks September 2024 bike-and-hike explanation](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/).
- Cross-reference topographic map: [official 1:50,000 park trail map](https://www.ontarioparks.ca/pdf/maps/sleepinggiant/trails_map.pdf). **Historical map**; not a certificate of current road access or trail conditions.
- Park administrative cycling restrictions also reiterated in the [provincial park management plan](https://www.ontario.ca/page/sleeping-giant-provincial-park-management-plan).

### Query and source provenance

Government service uses geographic coordinates (NAD83/WGS84-equivalent approximation for these research purposes) and ArcGIS REST. Study area envelope is `[-89.1, 48.2, -88.4, 48.65]`. Layer 19 query `TRAIL_ASSOCIATION = 'Sleeping Giant Provincial Park'` plus envelope returns **30 individually named park-managed trail features**. An unrestricted query in the same box returned 32, including a Trans Canada Water Trail and Trans Canada Trail which are not treated as park trail routes. Layer 20 returns **13 OTN access-point features** in the box.

The complete research response and source query URLs are embedded under `metadata` in:
- `data/sleeping-giant/otn-trail-geometry-research.geojson` (30 government features with permanent OBJECTID/OGF_ID, name, OTN use, reference length and approximate polyline).
- `data/sleeping-giant/otn-access-points-research.geojson` (13 unlabeled OTN point features with original IDs, approximate coordinates).

For manageable source capture, geometry requested from ArcGIS with `maxAllowableOffset=0.00006` degrees (roughly several metres) and `geometryPrecision=6`. **This is simplified research geometry and is NOT suitable for precise turn-by-turn GPS, terrain-grade route distance, bridge verification, certified junction coordinates or trail navigability**. Raw original geometry has not yet been retained. Service record fields show several effective timestamps in 2025 even though the Ontario Data Catalogue's packaged asset is older; dates must be recorded separately rather than asserting every vertex was surveyed in 2025. Do not treat either as a current condition report.

## Actual GIS relationship findings

The candidate audit compares line endpoints to other OTN lines with a maximum 20-metre *research proximity threshold*. A match is **not a verified traversable junction**, since two close or crossing segments may have different grades, field conditions or access restrictions.

| Candidate from official route narratives | OTN reference relationship | Source corroboration | Route eligibility |
| --- | --- | --- | --- |
| Kabeyun ↔ Sawyer Bay | Endpoints/proximate mapped lines | Official bike guide, park map | **Blocked**: parking and named junction not certified |
| Kabeyun ↔ Talus Lake | Proximate mapped lines | Official list names bicycle cutoff at Talus | **Blocked**: legal cutoff geometry not precisely certified |
| Sawyer Bay ↔ Talus Lake | Proximate mapped lines | Ontario Parks activity: Talus connects both | **Blocked** |
| Talus ↔ Top of the Giant | Proximate mapped lines | Official bike-and-hike rules | **Blocked** |
| Kabeyun ↔ Head | Proximate mapped lines | Park guide: walking-only Kabeyun connector | **Blocked** |
| Talus ↔ Nanabosho | Proximate mapped lines | Park guide: walking-only Talus approach | **Blocked** |
| Kabeyun ↔ Sea Lion | Proximate mapped lines | Ontario Parks activity description | **Blocked** |
| Sawyer Bay ↔ Sawbill | Proximate mapped lines | Ontario Parks activity description | **Blocked** |
| Kabeyun ↔ Tee Harbour | Proximate mapped lines | Ontario Parks activity description | **Blocked** |

The audit computes actual proximity from the source geometry. It deliberately does not elevate spatial nearness to a verified walking junction. A source-backed connected description still does not establish the precise route, legal mode at each meter, or today's physical passability.

### Three important source conflicts

1. **Kabeyun Trail GIS cycling flag is overbroad.** OTN labels the entire 40 km Kabeyun record with a `Cycling` use value; Ontario Parks limits cycling to **South Kabeyun, ending at the Talus Lake Trail junction**. A route planner that blindly trusts the GIS flag would be unsafe and contrary to park rules.
2. **Sawbill cycling permission is missing from OTN use field.** Ontario Parks permits cycling on Sawbill Lake Trail; the government GIS line's `PERMITTED_USES` omits it. This is a source classification mismatch, not grounds to invent a new cycling connection.
3. **Reference lengths conflict.** OTN records Kabeyun as `40 km` versus Ontario Parks' `37 km`; Nanabosho Lookout as `0.7 km` versus Ontario Parks' `0.8 km`; Sibley Creek as `1.7 km` versus Ontario Parks' `2.3 km`. These may reflect vintage/definition/geometry differences. None may be substituted for officially documented parking-to-destination round-trip distances.

Other OTN lines, particularly ski and long-distance networks, should not be treated as authorized summer visitor trails solely because a GIS path exists.

## Parking and access limitations

Thirteen OTN **access-point features** are present, but their schema contains OGF/OBJECT IDs and location accuracy, not a park-managed *parking-area name*, space inventory, vehicular road approach, permit check or current plowing status. The source extract does not certify **South Kabeyun**, the bike rack at Talus, Marie Louise Lake Drive junction, or individual summit turnoffs as exact navigable waypoints. They remain `parkingVerified:false`, `routeEligible:false` in the audit.

Ontario Parks names the South Kabeyun trailhead as the primary starting point and places it about a five-minute drive beyond Marie Louise Lake Campground on Highway 587. That qualitative direction does not establish a parking GPS or open road. The mapped park **gatehouse** (48.360165, -88.798065) is a separate government-located facility and must not silently stand in for the South Kabeyun trailhead.

## Implemented graph audit contract

`lib/sleeping-giant/topology-audit.cjs`:
- Validates feature geometry, source identifiers and government data classes.
- Reconstructs candidate endpoint/line proximity for **nine** officially described trail relationships.
- Compares OTN permitted uses with an explicit Ontario Parks-authoritative policy overlay, including partial Kabeyun permissions.
- Preserves three significant source mileage disagreements and all 13 OTN access records without describing them as parking.
- Emits a JSON research report via `node lib/sleeping-giant/topology-audit.cjs`, also uploaded by the dedicated CI workflow as a short-lived artifact.
- Every edge has `candidateOnly`, `manuallyCertified:false`, `routeEligible:false`. **There is no shortest-path navigation API** and no current conditions proxy.
- `tests/sleeping-giant-topology.test.js` protects the source counts, all candidate relationships, zero certified parking/junctions, denied cycling on summit/overbroad Kabeyun, Sawbill permission conflict and source ID/geometry corruption.

The previously implemented route-decision planner remains independent and uses the officially published **full round-trip** distances, without generating geospatial line directions.

## One next investment

**Certify the five real access/junction anchors from park-authored current sources:** South Kabeyun signed public parking, Sawyer Bay/Kabeyun split, Talus/Kabeyun bike rack and boundary, Top-of-Giant walking turnoff, Head and Nanabosho walk-only turnoffs. Compare full-resolution source geometry, named official park map annotations and permitted-use sections, with a dated proof entry for each. If a precise GPS/parking point or access route cannot be independently confirmed, keep navigation withheld. Only after that should validated graph edges be eligible for the HTML/JavaScript route-map UI or NRCan elevation profile.
