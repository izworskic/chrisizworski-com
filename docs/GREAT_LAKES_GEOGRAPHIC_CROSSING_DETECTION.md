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
