# Great Lakes geographic crossing detection, offline pilot

2026-11-24. Builds on merged historical replay PR #1930 and verified archive coverage work #1934 (documentation separate). No production model or page changes. The goal is a reviewable candidate queue for historical passage research, not a new forecast or an independent event source.

## Geographic contract

- Soo: use the existing owning engine's OSM-derived Poe and MacArthur chamber rectangles, separately, at the existing modeled target longitude. Axis is north-south, positive normal east (downbound), negative west (upbound). These are provisional mid-chamber references, not surveyed entrance gates, lockage start/end, or proof of which lock a vessel used. USACE describes the two operational chambers and facility context: https://www.lrd.usace.army.mil/Missions/Projects/Display/Article/3641904/soo-locks/
- Duluth: MnDOT identifies the Aerial Lift Bridge point at 46.77898660, -92.09290579 (https://www.dot.state.mn.us/historicbridges/L6116.html). Approximate channel heading 60 degrees toward the lake and 60 m half-width are deliberately provisional engineering assumptions, not surveyed channel edges. USACE confirms Duluth and Superior are distinct entries: https://www.lrd.usace.army.mil/Missions/Projects/Article/3639859/duluth-superior-harbor-minnesota-and-wisconsin/. Positive normal is departure, negative arrival. The bridge reference differs from the current model's CANAL point; do not score the model against it without independently reconciling target geometry. A candidate is an AIS antenna crossing, not a bow arrival, bridge lift, or entire hull passage.
- WGS84 latitude/longitude, local tangent-plane metres (111195 m/degree latitude and cosine-scaled longitude); finite cross-section, 5 m endpoint exclusion, no snapping or routing across land. The projection is appropriate for this local-scale pilot, not navigation. All three axes need historical chart/survey review before independent labeling. No automatic promotion by a metadata flag.

## Detection contract

Input schemaVersion 1, kind synthetic or historical-research, explicit UTC start/end (max seven days), source {url, receiptSha256, review}, observations [{mmsi,seen,lat,lon,shipType}]. Existing NOAA range-scan receipts are ordered range digests, not whole archive hashes. Caller must establish source/rights/receipt authenticity; the detector validates declared fields, not the external source. Preserve full chronologically sorted selected tracks including unusable observations as barriers; do not prefilter to only promising crossings. Cargo/tanker AIS types 70-89 only; no inference of voyage purpose. Unknown type or invalid position breaks the track; invalid identity/time or out-of-scope row rejects the dataset; exact duplicates collapse, conflicting timestamp observations form a barrier. Historical receive time and destination are not inferred.

Opposite stable sides (>10 m from axis), observed bracket at most five minutes, supporting fix on each side, no context gap over five minutes, no displacement over 35 knots, no reversal >8 m per step, actual segment intersection within finite gate (5 m edge exclusion). A single on-axis point can be bracketed; a dwell or multiple intersections is ambiguous. Repeated or competing candidate crossings by the same vessel/site within 20 minutes are withheld, including parallel chamber conflicts. These conservative thresholds are prespecified pilot assumptions, not measured accuracy; may omit genuine slow lock transits. No interpolation of passage time, no proof of zero traffic from zero candidates.

Run offline using existing JS engine reference constants (no duplicate production model, no new dependency):
```
node scripts/detect-great-lakes-crossings.cjs /local/observations.json /local/aggregate.json
node scripts/detect-great-lakes-crossings.cjs /local/observations.json /local/aggregate-new.json --local-review /private/candidates.json
node --test tests/great-lakes-crossing-detection.test.js
```
32 MiB and 250,000 row caps, output never overwrites. Default aggregate contains no vessel identities or tracks; optional local review file includes minimal supporting observations and vessel IDs for an authorized reviewer, never commit or publish it. Both output modes explicitly deny replay eligibility; the existing replay benchmark rejects candidate outcome kind. Review geometry, source continuity, independent passage records and antenna/target definition before constructing separate verified replay input. Preserve development/holdout separation, no holdout tuning. September 29 regional observation gap is not a negative passage label; never bridge a missing interval. Historical receipt times and commercial-use authorization remain open.

## Evaluation plan

Compare this finite-line and context approach against proximity-only grouping (existing Cuyahoga tool intentionally limited to reference proximity, not a crossing engine). Test forward/reverse, endpoint miss, exact line point, dwell, gaps, duplicate/conflicting fixes, invalid UTC, impossible displacement, repeated/reversing crossings and replay rejection. Use development observations before any holdout passage labels. Independently review axes and candidate brackets using an appropriate second source; do not call self-derived AIS labels independent ground truth. Full repository CI pending; development archive results below. No production release or calibration authorized.

## Development-only execution evidence

Successful exact detector execution in [run 45498395915](https://github.com/izworskic/chrisizworski-com/actions/runs/45498395915), job 138814863136, temporary PR #1937, code at detector commit `03d67251498772ec481a2ea1c2fa45891f61e3ae`. All seven real Node detector tests passed; isolated fixture execution also passed 47 assertions. September 4, 2024 development date only. NOAA archive ETag `0x8DDB02110673996` and ordered range receipt SHA-256 `a2884a44858f22348d4d9df8dd60abeddbff7ab4e98c549f9c006490b47024ab` exactly matched the prior coverage study. All 10,078,124 nationwide rows scanned; 196,943,872 bytes across 81 verified range requests. Detector received 65,713 selected observation rows across 162 vessel tracks, excluding 38,733 non-cargo/tanker rows or unknown types as track barriers. No invalid positions, eligible duplicate or conflicting observations reported. Input SHA-256 `e76e67ba511c29d2781f59f1275a6e87290fcb37c09a3ba68972b28136548ba8`. Aggregate artifact 14970276504 (seven-day retention); temporary raw observations deleted by runner cleanup, not uploaded or committed.

| Provisional reference | Opposite-side pairs considered | Retained unreviewed candidates | Rejected outside corridor |
| --- | ---: | ---: | ---: |
| Poe chamber | 9 | 6 | 3 |
| MacArthur chamber | 9 | 3 | 6 |
| Duluth bridge | 3 | 3 | 0 |
| Total | 21 | 12 | 9 |

Counts are candidate gate encounters, not confirmed unique vessel passages, recall, accuracy or verified lock assignment. The same encounter may be considered against multiple axes. No independent crossing label established. The result proves feasibility of source-to-detector execution on one development date. It does not establish target equivalence, surveyed gate widths, observed-time availability, commercial-use authorization, field performance or eligibility for calibration. No holdout observations were used for detection or tuning. Next: independently review historical chart geometry and reconcile each modeled arrival target, then review actual candidate brackets against independent passage evidence. Do not use the provisional reference crossing directly as replay ground truth. No changes to production behavior.

## Official reference reconciliation: 2026-11-24

NOAA U.S. Coast Pilot 6 chapter 12, page 432, section 95, page dated 2026-03-15 (https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C12_WEB.pdf) lists Poe 110 ft and MacArthur 80 ft chamber widths. Chapter 13, page 465, section 353, page dated 2026-11-01 (https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C13_WEB.pdf) lists Duluth bridge 300 ft horizontal clearance. These tables were visually reviewed. MnDOT confirms bridge reference coordinates 46.77898660, -92.09290579 (https://www.dot.state.mn.us/historicbridges/L6116.html). Published dimensions are not surveyed endpoints, and the current Coast Pilot editions do not independently verify September 2024 geometry. The bridge clearance is not a guarantee of navigable channel width. Do not simply shrink the existing gates around unreviewed centers or change the production model to make a benchmark appear better.

| Reference | Provisional full width (m) | Published physical dimension (m) | Disposition |
| --- | ---: | ---: | --- |
| Poe chamber | 56.26 | 33.528 | Oversized reference, historical centerline and endpoints unverified |
| MacArthur chamber | 35.56 | 24.384 | Oversized reference, historical centerline and endpoints unverified |
| Duluth bridge | 120 | 91.44 | Oversized reference relative to clearance, distinct modeled target |

A bounded official USACE NDC point-layer query and NOAA ENC Harbor.Bridge_line query both returned valid empty feature collections in [run 45499023624](https://github.com/izworskic/chrisizworski-com/actions/runs/45499023624), job 138817024160, temporary PR #1938. Source layer metadata: https://services7.arcgis.com/n1YM8pTrFmm7L4hs/ArcGIS/rest/services/Locks/FeatureServer/0 and https://encdirect.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer/87. Response SHA-256 respectively 1fc423ae159c0a6192968e2e21dcdcc14f433100443c8a90144534292b03c808 and 019b665f2cc0752d7f113fff7f7c9a2c9efe864fea7faf9e0d42df7dd2dae410. Artifact 14970072387, seven-day retention. Empty bounded query is not proof of absence. No official feature geometry retrieved; not a surveyed axis or historical chart validation. Current ENC Direct to GIS is updated weekly and is not for navigation. Historical chart source discovery: NOAA Historical Map and Chart Collection (https://historicalcharts.noaa.gov/) and NOAA ENC download/catalog (https://charts.noaa.gov/ENCs/ENCs.shtml). A contemporaneous chart edition or dated engineering survey and correctly georeferenced endpoints remain required.

Audit the actual provisional geometry against these independent dimension references using:
```
node scripts/audit-great-lakes-crossing-references.cjs
node --test tests/great-lakes-crossing-references.test.js
```
Audit is offline, reads existing owning model and detector constants, reports target offsets and mismatches, and does not alter any detector or public forecast. No automatic approval or promotion. The twelve September 4 candidates remain provisional and ineligible for replay.

## Independent event evidence acquisition

USACE Corps Locks public reports (https://ndc.ops.usace.army.mil/ords/f?p=108:1:::::::::) expose recent queue/status (30 days), river traffic (24 hours), and monthly/annual aggregates, not a verified September 2024 vessel-level event archive. NDC describes manual/operator and AIS collection (https://www.iwr.usace.army.mil/About/Technical-Centers/NDC-Navigation-and-Civil-Works-Decision-Support/NDC-Locks/); an AIS-derived log is not automatically independent of the NOAA input. Agency lockage arrival, entry, exit and completion are different event definitions; bridge open/close timestamps alone are also not antenna-crossing times. FreighterLog's approximately 15-minute uncertainty remains insufficient for a five-minute bracket. No independent event was acquired or matched in this phase.

Request-ready scope, not submitted:
- USACE Detroit District/NDC: existing publicly releasable Poe and MacArthur lockage/vessel logs for September 4, 10 and 15, 2024 UTC; vessel identifier, chamber, direction, recorded arrival/entry/exit/completion, timezone, field definitions, timing precision and operator-vs-AIS provenance, and any existing dated chamber/reference geometry. Request machine-readable existing records, no new analysis; ask about fees before incurring any. Official contact route https://www.usace.army.mil/Resources/FOIA/Offices/ or LPMS contact CEIWR-NDC.LPMS@usace.army.mil.
- City of Duluth: existing publicly releasable Aerial Lift Bridge operator passage logs, vessel names/identifiers, direction, actual recorded passage timestamps if available, bridge open/close events separately, time zone, precision, independent observation provenance, and any existing dated bridge/channel reference survey for the same development dates. Request machine-readable existing records; ask about fees before incurring any. Official public data request route https://duluthmn.gov/city-clerk/data-practices-resources/.
- Do not request personal crew data, security records or unnecessary operational information. No external request sent, no claim of record retention or availability. Obtain permission for any nonpublic material and document source rights. Holdout dates remain separate. Before replay require actual same-event independent evidence, verified geometry/target equivalence and a defensible observed bracket no wider than five minutes. Issue-time receipt evidence and commercial-use clearance remain separate blockers.

**Decision:** keep detector research-only and retain all three geometry blockers. Do not use chamber midline or bridge span as proof of arrival at the existing prediction point. A validated target definition and independent observations are prerequisites to changing prediction mathematics.
