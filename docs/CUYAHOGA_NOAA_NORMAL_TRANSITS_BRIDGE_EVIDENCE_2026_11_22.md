# Cuyahoga ordinary vessel passages: NOAA observations and bridge-area references

Checked: 2026-11-22. Owning research PR: https://github.com/izworskic/chrisizworski-com/pull/1841
NOAA sampling: https://github.com/izworskic/chrisizworski-com/actions/runs/45025484015
Reference-proximity repeat: https://github.com/izworskic/chrisizworski-com/actions/runs/45025744380

## Visitor job and design decision

The visitor wants to choose a named ship and decide whether and where it may be visible at a publicly accessible Cuyahoga bridge. A naive real-time AIS speed extrapolation would mistake winding channel geometry, bridge queues, stopped ships and gaps for uninterrupted forward movement. We compared (A) instant straight-line ETA to (B) an evidence-first bridge sequence engine. Chose B. Existing Soo Locks and Welland tools solve distinct lock-based visitor decisions. This experiment remains OFFLINE and NOT PUBLISHED.

## Independently documented ordinary vessel visits

- Sam Laud, August 15, 2025: photographed heading upriver with ore for the steel plant: https://www.boatnerd.com/vessels/lakers/grand-river-navigation/sam-laud/
- Mark W. Barker, August 21, 2025: photographed unloading limestone at Cleveland RiverDock: https://www.boatnerd.com/vessels/lakers/interlake-steamship/mark-w-barker/

The dated photo captions establish presence and context, not exact AIS crossing times. No image assets have been copied or licensed.

## NOAA one-day, source-derived statistics

Data: NOAA Office for Coastal Management 2025 historical timestamped AIS broadcast points:
https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/index.html

| Measure | Sam Laud, August 15 | Mark W. Barker, August 21 |
|---|---:|---:|
| MMSI | 366938760 | 368251670 |
| Matching nationwide NOAA observations | 1,023 | 584 |
| Accepted research-area observations | 215 | 353 |
| Matching observations outside the area | 808 | 231 |
| Longest accepted-observation gap | 19.2 min | 52 min |
| Gaps longer than 5 min | 10 | 19 |
| Moving observations near two references | Neither passes evidence gate | Both pass proximity-only gate |

These are not channel-wide receiver coverage rates. Whole-day gaps do not describe uncertainty at each individual bridge.

## Official geographic reference sources, not surveyed bridge centerlines

- USGS 04208510, Cuyahoga River at Center Street Bridge, decimal 41.4942176270731, -81.7029090536718. Site coordinates are map-interpolated with reported accuracy ±1 arcsecond: https://waterdata.usgs.gov/monitoring-location/USGS-04208510/
- Coast Guard 33 CFR 165.903 Columbus Road bridge east-bank safety-zone point 41°29'18.8" N, 81°42'02.3" W. Decimal 41.4885555556, -81.7006388889: https://www.law.cornell.edu/cfr/text/33/165.903
- Coast Guard 33 CFR 117.848 places Center Street at river mile 1.28 and Columbus Road at mile 1.93. Regulatory river miles are ordering labels, not survey-grade span coordinates, navigable centerlines or public visitor entrances: https://www.ecfr.gov/current/title-33/chapter-I/subchapter-J/part-117/section-117.848

Source ledger: data/cuyahoga/bridge-observation-references.json. The offline script scripts/cuyahoga-bridge-proximity.mjs tests whether the ship is moving on both sides of a nearby fix with surrounding reporting intervals no longer than three minutes. It refuses bridge-crossing, bridge-opening and ETA labels.

## Actual NOAA observations

MARK W. BARKER, August 21, 2025. Eastern Daylight Time is UTC-4.

- 11:38:39 a.m. EDT: nearest NOAA observation to USGS Center Street bridge-area reference, **40.3 meters** from the mapped monitoring point.
- 11:56:21 a.m. EDT: nearest NOAA observation to USCG Columbus Road bridge east-bank point, **33.7 meters** from that published point.
- **17 minutes 42 seconds** between these nearest *observed reference-position* times. Sequence is consistent with upriver movement from mile 1.28 to 1.93. It is NOT a confirmed bridge-to-bridge travel time or crossing measurement.
- Adjacent position fixes recorded around each reference show tens of meters of genuine vessel movement and short reporting intervals, not stationary jitter.

SAM LAUD, August 15, 2025. Nearest NOAA observations about **95.1 m** from Center Street reference and **109.2 m** from Columbus Road reference. Adjacent gaps and movement evidence fail the strict approach gate, so no passage order or bridge-crossing assertion is issued. This is the intended outcome, not a failed tool.

The workflow tested 18 deterministic research cases and passed on 2026-11-22. See the repeated source-data research run linked above. It produced compact dated artifacts with checksums and no production dependency.

## Geometry research and technology

Next official data sources:
- NOAA Office of Coast Survey ENC Direct to GIS Harbor.Bridge_line layer 87, https://encdirect.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer/87
- US Army Corps of Engineers National Channel Framework ChannelLine layer 0, https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/National_Channel_Framework/MapServer/0

The branch-scoped workflow .github/workflows/cuyahoga-official-geometry-study.yml requests bounded features. A published REST endpoint is NOT yet validated as usable geometry for these exact two bridges. Once retrieved, manually reconcile scale, topology, bridge identities and Coast Guard miles. A channel centerline must not be presented as a safe vessel route.

Technology fit: existing Node.js offline NOAA parsers and fixture tests remain primary. Future HTML/CSS+SVG/JavaScript for the visitor-facing connected graphic, optional Python only for offline GIS reconciliation. Rust and Java not justified. No new production AIS API, commercial provider, Redis, scheduled data job, Auto ads changes, canonical or Person schema changes.

## Release status and next action

Source evidence and two checkpoint proximities: **OBSERVED**. Actual bridge-span axes, bridge operations, passage ETAs, visitor access, live receiver coverage and independent held-out forecast calibration: **NOT VALIDATED**. No public-facing tool has been deployed. Existing PR remains draft pending full main and PR gates.

One next action: Inspect official NOAA/USACE Cuyahoga geometries, identify the matching charted bridge spans and channel feature, then compare time intervals against separate date held-out passages. Keep ETA disabled until accuracy and failure rates are demonstrated.


## 2026-11-22 official GIS evidence investment: seven bridge inventory points and channel polygon

One-time independent official GIS query: https://github.com/izworskic/chrisizworski-com/actions/runs/45026345099
Artifact: cuyahoga-official-gis-research. The job completed successfully and four new bridge crosswalk tests passed.

The spatial research envelope is 41.44 to 41.54 N and -81.75 to -81.65 W, a broad research bounding box rather than an approved navigation route. The downloaded ArcGIS GeoJSON was checked for required feature collections and identity fields. The data are attributed to their original public owners.

- Ohio DOT Bridge Inventory MapServer/0: **247 point features** intersect the envelope. A seven-bridge manually selected, non-exhaustive research subset is in data/cuyahoga/odot-bridge-inventory-points.json. Every selected structure file number, name, crossed feature, raw operational-status code, and coordinate was checked against the original ODOT record. All seven matched.
- USACE National Channel Framework MapServer/1: **two polygons** intersect the box: CLEVELAND HARBOR and the CUYAHOGA RIVER authorized channel area, with feature ID CELRB_LB_05_CUY and source dataset NCF_CELRB_DIS_OHIO_NORTH_20260420.ZIP. This polygon is an authorized channel *area*, **not** the actual course a ship must follow or an exact centerline.
- NOAA ENC Direct Harbour Bridge_line/87: **one LineString**, categorized as a *footbridge* east of the major working river bridge sequence. Not suitable as the shipping bridge catalog.
- NOAA ENC Direct Berthing Bridge_line/40, Approach Bridge_line/91 and USACE ChannelLine/0: **zero features** returned in the study envelope. These empty queries DO NOT establish an absence of physical bridges or channel.
- Four of seven chosen ODOT bridge points lie inside the USACE Cuyahoga polygon: Columbus Road, Carter Road, West Third Street, Eagle Avenue. Three fall outside: Center Street, Main Avenue, River Road. This is a property of **ODOT inventory points vs USACE authorized channel polygon** and does not imply any bridge is absent, closed, inaccessible, or outside the physical river. Bridge geometry and agency feature origins differ.

Verified ODOT points (WGS84 decimal degrees, official ODOT SFN identity; these are inventory point references, not span axes):

| Bridge name | ODOT SFN | Latitude | Longitude | Coast Guard mile |
|---|---|---:|---:|---:|
| Center Street | 1869345 | 41.494323 | -81.703520 | 1.28 |
| Columbus Road | 1833758 | 41.488369 | -81.700469 | 1.93 |
| Carter Road | 1869264 | 41.494239 | -81.697850 | not yet reconciled |
| West Third Street | 1869728 | 41.488089 | -81.685631 | not yet reconciled |
| Eagle Avenue | 1869604 | 41.493381 | -81.692311 | not yet reconciled |
| Main Avenue | 1800035 | 41.490256 | -81.711967 | not yet reconciled |
| River Road | 1869981 | 41.497769 | -81.710619 | not yet reconciled |

Official sources:
- https://tims.dot.state.oh.us/ags/rest/services/Assets/Bridge_Inventory/MapServer/0
- https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/National_Channel_Framework/MapServer/1
- https://encdirect.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer/87
- https://www.ecfr.gov/current/title-33/chapter-I/subchapter-J/part-117/section-117.848

The offline research crosswalk at scripts/cuyahoga-official-bridge-audit.mjs and tests/cuyahoga-official-bridge-audit.test.js rejects missing/altered official feature identities, point drift, an absent/duplicate USACE Cuyahoga polygon, an invented verified visitor entrance, an invented open status or falsely claimed surveyed span coordinates. It verifies source matching; it cannot independently determine whether any bridge is operational or visitors may approach it.

**Critical limit:** This milestone source-validates important *named bridge map reference points* and the extent of the federal *channel area*. It does NOT validate surveyed bridge-crossing axes or complete upriver channel centerlines, normal arrival windows, future movement, current lift activity, or public viewing access. Production bridge ETAs remain disabled. Multiple independent held-out transits and true span-axis crossings are still required. Do not label the 17.7 minute NOAA reference-to-reference observation interval as exact bridge-to-bridge travel time.

**Exactly one next engineering action:** reconcile surveyed bridge span axes / channel passage lines using additional source-backed geometry, then replay multiple independent ordinary vessel passages with held-out calendar dates and quantify crossing-time bracket uncertainty before enabling future ETA predictions.
