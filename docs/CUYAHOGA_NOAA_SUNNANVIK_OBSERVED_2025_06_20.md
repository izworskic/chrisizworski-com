# Cuyahoga NOAA AIS observations: independent June 20, 2025 incident study

Study captured: November 22, 2026.
Status: OBSERVED HISTORICAL POSITIONS, NOT BRIDGE ETA VALIDATION.
Owning PR: https://github.com/izworskic/chrisizworski-com/pull/1841
Research run: https://github.com/izworskic/chrisizworski-com/actions/runs/45020146276
Official NOAA catalog: https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/index.html
Original archive: https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-2025-06-20.csv.zst
Original archive SHA-256: 2c1ae0ceb086b43f7953599cfe786f7daac0b5c25cb83386d86a41c16f5bbcf8
Event source: https://www.dvidshub.net/news/501106/coast-guard-responds-motor-vessel-aground-cuyahoga-river-cleveland

## Grounded facts from the real, not synthetic, NOAA archive

- Nationwide CSV data rows scanned: 8,970,401.
- Matching vessel name or IMO: 1,036 records. Name SUNNANVIK, IMO 7633375, MMSI 316018180 in all accepted river-box records.
- Accepted observations within the deliberately broad Cuyahoga research bbox: 886 timestamped positions.
- Maximum gap between the accepted consecutive observations: 4.3 minutes; no gaps longer than five minutes among this vessel's accepted data.
- Earliest accepted observation: 2025-06-20 03:37:37 UTC; latest: 23:57:00 UTC.
- Accepted latitude bounds: 41.49722 to 41.53935 degrees north; longitude bounds: -81.73501 to -81.70731 degrees.
- The original first-run importer counted 150 identity-matching rows as rejected by a combined out-of-bounds/invalid-position check. Its follow-up implementation separates records outside the coarse study box from truly invalid coordinates; do not call all 150 invalid or out-of-box without rerunning.

## Independent, time-separated evidence

Coast Guard release: report of grounding received at 12:43 a.m. EDT (04:43 UTC); ship refloated about 6:00 a.m. EDT (10:00 UTC). These are response events, not AIS fixes.

A deterministic, radius-based audit of the observed positions (scripts/cuyahoga-observation-clusters.mjs) found the following clusters at a **30 m anchor radius**, **at most five minutes between fixes**, **at least 15 observations**, and **at least 30 minutes observed duration**:

1. 04:37:40–09:53:50 UTC: 254 points; 316.2 minutes; largest displacement from first observed anchor 23.6 m. This position concentration substantially overlaps the Coast Guard report/refloating window, but it is NOT a separately measured grounding time.
2. 10:17:50–10:51:00 UTC: 21 points; 33.2 minutes; 29.7 m maximum displacement from first observed anchor.
3. 10:52:11–23:57:00 UTC: 545 points; 784.8 minutes; 6.7 m maximum displacement from first observed anchor. This might represent mooring, but the analysis does not validate a facility or vessel activity.

The long initial position concentration is strong support that AIS can represent an extended hold at the river entrance. It is not evidence that every bridge farther upriver has equivalent reception, or that future arrivals can be predicted to the minute.

## Reproduction and safeguards

1. Download the immutable-date NOAA CSV archive to a local temporary research directory, with available storage and zstd installed. Verify the archive SHA-256 against the value above. No API key or paid AIS service is needed.
2. Run the research importer using --name SUNNANVIK --imo 7633375 and UTC day 2025-06-20 to 2025-06-21.
3. Run the preexisting timestamp-gap audit and the new cluster analyzer with the normalized output:

    node scripts/cuyahoga-observation-clusters.mjs --input /tmp/sunnanvik-2025-06-20-observations.json --output /tmp/sunnanvik-2025-06-20-clusters.json

4. Recheck the first- and last-observed values, the cluster thresholds, and explicit false-ETA state. Don't publish private receiver details, raw national archives, or map directions to an AIS point.

NOAA historical source data are public domain (CC0). Source observation time is not time of data retrieval or bridge operation. The reconstruction is an offline research result, not live tracking or vessel navigation guidance.

## Interpretation and next hurdle

**Validated:** genuine NOAA position coverage exists for a named vessel as it approached and held near the Cleveland river entrance on June 20, 2025. The observational concentration is consistent with an independently reported grounding.

**Not validated:** documented complete normal river transit, vessel direction changes at every bend, verified channel centerline and exact bridge coordinates, bridge-opening observation times, public viewing sightlines, calibrated arrival-window coverage, commercial licensing for Open Waters, or any live public user-facing tool.

**Exactly one next engineering action:** collect a separate independently documented *ordinary* upriver/downriver transit and map its timestamped NOAA fixes to authoritative bridge/channel geometry. Only then evaluate predicted arrival windows on held-out dates. Do not use this anomalous grounded passage to calibrate routine travel speed.
