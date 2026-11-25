# Cuyahoga Bridge Watch: precision gates and real NOAA crossing-window research

Study date: November 22, 2026.
Status: OFFLINE HISTORICAL RESEARCH, NO CONFIRMED BRIDGE CROSSINGS OR FUTURE ETA.
PR: https://github.com/izworskic/chrisizworski-com/pull/1841

## Why this is the difficult part

A visitor wants to know whether a named ship is approaching a particular Cuyahoga River bridge and where to watch. A ship's last AIS coordinate and straight-line speed cannot answer that reliably because of tight bends, variable bridge delays, moorings, sparse reception and branches. This study tests the source facts without inventing motion or a bridge opening.

The selected path is observed AIS evidence, official geography and conservative uncertainty windows before any forecast. This differs from the Soo Locks tool's chamber-focused decision and the Welland Canal's lock sequence; the Cuyahoga has many closely placed movable bridges and often multiple trips on one calendar date.

## Geographic evidence

1. NOAA U.S. Coast Pilot 6 Chapter 6, printed page 247, current PDF https://www.nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_WEB.pdf: 19 main-channel bridge references and two Old River references. File: data/cuyahoga/noaa-coast-pilot-bridge-references.json. NOAA provides rounded landmark coordinates, bridge names and river miles, not surveyed bridge crossing axes. Center Street is mile 1.39 in the Coast Pilot but mile 1.28 in 33 CFR 117.848, recorded as an unresolved source conflict. The Main Avenue NOAA chart point and selected ODOT inventory location materially disagree; that bridge is withheld. City of Cleveland Railroad and Carter Road are too close together to treat as independently resolved on limited historical fixes.
2. Ohio DOT official Bridge Inventory MapServer/0: 247 point features in the broad study box. Seven ODOT records were checked by official structure IDs and kept as a non-exhaustive reference set: data/cuyahoga/odot-bridge-inventory-points.json.
3. US Army Corps of Engineers National Channel Framework ChannelArea/1: one named Cuyahoga River authorized channel polygon and a Cleveland Harbor polygon. The former is an official channel area, not a sailed route or exact bridge centerline.
4. Cuyahoga County GIS official road centerlines: 1,965 LineString features in the broad study box, original official layer https://gis.cuyahogacounty.gov/server/rest/services/NCGIDE/Addressing_Sites_Streets/FeatureServer/1. The research crosswalk scripts/cuyahoga-county-centerline-audit.mjs tests named road segments against the USACE polygon and NOAA chart reference in a locally scaled geographic projection. A line/polygon overlap is never a surveyed span line.

Verified county road overlay results, from actual official data at https://github.com/izworskic/chrisizworski-com/actions/runs/45027884763:

| NOAA charted bridge | Nearest named county road centerline | County road line length overlapping USACE channel | Research classification |
|---|---:|---:|---|
| Center Street | 13.5 m | 19.2 m | Mapped overlap near chart point |
| Columbus Road | 11.4 m | 25.1 m | Mapped overlap near chart point |
| West Third Street | 17.2 m | 34.6 m on one segment, 18.3 m on another | Mapped overlaps near chart point |
| Carter Road | 30.1 m | 0 m | Nearby road but no verified channel overlap |
| Main Avenue | 315 m | 0 m | Matched county road too far from NOAA charted point |
| Eagle Avenue | No matching feature | None | No matching named county road line |

The above matches are limited to the selected named county roads and official mapped channel polygon. They do NOT prove bridge spans, public access, current drawbridge operating state, vessel navigation clearance or precise crossing times. County road lines may terminate before movable spans; negative matches do NOT imply a physical bridge is absent.

## Two-stage source-observation reconstruction

NOAA 2025 historical broadcast-point source: https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/index.html. Raw historical datasets downloaded only by one-time branch research Actions. Compact dated observations are retained briefly in GitHub Actions artifacts. No new visitor-time source requests, no paid provider and no live AIS expansion.

### Stage A: near-bridge chart reference windows

Scripts: scripts/cuyahoga-coast-pilot-brackets.mjs and scripts/cuyahoga-bridge-backtest.mjs.

For an accepted chart-point reference, actual NOAA points must bracket the closest approach with <=3-minute adjacent reports, documented movement on both sides and bounded offset from the rounded chart location. No unseen AIS position is interpolated. Original days:

- Mark W. Barker, August 21, 2025, MMSI 368251670: 353 NOAA study-area positions, 10 of 19 main bridge references got geometric *proximity* brackets, including two closely spaced bridges deliberately excluded from independent calibration. No complete upper river reconstruction.
- Sam Laud, August 15, 2025, MMSI 366938760: 215 study-area positions, only two main references passed strict proximity gates. Other potential bridge approaches with excessive gaps return an explicit insufficient-evidence state.
- Mark W. Barker, July 7, 2025, MMSI 368251670: 434 study-area positions, seven chart references obtained nearby bracket samples, many others are ambiguous from repeat passes.

The July 7 group was originally incorrectly vulnerable to whole-day directional mixing. The corrected three-date offline backtest (https://github.com/izworskic/chrisizworski-com/actions/runs/45027914534) now separates a six-reference increasing-mile episode at 03:57:51–05:39:30 UTC from a lone later reference at 14:02:07 UTC. The latter is UNKNOWN direction from this chart-reference sequence. It is not called a proven downriver crossing.

### Stage B: AIS fix chords against independently mapped road centerlines

Script: scripts/cuyahoga-ais-roadchord-study.mjs.
Successful GitHub source-data replay: https://github.com/izworskic/chrisizworski-com/actions/runs/45028108538.

A candidate requires: (a) source-matched named county road segment near Coast Pilot location, (b) mapped segment overlap with USACE authorized channel polygon, (c) consecutive actual NOAA AIS timestamps no more than 180 seconds apart, (d) observed movement 15–650 meters between fixes, and (e) a **straight chord connecting the two observed fixes** intersecting the official road centerline segment. The algorithm reports only the two observed timestamps, never a synthetic crossing coordinate or interpolated crossing time. Actual vessel path between observations is unknown; a straight chord intersection is NOT a confirmed crossing.

| Vessel and historical date | Road centerline | Earlier actual NOAA fix (UTC) | Later actual NOAA fix (UTC) | Bracket width |
|---|---|---|---|---:|
| Mark W. Barker, July 7 | Center Street | 04:01:09 | 04:02:19 | 70 s |
| Mark W. Barker, July 7 | West Third Street (first approach) | 05:07:40 | 05:08:50 | 70 s |
| Mark W. Barker, July 7 | West Third Street (later approach) | 13:24:31 | 13:26:21 | 110 s |
| Mark W. Barker, August 21 | Center Street | 15:37:28 | 15:38:39 | 71 s |

These intervals **bound the two observed AIS fixes linked by a hypothetical straight chord**, not validated bridge-crossing times. No chord was accepted at Center, Columbus or West Third for Sam Laud August 15. None was accepted at Columbus for either Barker date, even though NOAA reports genuine nearby vessel observations. This is the correct refusal because the independently mapped road segment does not intersect an eligible AIS chord under the selected conditions.

The two Center Street dates demonstrate repeated geometric candidate reconstruction with a second date but **not** an independent sample of different vessels or any ground-truth crossing label. West Third shows that multiple separate approaches can occur on one calendar date.

## Reproducibility, tests and release gate

Relevant scripts/tests:
- scripts/cuyahoga-ais-audit.mjs, scripts/cuyahoga-noaa-points.mjs, scripts/cuyahoga-observation-clusters.mjs.
- scripts/cuyahoga-coast-pilot-brackets.mjs, scripts/cuyahoga-bridge-backtest.mjs.
- scripts/cuyahoga-county-centerline-audit.mjs, scripts/cuyahoga-ais-roadchord-study.mjs.
- tests/cuyahoga-*.test.js; deterministic failure cases include stationary AIS jitter, larger report gaps, impossible positions, absent county road segments, inconsistent Coast Pilot/ODOT bridge points, repeated bridge references and ship visits on the same date.

Verified research workflows:
- Normal historical bridge reference study, 26 tests: https://github.com/izworskic/chrisizworski-com/actions/runs/45027130727
- Separated movement backtest reanalysis: https://github.com/izworskic/chrisizworski-com/actions/runs/45027914534
- County roads and federal channel overlap audit, four targeted tests passed: https://github.com/izworskic/chrisizworski-com/actions/runs/45027884763
- Actual AIS chord geometry research, nine targeted tests passed: https://github.com/izworskic/chrisizworski-com/actions/runs/45028108538

These are offline research success cases. **No real crossing time, operator bridge-opening log or independently verified crossing line is available.** The held-out date count is three, distinct vessels two. A future prediction model requires additional independent dates, distinct vessels, validated crossing-axis geometry and independent ground-truth event times. These criteria are not met; future ETA stays disabled.

No production route, scheduled source fetch, new Vercel function, Redis, paid data, dependency, ad policy, canonical/Person or SEO change. Full site CI and main integration are separate release gates and must be checked before merging.

## Exactly one next step

Obtain independently timestamped bridge opening/passage event labels or genuinely surveyed physical bridge span axes (especially Center Street, Columbus and West Third) and expand to ten different normal-transit days and at least three vessels. Only after an independent held-out accuracy evaluation demonstrates bounded, useful visitor arrival windows should a bridge ETA become a public claim. Until then an eventual map can display recent observed AIS and honest historical observations, with no fabricated predictions.
