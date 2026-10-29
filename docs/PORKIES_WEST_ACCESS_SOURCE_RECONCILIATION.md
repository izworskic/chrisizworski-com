# County Road 519 / Presque Isle western approach — evidence and release gate

**Review date:** October 28, 2026. **Status:** Source-corroborated geometry, **not** a current drivable route or timed navigation product.

## Independent identity verification

- Michigan DNR's [Porcupine Mountains park page](https://www.michigan.gov/recsearch/parks/porkies) explicitly distinguishes the **County Road 519 approach to Presque Isle**, remaining available in winter, from the park roads that close seasonally (South Boundary Road / M-107).
- The DNR's [winter 2026 public program flyer](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/Explorer/Porkies-VC-programs.pdf) says Presque Isle visitors should take **County Road 519 north from US-28 east of Wakefield**. It places a winter snowshoe program meeting near the junction of CR519 and South Boundary Road.
- The publicly available [Wakefield Township Master Plan](https://wakefieldtownship.com/wp-content/documents/Wakefield%20Township%20Master%20Plan.pdf), roads section, explicitly lists **Thomaston Road / County Road 519 / Presque Isle Road** as a single National Functional Classification 5 major collector.
- A Michigan DNR legal-boundary description, [Chapter XII wildlife descriptions](https://www.midnr.com/Publications/pdfs/huntingwildlifehabitat/DNR-WLD_requested_geospatial_data/DNR-WLD_deer_mus_as_is_compilation_set/DNR_WCO_ChapterXII_128650_7_ASOF_2023-12-08rev.pdf), separately names County Road 519 **also known as Presque Isle Road**, from M-28 north to South Boundary Road.
- Michigan Geographic Framework [All Roads layer 20](https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20), source geometric property **PR=1475809**, returns 27 line records within the review corridor: **17 'Presque Isle Rd'** and **10 'Thomaston Rd'**. The original data has no `RDNAME=County Road 519` values here. The alias crosswalk is therefore independently corroborated, not an invented road label.

## Reconstructed line topology

The [reproducible audit](../scripts/research-porkies-west-access.mjs) obtains the live 27-source MGF geometries, compares endpoint-to-endpoint connectivity at 3, 5, and 10 meters, and preserves exact MGF object IDs in the public evidence ledger. At every tolerance, the 27 road records are **one connected component** with **two terminal nodes**, totaling approximately **15.6 miles of geometric centerline length**. This is **not** a verified length of a visitor drive from US-28 to the park lot and not an estimated travel time.

A separate source query finds **three** South Boundary Rd records and **nine** park 'Access' road segments near the scenic-area junction. The west approach reference line's nearest proximity to the separately cross-verified **Presque Isle parking asset #841** is approximately **1,316 meters straight line**. A park access centerline is ~132 meters away, but **no exact signed road-to-lot turn and parking entrance has been independently verified**. Therefore the map deliberately does **not** join the purple CR519 trace to the lot, draw a completed drive or compute an ETA. No location beyond the official parking asset is published as a new visitor waypoint.

## Visitor messaging

Western Wisconsin / US-28 visitor: use the DNR-recommended **CR519 north** approach for Presque Isle; current conditions and lot status require confirmation. East-side / Ontonagon winter visitor: do not mistake the west-side park for a shortcut through closed South Boundary Road. Eastern winter ski complex uses its distinct **M-64 approach**, per [Ski the Porkies DNR](https://www.michigan.gov/skitheporkies). November and May transitions remain uncertain; a calendar label does not establish a current open gate.

Road centerlines are **geospatial reference evidence only**. They do not provide plowing, barricade/closure state, speed, legal turning restriction, live route choices, parking occupancy or private-road restrictions. No winter road status is made from GIS proximity or third-party map routing.

## Files and tests

- `scripts/research-porkies-west-access.mjs`: audited MGF source importer (27 corridor records, three South Boundary, nine scenic-area access; fails closed on geometry/name/count changes).
- `.github/workflows/porkies-west-access.yml`: official-source GitHub Action and concurrency-safe source geometry publication on this feature branch only.
- `public/porcupine-mountains/west-approach-evidence.json`: source ledger and exact no-routing flags.
- `public/porcupine-mountains/west-approach-reference.geojson`: 27 MGF cartographic lines marked `notRoute:true`.
- `public/porcupine-mountains/index.html`: source names, DNR winter instructions and explicit final-lot connectivity gap visible without JavaScript.
- `public/assets/porkies-route-evidence.js`: optional independent western map overlay with source identity validation, no GPS driving route.
- `tests/porkies-west-access.test.mjs` and updated `scripts/verify-porkies-browser.cjs`: lineage, graph, safety, real map rendering, mobile and no-JS gates.

## Unresolved prerequisites for actual turn-by-turn directions

1. Verify each public-road connection between US-28 and the park scenic entrance including signed County Road 519 identity, final park access segment and exact legal public turn into the DNR parking point.
2. Obtain actual operational gate/road plowing/closure evidence for the travel date. An unlisted closure is **not** clearance.
3. Continue the independent nine-site bridge/crossing register; **zero river ford or footbridge sites are currently certified passable**, even where old DNR documents show a structure.
4. Only after all driving/walking segments are source-approved can the application show a combined route and measured end-to-end travel duration. Until then, preserve map references and cautious park-district guidance.

**Release rule:** Do not promote a named centerline into official road-open status. Do not alter ads or unrelated site pages. Keep the new Porcupine Mountains page `noindex,follow` until the site owner approves broader indexing and the public route representation is defensible.
