# Great Lakes historical passage replay pilot
2026-11-24. Research only; no change to public predictions.

## Source and rights
- NOAA/BOEM Marine Cadastre AccessAIS: https://coast.noaa.gov/accessais/ offers geographic/time extracts of historical point reports. NOAA 2024 metadata https://www.fisheries.noaa.gov/inport/item/73064 describes one-minute sampling, UTC timestamps, WGS84 and receiver-dependent missingness. Access constraints none; use constraint "For coastal and ocean planning". Do not equate publicly accessible with verified commercial reuse. NOAA's repository https://github.com/ocm-marinecadastre/ais-vessel-traffic describes CC0 content and 2024 point GeoParquet, but the exact data product terms need reconciliation before use for an ad-supported forecasting product. Existing live AIS commercial-use authorization remains unresolved.
- Prefer a small, rights-reviewed point extract, not monthly simplified track lines or raster transit counts. The latter lack the required temporal precision. No full nationwide daily files, data store, production API, new package, cron or paid request. No source records were downloaded for this pilot.
- Public historical point samples do not establish live receipt/availability times, destination fields or continuous coverage. Do not silently impute destination from the completed voyage, current vessel records or future observations. If issue-time availability is not proven, classify the study as a retrospective observation-time replay with an explicitly documented availability assumption, not proof of real-time performance. Do not submit an invented availableAt as verified evidence.

## Bounded NOAA PMEL coverage acquisition
NOAA PMEL ERDDAP dataset metadata: https://data.pmel.noaa.gov/pmel/erddap/info/AIS2024_AIS/index.html (2024 timestamps, CC0 copyright statement, exact case-sensitive fields MMSI,time,Lat,Lon,SOG,COG,VesselType,Length). Marine Cadastre FAQ https://coast.noaa.gov/data/marinecadastre/ais/faq.pdf and USCG terms https://www.navcen.uscg.gov/ais-data-sharing-categories-requirements still warrant separate downstream-use review. Copyright status is not commercial-use authorization. Metadata does not prove historical receipt times or destination; static attributes may be corrected retrospectively.
The new standard-library Node coverage audit uses a fixed local coverage-only box per port, September 2024 windows at most ten minutes, 2 MiB and 20,000 row caps, no redirects, 20-second timeout and no retries. No external request in tests or build. A local file or explicitly acknowledged research request produces aggregate counts and checksum only; raw tracks are not written by the script. Invalid motion including SOG 102.3 and COG 360, duplicates, out-of-scope rows and gaps remain explicit. Conflicting duplicates fail closed. Empty results are not evidence of no vessels or accuracy. These narrow boxes are for coverage probes, not reviewed crossing axes or adequate approach history. A larger rights-reviewed acquisition must be planned separately.
```
node scripts/audit-great-lakes-historical-coverage.cjs --research-fetch soo 2024-09-01T12:00:00Z 2024-09-01T12:10:00Z ACKNOWLEDGE_RESEARCH_ONLY /local/soo-coverage.json
node --test tests/great-lakes-historical-coverage.test.js
```
Direct NOAA request in this session failed at DNS resolution; web retrieval also unavailable. No records acquired or field coverage established. No production request, automated scraping or live feed added.

## Pilot sequence
1. Soo and Duluth only. Fix the actual target independently: observed arrival at a reviewed lock approach/reference or surveyed canal passage axis matching the model's target, not lockage completion, bridge lift, nearest AIS point or official booking. Reconcile geographic reference and model target before labeling; do not repurpose Cuyahoga's chart proximity brackets as crossings. Existing scripts/cuyahoga-bridge-backtest.mjs remains authoritative for that separate coverage study.
2. Candidate scope for a small pilot: September 1–30, 2024, Soo RIVER_BBOX and Duluth WESTERN_LAKE_BBOX initially, clip narrower only if it preserves approach history. This is a proposed sample, not verified availability. Use existing geographic references; independently review crossing axis/labels and exclude uncertain turns, stopped vessels, outages and gaps over 5 minutes. US receiver reach into Canadian waters is not guaranteed. Record raw file checksums, source version and reviewer. Expand only if rights, coverage and sample are sufficient.
3. Prespecify issue sampling and event matching without looking at forecast errors. Keep every sampled issue, including unconfirmed outcomes and abstentions. One issue per independently identified event in this v1 to avoid correlated repeated scoring; retain unmatched issues explicitly. Development issues before September 21, holdout September 21 onward; events crossing split excluded. Freeze model/version before final holdout; separate future calibration study, not tuning in this script.
4. Run existing Soo and Duluth buildCandidate functions at historical issue time. Compare existing midpoint to same-distance constant-speed baseline conditional on an estimate; baseline is intentionally simple and not an independent classifier. For Duluth baseline is effectively the existing constant-speed model, except distance rounding. Compare actual observed crossing bracket rather than invent a midpoint ground truth. Report count, unresolved estimates, abstentions, conditional MAE lower/upper bounds, interval containment/possible coverage and width, split/site/horizon. Do not infer recall, true positives, false positive rate or nominal calibration without complete opportunity and independent negative labeling. Count unique labeled events, dates and vessels in the acquisition manifest before drawing any conclusions. Require a prospective minimum 30 distinct reviewed holdout events per site before even assessing reliability; not a statistical guarantee.
5. If source/label/availability evidence fails, stop at coverage audit. No calibrated probability, automated model switch, or production uncertainty change from this pilot. Use Python standard library for future bounded archive joins when needed, keep existing JS forecasting authoritative, no new ML/runtime. Retain aggregate results rather than raw historic trajectories in public repo. 

## Replay contract
Run locally, input explicit reviewed JSON; no network, output created once (no overwrite):
```
node scripts/benchmark-great-lakes-passage.cjs /local/approved-issues.json /local/report.json
node --test tests/great-lakes-passage-replay.test.js
```
Input schemaVersion 1, kind synthetic or historical-review, source {url, review}, holdoutStartsAt explicit UTC, issues [{id,site,issuedAt,availableAt,vessel,outcome}]. Vessel is existing normalized AIS snapshot with mmsi, lat, lon, seen, speedKnots, course, shipType, lengthMeters and destination only if available at issue. Outcome is unresolved or confirmed-crossing-bracket with eventId, evidenceRef, method independently-reviewed-crossing, start, end. Timestamps include timezone; bracket must occur after issue, within 24h, at most 5 min wide. The script checks declared review fields, not authenticity; caller must independently verify the labels and rights. 10,000 issue and 20 MiB input limits; input SHA256 in report. Output includes no raw vessel tracks. No calibration authorized even for historical-review results.

## Evidence
Three exact-source synthetic test groups evaluated using actual existing JS engines and a minimal isolated assertion adapter: 28 assertions passed. Synthetic labels are intentionally constructed for arithmetic and negative-case tests and do not measure forecast performance. Full Node runner/CI and field outcome validation NOT VERIFIED. No live page, canonical, title, Person, creator credit, ads, provider, dependencies or production behavior altered. This research branch now targets main after consolidated PR #1929 merged; it is not a separate production engine. Review and release separately after the base integration; no auto-merge.

## Original archive coverage established: 2024-09-01 UTC

Official NOAA Marine Cadastre GeoParquet daily point archive: https://ocmgeodatastor1.blob.core.windows.net/marinecadastre/ais2024/ais-2024-09-01.parquet (source ETag 0x8DDB021091FE6BF). The ERDDAP no-match result does not establish absence. Original-file metadata run [45492769913](https://github.com/izworskic/chrisizworski-com/actions/runs/45492769913) established WKB-only geometry, no verified spatial-pruning columns, and 9,566,456 rows. Complete projected-column scan [45493155548](https://github.com/izworskic/chrisizworski-com/actions/runs/45493155548) at `b64b784aa3f2b49872e211f56d3ffc0f98099af1` used PyArrow 21.0.0, batches of 32768, all 10 row groups, and NOAA-documented UTC for naive timestamps. All 9,566,456 geometry rows scanned, 0 invalid geometries, 69,419 source rows selected across the two non-overlapping wider approach boxes. 186,040,320 bytes read in 81 range requests (cap 230,686,720 bytes). ETag matched every range. Range receipt SHA-256 `61b230d6474f1ff832cd07f072f112795456aa1e27248ff0ccc7a4a4e9875cc7` identifies the actual byte ranges read in order, not a full-file checksum. Aggregate artifact `14966742665`, retention seven days. No raw tracks or identifiers persisted.

| Region | Box (S,W,N,E) | Unique vessel-time rows | Vessels | Cargo/tanker rows | Cargo/tanker vessels | Cargo/tanker adjacent pairs | Pairs >5 min | Observed UTC minutes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| soo_local | 46.45, -84.5, 46.52, -84.25 | 11627 | 24 | 1457 | 8 | 1449 | 4 (0.28%) | 1366 |
| soo_approach | 45.9, -85.2, 47, -83.4 | 21796 | 49 | 7370 | 19 | 7351 | 21 (0.29%) | 1366 |
| duluth_local | 46.73, -92.15, 46.85, -91.95 | 12891 | 38 | 3850 | 11 | 3839 | 116 (3.02%) | 1366 |
| duluth_approach | 46.3, -92.5, 48.4, -86.8 | 47620 | 133 | 14191 | 23 | 14168 | 302 (2.13%) | 1366 |

Approach boxes match the existing model constants. The local boxes are coverage probes, not reviewed crossing axes. Cargo/tanker means reported AIS type 70 through 89, not confirmed commercial voyages. Local counts are subsets of approach counts. Wide boxes contain 21,561 cargo/tanker vessel-time rows combined; the same vessel can occur in both on different times, so distinct-vessel counts must not be summed as unique ships. Three duplicate vessel-time rows in the approach boxes were collapsed, 1,669 Duluth approach rows have unknown vessel type, and no selected row failed identity or time validation. All four boxes have observations in 1,366 of 1,440 UTC minutes; the 74 unrepresented minutes require investigation, not an assumed outage. Adjacent pairs are conditional on both observations inside the selected box and may include exit/reentry; this is not receiver uptime, passage count, or forecast accuracy.

**Coverage gate:** one-day availability confirmed for both regions. **Still blocked:** representative multi-day coverage and independent outcome labels, reviewed geographic crossing axes, historical receipt-time availability, and commercial-use authorization. No prediction model or production calibration change. Preserve archive-version evidence, sample development and holdout dates before evaluating outcomes, investigate the missing minutes, and obtain independent crossing brackets before scoring. Do not use the third-party passage timestamps as five-minute ground truth. One-time execution PR #1933 is separate and must not merge; no recurring workflow or runtime dependency.

## Prespecified six-day coverage feasibility sample

Run [45496196958](https://github.com/izworskic/chrisizworski-com/actions/runs/45496196958), exact source commit `6669e1660660cb5723a61128de8d5bb08ef9b5d7`, one-time execution PR #1935. Official listed NOAA files, same four geographic boxes and four projected columns as the September 1 pilot. Before retrieval, fixed September 4, 10, 15 as development and September 21, 25, 29 as holdout. The September 1 convenience probe remains development only. This purposive sample spans weekdays/weekends and early/mid/late September; it is not a random or seasonally representative sample. No date substituted. All six scans and fixtures passed, with per-range ETag checks, per-day 220 MiB cap, 100 range-request cap, no raw tracks retained. Each day's object rows reconciled exactly with scanned rows. Nationwide minute presence was evaluated using the projected timestamp column; local minute presence is conditional on valid observations inside boxes. All minute intervals below are half-open UTC offsets from midnight.

| UTC date | Split | Nationwide rows scanned | All four boxes observed minutes | No box observed, nationwide present (minutes) | Soo approach cargo/tanker rows | Duluth approach cargo/tanker rows |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2024-09-04 | development | 10078124 | 1440 | 0 | 6581 | 20399 |
| 2024-09-10 | development | 8221779 | 1416 | 11 | 5472 | 15736 |
| 2024-09-15 | development | 8774129 | 1367 | 0 | 9219 | 10906 |
| 2024-09-21 | holdout | 8925276 | 1430 | 1 | 7929 | 16524 |
| 2024-09-25 | holdout | 8497611 | 1432 | 0 | 8987 | 13271 |
| 2024-09-29 | holdout | 8041989 | 1157 | 280 | 4910 | 10281 |

| Region | Unique vessel-time rows | Cargo/tanker rows | Cargo/tanker vessel-days | Adjacent cargo/tanker pairs | Pairs >5 min | Weighted pairs <=5 min |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| soo_local | 65603 | 13829 | 81 | 13748 | 225 | 98.36% |
| soo_approach | 113867 | 43098 | 114 | 42984 | 447 | 98.96% |
| duluth_local | 59298 | 15812 | 50 | 15762 | 810 | 94.86% |
| duluth_approach | 212065 | 87117 | 153 | 86964 | 1963 | 97.74% |

Vessel-days are the sum of distinct vessels per day, not unique vessels or passages across the study. Local regions are subsets of approach regions. Pooled continuity is the proportion of within-day adjacent observed cargo/tanker pairs no more than five minutes apart, conditional on observations in a box; it cannot prove receiver uptime or completeness. Nationwide files contained observations in all 1,440 UTC minutes on every selected day. Regional gaps do not prove an outage, but the simultaneous September 29 gap [1156,1436), 19:16–23:56 UTC (280 minutes), is particularly important. The same method identifies 292 minutes absent in every study box while present nationwide across the six days. Do not interpolate crossings across gaps, or count missing outcome windows as negatives. Coverage evidence only; no holdout prediction results inspected or tuning performed. September 1's missing minutes were not evaluated nationwide in its earlier scan and their cause remains unresolved.

### Source receipts

| UTC date | ETag | Range bytes | Range requests | SHA-256 of ordered range receipt |
| --- | --- | ---: | ---: | --- |
| 2024-09-04 | 0x8DDB02110673996 | 196943872 | 81 | `a2884a44858f22348d4d9df8dd60abeddbff7ab4e98c549f9c006490b47024ab` |
| 2024-09-10 | 0x8DDB020AB5367B6 | 159997952 | 65 | `65e945fc184d5450823c2e7bdbcbab54b52c2b73b49c3e7ae550c4823a84aa70` |
| 2024-09-15 | 0x8DDB020DAB7E6AB | 171253760 | 73 | `305c39cca4efc4073e58117b8805a5d30900af9f4d0de989059ce3349bf4a2e2` |
| 2024-09-21 | 0x8DDB020F567613E | 174325760 | 73 | `2f331b4609f73d01aa42015f5afd25591b3ed9f522b0e04918c8af06a552bedd` |
| 2024-09-25 | 0x8DDB020C2EB1127 | 165928960 | 73 | `9cfb7f0f648037252966bddd537f3d5e669f413559798d043ac87a40d0443a39` |
| 2024-09-29 | 0x8DDB0208E1BFA0A | 156262400 | 65 | `392570ada26e0dda6625d4ebd11919bf206f4a63bbfb3bc6801ee52652266c85` |

Exact daily aggregate and diagnostic intervals retained in run job logs and seven-day artifacts. Total six-day source rows 52538908; range bytes 1024712704. No full-file checksum claimed. No production infrastructure, subscription, recurring job or forecasting changes. Next gate: reviewed crossing axes aligned to model targets, fixed direction and gap rules, independently reviewed passage brackets; NOAA lacks historical receipt-time evidence and destination, so only retrospective observation-time replay can be attempted absent further proof. Retain holdout separation and report abstentions. Commercial-use review remains open. No accuracy or calibration conclusion.
