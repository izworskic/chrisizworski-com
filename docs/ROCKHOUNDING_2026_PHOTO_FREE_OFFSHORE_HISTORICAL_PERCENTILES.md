# Rockhounding: Photo-free, observed offshore activity relative to Grand Marais history

**Research evidence period: June 26–October 14, 2026 (UTC).** Implemented October 16, 2026.

## We do not need before/after photographs to measure offshore storm activity

The [Michigan EGLE rockhounding guide](https://www.michigan.gov/egle/public/learn/geology/rockhounding) recommends examining pebbly shores after storms. The [GLOS Seagull Grand Marais Spotter SPOT-1361 / obs_140](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html) directly measures significant wave height, mean wave period and wave-from direction on open Lake Superior about four miles north of Grand Marais, MI. Independent NWS marine advisories and Marquette (MI) NOAA measured lake-level context already feed the prototype.

Photos are **not** needed to say whether observed *offshore wave activity* was elevated, peaked, declined or rebuilt. Photos **or other actual shoreline observations** *are* needed to claim newly exposed stones or validate a specific beach response. The wave sensor is not a beach-breaking surf gauge; underwater beach geometry, nearshore transformation, sediment grain size, runup and collection permissions remain unknown.

## New source-calibrated comparison: "How unusual are today's offshore waves?"

This is a new statistical context layer on the existing photo-free **live** GLOS 48-hour wave tendency and the independent NWS safety status. It does not replace the existing buoy, NWS, NOAA Marquette water-level, or research graphs.

**Original source**: the independently archived first **5,243 real GLOS buoy observations** from June 26 01:16 UTC through October 14 23:46 UTC, 2026. The archival branch continues acquiring later observations; the 2026 historical reference builder intentionally freezes those original dates and excludes newer rows so the comparison does not silently change as the operational ledger grows.

At fixed **6-hour UTC endpoints**, compute each preceding **24-hour** activity index:
`sum[trapezoid over original observed adjacent samples] Hs² × Tmean × elapsed hours`

Only source-observed adjacent readings separated by **90 minutes or less** count. A 24-hour window requires original readings near both ends, **>=90% measured time coverage**, no source gap exceeding 90 minutes, and sufficient raw samples. There is **no filled/interpolated wave-height signal**. The index has descriptor units `m² × seconds × hours`; because **Tmean is not the spectral energy period**, the value is **not physical wave power in kW/m**, not a kinetic energy flux and not sediment transport.

### Actual source-run findings

| Original 2026 GLOS historical reference | Value |
|---|---:|
| Measured source rows in frozen reference | 5,243 |
| Time endpoints examined | 439 |
| Valid 24-hour windows | **421** |
| Median historical activity index | **4.275** |
| 25th percentile | **1.510** |
| 75th percentile | **21.346** |
| 90th percentile | **108.155** |
| Largest 24-hour activity index | **559.430** |

**421 windows overlap** because endpoints are six hours apart. They are **not 421 independent storms or field-validated stone outcomes**. The sampling covers only **summer–fall 2026**, not a multi-year climate normal. This distribution is useful for a local *rank of observed offshore activity* but should not be trained into agate likelihood.

The live [`/api/rockhounding-wave-pulse`](../api/rockhounding-wave-pulse.js) already retrieves only one bounded GLOS time-series response per cached API request, plus separately bounded NWS hazard and remote NOAA water-level data. The new historical percentile **reuses the existing computed latest 24-hour index**, without any new upstream calls, credentials, licenses, or per-visitor image processing.

A fresh measurement can be compared to the 421 archived activity windows. Midrank is used for ties. The UI displays, for example, “offshore activity in the 85th percentile,” with an explicit explanation that this means a historical rank among observed buoy periods — **not 85% probability of new stones**. If source age exceeds **3 hours**, the 48-hour source coverage is incomplete, a data request fails, or required source identity/denial fields change, the percentile is **unavailable**, not zero/calm. An active NWS marine advisory is clearly noted; even if no advisory is matched, the value is **not** a safe-beach clearance. It cannot be transferred to protected Bayshore Park.

## Components and controls

- `lib/rockhounding/offshore-activity-percentiles.cjs`: original-row verification, fixed UTC 24-hour reference windows, source-gap and coverage thresholds, original-only integrals, quantile distribution, safe-to-show observational percentile rank, rejected unsafe source/clock claims.
- `scripts/rockhounding/build-offshore-activity-percentiles.cjs`: reproducibly freezes the original 5,243-row June–October 2026 historical reference from the ongoing archival branch, never discarding later operational observations.
- `data/rockhounding/spotter-2026-24h-offshore-reference.json`: statically derived reference, committed only on the research branch first and merged after tests. This file is locally available to the serverless API, **no network request for the baseline on every visitor hit**.
- `api/rockhounding-wave-pulse.js`: adds `offshoreSeasonalContext` from the same already-fetched on-demand GLOS 24-hour activity data. Existing NWS and NOAA services are unchanged.
- `public/rockhounding-lab/index.html`: additional readable neutral percentile display directly under the actual 48-hour wave tendency. It explicitly explains historical sample coverage, source staleness, active NWS alerts and no agate/safety prediction. Prototype remains **noindex**.
- `tests/rockhounding-offshore-activity-percentiles.test.js` and `tests/rockhounding-seasonal-activity-ui.test.js`: rank, ties, highs/lows, original source baseline values, stale and gappy suppression, NWS active veto, API request reuse, noindex, ad preservation and no rock-exposure claims.

This is the **useful photo-free product track**. Further gains will come from independently verified beach substrate, public access and site-specific hazard data—not treating a camera as a required API.
