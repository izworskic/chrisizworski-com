## Western road access network: County Road 519 reconciliation — 2026-10-28

**Build PR #1272. Public visit decision:** The Michigan DNR describes western access to Presque Isle via **County Road 519** even during the closure of M-107 and the *eastern* portion of South Boundary Road between Headquarters Road and the Pinkerton Trailhead. The DNR does not assert that every western spur or lot is presently open, plowed or safely drivable. [Official park guidance](https://www.michigan.gov/recsearch/parks/porkies).

**Independent GIS road identity:** Michigan Geographic Framework All Roads MapServer layer 20 identifies the western approach's mapped road-centerline chain as `Presque Isle Rd`, principal route ID **1475809**, normal functional class **5**. It does not print `CR519` in the `RDNAME` attribute. The crosswalk relies on spatial alignment with the separately DNR-named County Road 519 western approach, not name equality. [Original MGF map service](https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20).

**Verified graph evidence:** **17** distinct MGF named line features form one endpoint-contiguous corridor at a **5 m** tolerance, with two terminal nodes and **13.316 source-geometry miles** (not a drive distance from Wakefield and not a time). The north end geometrically joins an official mapped **S Boundary Rd** segment with **0 m** apparent GIS offset at the centerline intersection. Another **15** named S Boundary line records extend **west of Pinkerton**. Their identity is confirmed by feature ID, not hand-drawn location. These are mapped **centerlines**, not a legal turn-by-turn path, current permitted vehicle section, plowing confirmation or signed final parking entrance.

**Why this matters:** The earlier GIS viewer colored **all 59 S Boundary Rd features** red as seasonally closed in winter. That incorrectly conflates the DNR's specifically named vehicle-closure area with the western section needed to access the Presque Isle river district. The interactive road atlas now shows the 15 reviewed western source segments in a **distinct green source-evidence style** while continuing to mark the eastern closure segments red. Green means **distinct approach in DNR guidance; not verified open today**.

**Surface hazard:** A [State of Michigan August 2026 announcement](https://www.michiganbusiness.org/press-releases/2026/08/state-of-michigan-celebrates-380-new-jobs-infrastructure-improvements-coming-to-western-upper-peninsula/) rates nearly the entire road-rehabilitation segment on CR519 as **2/10 (poor)**. This is a published condition assessment and planned rehabilitation, **not a live lane closure**. The public field note includes the age and distinction. The 13.316 GIS miles here must not be equated to a proposed transportation construction scope with different project limits.

**Files and gates:** `data/porkies-west-road-ledger.json`, `scripts/research-porkies-west-road.mjs`, source-refresh `.github/workflows/porkies-west-road-audit.yml`, public provenance `public/porcupine-mountains/west-access-evidence.json`, and 32-feature `public/porcupine-mountains/west-road-reference.geojson`. Only these source-matched lines can appear in the opt-in west map overlay. `tests/porkies-west-road.test.mjs` and browser QA guard against portraying this as a certified drive.

**Still not resolved:** Complete vehicle origin-to-lot route, legal turns from Wakefield, bridge/load condition on the county route, live plowing, the county's temporary restriction notices, the unverified final public parking spur, current river-crossing passability, or reliable journey/hike time. The public `routesAllowed` and `ETAallowed` flags remain **false**. Neither the old bridge-crossing registry nor trail topological disconnected fragments is auto-certified by this improvement. Full validated travel ETA requires those missing records or route providers constrained to confirmed seasonally permissible roads.

---

## Critical crossing and bridge review — 2026-10-28

**Verification result: no named wilderness pedestrian crossing can currently be certified passable from public official data.** That is not a claim that every bridge is absent or closed. The core unresolved problem is inadequate current bridge-condition and individually matched crossing evidence, not a missing route animation.

The independent asset inventory `DNRReferenceAssetsOPENDATA/FeatureServer/0`, spatially filtered to WGS84 envelope `-90.06,46.61,-89.55,46.90`, yielded **one bridge asset**, ID 163: `Snowmobile UP1`, **Vehicular**, **County-owned**, **DNR-administered**, `CONDITION=null`. This is not a verified pedestrian bridge at a Big Carp, Little Carp, Government Peak or Presque Isle route. **The absence of footbridge records in that one asset layer is not evidence that footbridges do not physically exist or are unsafe.** It is a dataset coverage limitation.

The latest DNR general closures list was checked October 28, 2026 and no corresponding named Porkies bridge restriction was found. The DNR warns intermittent closures may not all be posted. **Absence of a listed closure is not evidence of an open or inspected bridge.**

### Nine distinguishable crossing and bridge structures

Crosswalk file: `data/porkies-bridge-crossing-structures.json`. The summary is regenerated by `scripts/research-porkies-crossings.mjs` into `public/porcupine-mountains/crossing-evidence.json`. All have `authorizedAsRoutingEdge=false`, no public candidate coordinates, and no current physical-opening evidence.

| Feature | Independent evidence | Current condition | Decision |
|---|---|---|---|
| Beaver Creek / upper Little Carp | DNR trail description + DNR trail 6244 / EGLE river 27276 geometric intersection | No bridge/ford status | Block through-route |
| Government Peak / upper Carp | DNR narrative + trail 5055 / EGLE 30025 centerline; EGLE labels Carp River **Inlet** | Waterway name/crossing/bridge not fully matched | Block |
| Pinkerton Creek | DNR trail description waypoint + DNR 7033 / EGLE 30056 | DNR does NOT expressly identify a ford | Block crossing assumption |
| Presque Isle East River | DNR river-bank path + DNR 7080 / EGLE 28114 line intersection | May just follow riverbank | Do not infer a crossing |
| Presque Isle West River | DNR bank path + DNR 5330 / EGLE 28114 **near-line**, 7.3 m | Not a bridge confirmation | Do not infer a loop |
| Presque Isle suspension bridge | 2025 DNR park map suspension bridge infrastructure + Explore Western U.P. waterfall visitor brochure archived in 2026 | Neither is a current safety inspection | Block guaranteed loop |
| Big Carp River mouth / Lake Superior Trail bridge | Official DNR *July 2016* washout bulletin | No current repair/opening evidence identified | Block automatic path |
| Big Carp Trail upstream river crossing | A separate firsthand 2026 hiking account describes an unbridged crossing upstream | Third-party observation, not DNR condition monitoring | No ford/log route advice |
| Little Carp / Overlooked Falls bridge | Western U.P. waterfall visitor brochure describes bridge near Overlooked Falls | No current operating/structural confirmation | Do not conflate with Beaver Creek |

**Important:** A tourism brochure or 2026 personal hiking account can corroborate a structure or route identity, but does not establish park management approval, a safe log crossing, or conditions for a future visit. No recommendation sends users to a log or ford. A currently safe bridge would require **the particular bridge identity + location + current manager inspection/clearance**, none of which was publicly verifiable for the nine sites. A 2025 park map icon alone cannot satisfy those requirements.

### Source index

- 2025 DNR GPS park map: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf
- DNR trail descriptions (older map editions may differ): https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf
- DNR bridge asset map layer: https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/0
- DNR closures (not necessarily exhaustive): https://www.michigan.gov/dnr/about/newsroom/closures
- 2016 DNR bridge washout report: https://content.govdelivery.com/accounts/MIDNR/bulletins/158f0d0
- Western U.P. tourism waterfall brochure (2026 web archive, artwork originally labeled 2022): https://explorewesternup.com/wp-content/uploads/2026/04/WaterfallMapBro_2022_Drft6-opt.pdf
- 2026 individual hiking account: https://thelupines.com/big-carp-river-trail/

**Actionable safe planning alternative:** source-described short view walks, **not** long river-dependent through-hikes: Lake of the Clouds ~100-yard paved/boardwalk overlook, Summit Peak ~0.5-mile approach plus tower stairs, and DNR-documented Nawadaha observation platform. These are *descriptions*, not live trail-open guarantees. For winter/spring, existing road-closure gates still apply.

**Next actual gating evidence needed:** individually identify the 2025 official map's unbridged-crossing pictograms by source trail/river ID, and obtain current park-management/bridge-maintenance inspection or sign/closure confirmation for each candidate. Without those records, publishing precise routes or ETAs would not be defensible. No user should be directed to wade based solely on water-level models, old maps or third-party advice.

## Junction and stream-crossing verification phase — 2026-10-28

Official Michigan DNR written trail descriptions identify **23** named trail/junction/terminal/river relationship records. DNR says Beaver Creek Trail *crosses* the Little Carp River, and Government Peak Trail crosses the upper Carp River. The DNR also describes lengths and links among Big Carp River Trail, Little Carp River Trail, Lake Superior Trail, North Mirror Lake and the separate Presque Isle East/West River trails. Source: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf. The authoritative DNR GPS map dated July 14, 2025 **shows unbridged crossing symbols**, but the map has no machine-readable individual crossing point coordinates; copying a nearby river line intersection onto a map as a safe crossing would misrepresent the source.

The new reproducible `scripts/research-porkies-crossings.mjs` imports the full **819 DNR hiking line records** and **1,190 Michigan EGLE Streams and Rivers centerlines** (MiEnviroBasemap MapServer 1) from the bounded research area. It finds exact line intersections separately from within-12-meter near-line candidates, deduplicates shared source instances, and keeps all guessed GPS candidate points in a **private Actions research artifact**, not public directions. First successful source run https://github.com/izworskic/chrisizworski-com/actions/runs/40705922691:

- **174** geometric trail/stream candidate encounters: **86** exact centerline intersections, **88** near-line candidates within 12 meters.
- **80** candidates have a named hydrology feature; **46** fall in the priority named-trail/river review class.
- Named river candidate counts include Little Carp River (15), Carp River (11), Presque Isle River (8), Carp River Inlet (9), Pinkerton Creek (3) and Speaker Creek (3). These numbers count *GIS source-feature intersections* and nearby offsets, not unique signed fords, trail bridges or accessible crossings.
- DNR-described **Beaver Creek / Little Carp River** crossing has a corresponding exact DNR trail/EGLE named river line intersection. This upgrades *location-candidate corroboration*, not bridge status or river-crossing safety.
- Government Peak's probable upper-Carp candidate is labeled **Carp River Inlet** in EGLE; that waterway attribution must be verified against DNR map labels before accepting an official crossing coordinate.
- East/West Presque Isle riverfront trail candidates are not evidence of a loop or bridge; geom overlaps can be riverbank digitization.
- A DNR historical 2016 notice documented a Big Carp River trail bridge washout. It provides **no evidence of a current closure or repair**, and no alternative ford recommendation: https://content.govdelivery.com/accounts/MIDNR/bulletins/158f0d0.

Code: `lib/porkies/crossing-candidates.mjs`, `data/porkies-junction-crossing-ledger.json` (23 source-described records with null GPS and `routeEligible:false`), `public/porcupine-mountains/crossing-evidence.json` (safe public aggregate), `.github/workflows/porkies-crossings-audit.yml` (private candidate artifact with full source IDs), `tests/porkies-crossings.test.mjs`. User-facing source documentation is in the `#crossings` field-guide section.

**No bridge/ford/route is certified by this analysis.** A future route permit must bind *individually named* trail+river/crossing site to an approved signed park-map coordinate and independent current bridge/access status. If no authoritative source confirms status, the routing engine must continue to exclude this crossing. Historical and forecast data are not substitutes.

# Porcupine Mountains — Official trail and road routing evidence

**Date:** 2026-10-28. **Status:** Geographic-source reconciliation and visual evidence overlays implemented. **Do not label this a verified, navigable trail router or a drive-time estimator.** PR #1254 remains draft and /porcupine-mountains/ remains noindex until a release decision.

## Differentiated visitor objective

A Circle Tour visitor chooses time, season, entrance/approach direction and mobility. The guide should identify *which designated parking site and park district* is defensible, then show the **actual mapped trail or road source** that explains the decision, with a transparent 'unverified' state for bridges, ford crossings, road openings, named-trail extent and route times.

## Validated official data

- Michigan DNR hiking FeatureServer layer 2: `https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/2`. Facility-filtered extract **819 features** (822 line parts), **22 trail-name categories**, around **78.0 miles** of linework. This is neither the total official park hiking mileage nor an end-to-end path distance.
- Michigan Geographic Framework (MGF) **All Roads** MapServer layer 20: `https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20`. Within a park-and-road corridor bbox `-90.04,46.69,-89.57,46.86`, **296** line features. Of these, **22 mapped M-107 segments**, **59 S Boundary Rd**, **23 east approach-related**, **192 remaining other/unknown**. The public reference overlay draws the 104 individually classified park-road records. The original geometric roads dataset **does not encode live road operations, reliable vehicle legality, or timed closures**.
- DNR skiing FeatureServer layer 5: `https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/5`. Facility-filtered extract **40 features across 12 ski-trail names**. This separate line network covers ski-related names including Deer Yard, Triple, Whitetail Path, Union River, Double and Vista; it is an administrative trail inventory, **not** today's grooming, open-run, snow depth or plowing report. Public `ski-reference.geojson` remains a source-only overlay with `routingCertified:false`.
- Official DNR GPS park map, **2025-07-14**: `https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf`. Legend and cartography identify named parking/trailhead symbols, waterfalls, ridge trails and **unbridged river crossings**. These symbols cannot yet be machine-crosswalked to certified hazard coordinates.
- DNR current park operations: `https://www.michigan.gov/recsearch/parks/porkies` — M-107 and South Boundary winter vehicle closures, separate County Road 519 western Presque Isle entrance and east-side ski-area approach. A mapped road does **not** imply current gate status. The road centerline is only a reference trace.

## Actual topology reconstruction

The pipeline `scripts/research-porkies-routing.mjs` imports *every* source line in deterministic paginated batches; validates unique source IDs/geometry; compares line endpoints with real spatial-hash, metric-distance snapping at **3 m, 5 m, 10 m and 15 m**, and reports connected graph components. It never creates a vertex where two unrelated lines merely cross mid-segment. It separately analyzes hiking and road graphs. Shapefiles or imagery are not needed for this reproducible feature set.

**DNR hiking components**: 8 at 3 m, **7 at 5 m**, 6 at 10 m, 3 at 15 m. The change with tolerance is a reason to require reviewed trail intersections before using the graph for hiking directions. The 5-meter graph has 40 degree-one endpoint nodes; some are authentic termini, others may be unresolved gaps.

**Reference mileage discrepancies** (derived metric geometry, not route distance):

| Trail-name group | DNR linework | Published DNR map | Coverage ratio | Status |
|---|---:|---:|---:|---|
| Escarpment | 0.429 mi | 3.7 mi | 0.116 | DO NOT ROUTE |
| Government Peak | 4.024 mi | 6.4 mi | 0.629 | DO NOT ROUTE |
| Lake Superior | 9.611 mi | 15.6 mi | 0.616 | DO NOT ROUTE |
| North Mirror Lake | 3.860 mi | 3.5 mi | 1.103 | DO NOT ROUTE; alternate definitions or overlaps suspected |

Do not make unsupported corrections by simply assuming the missing portions are North Country Trail lines. Overlap requires inspecting geometry and independent trail-map labels.

**Parking-to-source offsets** (distance to **nearest DNR mapped hiking line**, *not* a walk, mapped parking entrance or verified trailhead route):
- Lake of the Clouds: **20.2 m** to a Big Carp River Trail line. Cannot infer this is the accessible overlook boardwalk.
- Summit Peak: **4.9 m** to Beaver Creek Trail, **not** certification of the tower approach.
- Presque Isle: **85.7 m** to the 'Trail to Falls' line; Nawadaha/Manido/Manabezho trails each require separate access verification.
- Pinkerton: **0.1 m** to Pinkerton Trail line; the full named trail is not a complete, verified route because of topology splits.
- Visitor Center Nature Trail: nearest feature **~1,993 m** (Union Spring Trail). **The named Visitor Center Nature Trail is absent from this hiking GIS layer**, although a different DNR Recreation Search record locates it.
- Ski-area trail network: nearest hiking feature **~2,214 m** (Union Spring). **The separate DNR skiing/snowshoe/multi-use layers must be examined** before any winter trail routing.

**Road-centerline offsets**: Lake 7.3m, Summit 3.1m, Presque 4.5m, Pinkerton 7.7m, visitor center 13m, ski area 72.7m. These show proximity to *some* road centerline, not a legal entrance/turn or complete drive.

## Delivered technical assets

- `lib/porkies/route-topology.mjs`: source-line parser, endpoint-only graph, spatial snapping and checks, nearest-line geometry distance, road corridor classification, seasonal-policy blocks.
- `scripts/research-porkies-routing.mjs`: reproducible ArcGIS import and geometry/safety audit, outputs private audit artifact and **explicitly non-routable** public reference GeoJSON layers when --emit-public-research is supplied.
- `.github/workflows/porkies-route-evidence.yml`: unit-tests the graph, runs both official source imports, preserves full audit artifact and commits vetted **geometry-reference-only** datasets on the feature branch.
- `public/porcupine-mountains/routing-evidence.json`: auditable summary, counts, source refs, parking offsets, named-trail discrepancies, `noPublicRouteTimes: true` and `noCrossingSafetyCertification: true`.
- `public/porcupine-mountains/trail-reference.geojson`: 819 simplified official feature lines, each with `routingCertified:false`, never a user itinerary.
- `public/porcupine-mountains/park-road-reference.geojson`: 104 selected classified park-road traces, including seasonal closure risk; no route optimization.
- `public/porcupine-mountains/ski-reference.geojson`: 40 DNR ski geometry features, distinct from hiking and from official live grooming reports.
- `public/assets/porkies-route-evidence.js`: opt-in hiking, ski and road map layers with source records, trail-vs-road semantics and season-aware dashed road warning styles. The underlying six verified parking cards retain independent Google Maps controls; no auto-generated GIS route is sent to Google.
- `tests/porkies-route-topology.test.mjs`, `tests/porkies-route-evidence.test.mjs` and expanded Chromium browser tests, including no false path at mid-line crossings, unit snap thresholds, no claimed ETA, map toggle, marker coverage and no-JS fallback.
- Existing fall color and three waterfall canonicals, ad behavior and Circle Tour site architecture remain preserved. Page stays noindex and PR stays draft.

## Remaining release-blocking work for true end-to-end routing

1. **Named terminal and junction source IDs**: map the Lake of the Clouds escarpment/overlook split, Summit Tower approach, each Presque Isle walkway, NCT shared stretches, and genuinely incomplete/duplicate trail links against park trail signage and 2025 DNR map. Geometry adjacency alone is insufficient.
2. **Water crossing and bridge inventory**: individually geolocate the DNR map's unbridged crossings; label bridged/unbridged/unknown with official citations. Exclude any unresolved crossing from route optimization (especially Little Carp and other wilderness river fords). Do not translate rainfall or river flow into a safe crossing claim.
3. **Road graph and turn validation**: independently verify legally drivable entrance/exit, surface, parking turnoffs, through-park seasonal barricades and accessibility. The MGF layer is a centerline base map, not a live routing service. Winter route guidance must never cross M-107/South Boundary restricted areas to reach Presque Isle or the ski hill.
4. **Elevation and travel time**: 3DEP elevation profiles only for a *reviewed complete trail line*; grade, terrain, river crossing, one-way shuttle, return path and real travel speed must inform a range. Drive estimates need a checked legal road route and travel-time source, not a GIS line-length divided by arbitrary speed.
5. **Real-world user testing**: test a west-origin 2-hour waterfalls outing, east-origin low-mobility Lake of Clouds, one-way Escarpment shuttle, full-day mixed stop, and Dec/May closure reroutes on mobile; if uncertain, output an explicit unknown instead of a trip time.
6. After verified road/foot routing and browser/sitemap/SEO gates, approve switching from `noindex,follow` and decide publication in the Circle Tour tool network. Do not merge PR without the owner's release approval.

### The product moat
The real difference will be *verified feasible experiences* and *transparent reasons why something cannot be recommended*, not a colorful but fake automatic trail router. This phase supplies actual government geometry, a reproducible topology graph, evidence overlays and precise remaining verification gaps. It does not yet fulfill the final user-facing safe travel-time promise.
