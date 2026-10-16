# Michigan rockhounding: actual GLOS wave direction vs historic Agate coastline

**October 15, 2026. Source-research comparison, NOT a breaking-wave, stone-exposure, permission or safety model.**

## Physically independent inputs

- GLOS Seagull [Grand Marais SPOT-1361 source](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html): **real observed wave-from direction**. [Successful 144-record original-source run](https://github.com/izworskic/chrisizworski-com/actions/runs/38826852138) ended **2026-10-14 23:46 UTC**, significant height **0.95 m**, observed wave-from **329.11°**. The source was stale at time of research.
- NOAA ENC `US5MI77M.000` historic chart coastline feature **1938304** from **2014**, with independently corroborated waterward research normal **336.74° (NNW)**. [Source notes](ROCKHOUNDING_NOAA_ENC_SHORELINE_AND_PIERS_2026-10-15.md). **Not** a surveyed present wetline.
- Calculated *descriptive* directional difference: **7.63°**, resulting cosine research alignment about **0.991**. This simply indicates GLOS observed waves were coming from a bearing resembling the historic chart-derived lakeward orientation. It is **not a measurement or prediction of waves breaking on Agate Beach**. It has no calibrated physical wave-transfer or exposure interpretation, and it cannot establish newly exposed stones.

## Implementation

`lib/rockhounding/glos-spotter-facing.cjs` reuses the existing *source-checked* NOAA historical coastline directional comparator, but outputs clearly **GLOS observed open-lake** wave identity, observed UTC time, measured buoy height and historic chart reference. It explicitly sets measured beach-breaking height to **null** and every visit-window, safe-access, or stone-prediction flag to **false**. Bayshore Park yields `NO_HARBOR_TRANSMISSION_MODEL`, never the Agate historical bearing comparison.

The GLOS one-shot capture runner now records this separate research-only comparison beside original observed rows and freshness status. New tests cover actual recorded 329.11°, a direction facing away, missing/wrong sensor data, and absolute harbor non-inheritance.

## What remains

- Historical chart bearing is **not** permission to populate `grand-marais-wave-pilot.json` `shore.outwardBearingDeg`; it remains null and `UNVERIFIED_WATERLINE`.
- The GLOS Spotter is offshore; neither its measured height nor direction is measured breaking surf at the Agate beach, or sheltered harbor surf at Bayshore.
- No scientifically calibrated risk/storm-to-rock visibility model or dated field reports yet. NWS marine hazards and legal collecting restrictions still must veto decisions separately.
- Next highest-value task: accumulate **multiple independent** local SPOT-1361 offshore wave/storm episodes and preserve their actual timestamps so an honest seasonal research history can form. Do not inflate 30-minute observations into independent events.
