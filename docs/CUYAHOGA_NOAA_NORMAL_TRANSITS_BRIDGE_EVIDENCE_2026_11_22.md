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
