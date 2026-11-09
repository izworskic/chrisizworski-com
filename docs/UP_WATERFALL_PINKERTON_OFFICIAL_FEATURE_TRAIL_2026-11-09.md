# Pinkerton Creek: the federal named-falls to Michigan DNR trail crosswalk

**Scientific review date:** November 9, 2026  
**Owning repo:** `izworskic/chrisizworski-com`  
**Production research surface:** [U.P. Waterfall Evidence Atlas](https://chrisizworski.com/upper-peninsula-waterfalls/atlas/) (`noindex,follow`)  
**Visitor planner:** `/upper-peninsula-waterfalls/` (unchanged)  
**Status: PARTIAL. Geographic feature identities and mapped-trail proximity now independently demonstrated. Neither waterfall-viewpoint access nor unnamed-cascade identity is verified.**

## The meaningful evidence threshold

Previous state: an unnamed waterfall on Pinkerton Creek from UP Travel, secondary references to *Pinkerton Falls* and *Traders Falls*, an official 2.6-mile Pinkerton Trail description and no independently checked geographic join. The earlier audit correctly withheld visitor directions but could not distinguish whether the names referred to different features.

**New federal/land-manager primary-source discoveries:**

1. **U.S. Geological Survey Gazetteer, refreshed October 2026**, directly returns **two separate federal Falls records** in Gogebic County, Michigan:
   - `gaz_id=2126322`, **Pinkerton Falls**, approximate federal geographic point **46.73334178, -89.89472921** (N, W)
   - `gaz_id=1615029`, **Traders Falls**, approximate federal geographic point **46.75106568, -89.89434121**
   - Measured great-circle separation **1,971.0 meters (1.97 km)** between the published points. This proves the federal source does **not** treat the two names as variants of one feature. It does *not* prove the exact physical drop is surveyed.
2. **Michigan DNR public Hiking Trails ArcGIS layer 2**, queried November 9, 2026, contains **66** named **Porcupine Mountain Wilderness Pinkerton Trail** polyline records, with **440** geometry vertices, county Gogebic. All returned segments have `TrailApprovalStatus=Approved` and `OpenClosedStatusNonmotor=Open`; the GIS metadata is a maintained trail database, **not today's trail-closure or road opening guarantee**. DNR's recorded `SegmentLengthMiles` attributes sum to **2.4342 miles**. The DNR visitor trail description lists **2.6 miles**, including **South Boundary Road to Pinkerton Creek 1.4 miles**. Do not substitute one length for the other or claim a falls-specific distance.
3. **Shortest point-to-segment proximity**, using local equirectangular projection of official WGS84-output geometry onto 66 DNR polylines:
   - **Pinkerton Falls (GNIS 2126322): 364.0 meters** nearest official DNR hiking segment (object ID **4682**).
   - **Traders Falls (GNIS 1615029): 69.7 meters** nearest official DNR hiking segment (object ID **6700**).
   - THESE ARE STRAIGHT-LINE MAP OFFSETS, NOT A SAFE WALK, GUARANTEED POINT ACCURACY, PATHWAY, OFF-TRAIL CONNECTION, PUBLIC PARKING OR VIEWPOINT.
4. **DNR-hosted Porcupine Mountains Avenza-oriented detailed backcountry map** independently labels **Traders Falls**. The map does not establish a signed final viewpoint spur to either fall and does not identify UP Travel's *unnamed* cascade.
5. **Western U.P. tourism's 2026 waterfall brochure** gives Traders Falls as `46.748746, -89.891906`, **317.7 m** from the USGS Traders point and **37.3 m** from the DNR trail polyline. Helpful independent context, **not** the official GNIS feature coordinate. A separate third-party directory puts its Pinkerton point **5,024 m** from the official Pinkerton point and its Traders point **16,350.7 m** from official Traders. Such conflicting third-party positions are **never plotted or presented as visitor GPS**.

### Why a 70 m offset does not authorize a 70 m hike

The federal GNIS point is a *geographic-name reference point*; DNR GIS represents the maintained *hiking corridor*. A short straight line between these two datasets says nothing about terrain, topography, stream access, a bridge, legal off-trail use, an authorized managed waterfall spur, or the precision of the original GNIS named feature's mapping. A named waterfall on a DNR technical map is stronger location evidence, but it is not the same as an agency-confirmed visitor viewpoint.

The unambiguous statuses are:

| Gate | Pinkerton Falls | Traders Falls | UP Travel unnamed Pinkerton Creek drop |
|---|---|---|---|
| Federal feature ID and distinct name | **VERIFIED: 2126322** | **VERIFIED: 1615029** | **NOT LINKED** to a federal ID |
| Federal natural-feature coordinates | **GEOGRAPHIC REFERENCE ONLY** | **GEOGRAPHIC REFERENCE ONLY** | **NO ACCEPTED POSITION** |
| DNR Pinkerton Trail mapped | **VERIFIED** (364 m offset) | **VERIFIED** (69.7 m offset) | Corridor known; waterfall placement **UNKNOWN** |
| DNR technical park map names a feature | Not labeled on inspected map | **Label present** | Unidentified |
| Complete legal trail/managed waterfall viewpoint | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |
| Visitor planning / destination pin | **NO** | **NO** | **NO** |

**The next actual threshold:** an online DNR park/land-manager route or independently validated established walking approach to the precise *Traders* waterfall viewpoint, with a current lawful start and riverbank rules, and an authoritative feature-to-feature match for the UP Travel unnamed cascade. Do not contact people, solicit user submissions or create a route if this source doesn't exist.

## Primary source URLs and provenance

* [USGS geonames other-hydrographic features ArcGIS layer 7](https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/7) (federal Gazetteer; Data Refreshed October 2026, USGS standard GNIS); exact output query is in `data/up-waterfall-pinkerton-official-geography-2026.json`.
* [Michigan DNR approved hiking trails public layer 2](https://gisagodnr.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/MapServer/2) (read-only publicly accessible GIS, retrieved Nov 9, 2026); exact query and 66 source line segments are in the snapshot.
* [Michigan DNR detailed backcountry park map](https://www2.dnr.state.mi.us/ftp/forestry/tsreports/Maps/RASNorth/Porkiesavenzadecimaldegrees.pdf) (Traders Falls named on technical park map; not a new site-specific access notice).
* [Michigan DNR Pinkerton Trail description](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf), 2.6-mile trail and 1.4-mile creek crossing.
* [Michigan DNR Porcupine Mountains seasonal vehicle-road restrictions](https://www.michigan.gov/recsearch/parks/porkies), South Boundary Road to Pinkerton Trailhead closes from December 1 until late spring; this does **not** establish whether the road is open at any arbitrary moment.
* [Western U.P. tourism 2026 waterfall brochure](https://explorewesternup.com/wp-content/uploads/2026/04/WaterfallMapBro_2022_Drft6-opt.pdf), independently published Traders marker not identical to federal point.
* [UP Travel unnamed Pinkerton Creek cascade listing](https://www.uptravel.com/listing/unnamed-falls-pinkerton-creek/4474/), whose exact feature ID remains **unknown**.
* [Independent directory with conflicting coordinates](https://michiganupperpeninsula.com/places-to-visit/waterfalls/): used only for discrepancy QA, not rendered as a feature point.

This is a *descriptive* GIS comparison, not a forecast, live report or safety-certified route. USGS GNIS explicitly says its feature coordinates do not provide directions or landownership; the DNR park map lists established trails and points but cannot guarantee current condition at a given moment.

## Chosen implementation versus rejected alternatives

**A. Add named falls with directions to the primary waterfall planner. Rejected.** Even a 70-meter proximity would overstate the legal viewpoint path; unnamed source identity still unresolved; third-party GPS positions are conflicting by kilometers.

**B. Versioned offline federal/DNR geographic crosswalk and a source-only opt-in map overlay on the existing noindex Evidence Atlas. Selected.** Only official trail polyline segments and official natural-feature points appear after a real visitor action. No drawn connector segment, no walking-time claim, parking marker, navigation button, route optimization or guest location access. A separate small lazy-loaded static dataset avoids slowing first load of the primary waterfall planner or the research catalog.

**C. Runtime Python/ArcGIS requests and dynamic geocoding. Rejected.** Static, dated evidence is reproducible and free of new serverless/third-party-key costs; no operational live waterfall-rights feed exists. The upstream source queries are recorded and can be manually refreshed only after independent review.

## Python Intelligence OS and Experience OS implementation

**Source snapshot:** `data/up-waterfall-pinkerton-official-geography-2026.json`, schema v1, federal GNIS records, DNR official trail geometry and field statuses, dated source URL queries, cited park map and brochure, and three location-quality control points clearly excluded from user map markers.

**Computation:** `python3 scripts/build-up-waterfall-pinkerton-crosswalk.py --write|--check|--summary`, pure Python stdlib, deterministic approximate nearest-on-line metric with equirectangular tangent-plane distances at federal point latitude, haversine point-to-point checks. Validates all 66 segment identities, valid numeric coordinates, two distinct federal IDs, dated source snapshot, segment status, and no offtrail path. Source lengths are presented as approximate metadata, not visitor route length.

**Output:** `public/assets/up-waterfall-pinkerton-official-comparison.json`, version 1. Only the two federal natural-feature points and 66 real DNR polylines are suitable for source-only display; unverified controls are reduced to *distance comparisons*, with their private directory coordinates withheld from output.

**Visitor interface:** An accessible source-only optional “Compare federal names and DNR trail” button, two federal point labels, readable distance numbers, DNR trail source linework and a reverse hide action. No imagery copied. On fetch failure the comparison stays hidden and original source facts continue to be readable. On selecting another waterfall, all research overlay geometry clears.

**Preserved:** 640 atlas source observations, 80 curated visitor destinations, 399 unmapped source names, original visitor map/shortlist, ads, canonical, Person ID, sitemap, noindex, source labels. No extra tool or public indexable page, new library, Redis, Supabase, runtime Python, or repeated background fetch.

**Test proof:** `tests/up-waterfall-pinkerton-crosswalk.test.js` confirms two IDs, 66/440 line facts, independent distance computation via Python `--check`, 70/364m metrics, anomalous third-party points excluded from public output, data contract fail-closed. Existing Playwright browser test extends mobile evidence selection, two source-only pins and 66 approved polylines, overlay toggle/reselection, fallback when comparison data returns HTTP 503 and key width breakpoints. All original waterfall browser/CI gates, full repository verification, emitted public HTML and actual Vercel deployment verification remain mandatory.

## Release & rollback

Before full CI, the change is implemented but **not yet verified or deployed**. Exact PR/head SHA and passing workflows must be recorded at merge. Revert the PR to restore the prior noindex Evidence Atlas without touching any curated waterfall visitor routes. Quality benefit is **geographic identity precision and defensible source distinction**, not a promised Google impression, CTR or revenue increase. Baseline: zero official GIS crosswalk overlays. After deployment: two USGS named features, 66 DNR segments, computed offsets, still zero approved waterfall viewpoint routes.
