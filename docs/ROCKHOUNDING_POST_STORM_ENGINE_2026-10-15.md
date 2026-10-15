# Michigan rockhounding — post-storm engine, Phase 2 (October 15, 2026)

**Status: CODE COMPLETE FOR RESEARCH / NO LIVE, CALIBRATED BEACH VERDICT.** PR #1001 remains a draft. No public URL, API route, ads, sitemaps or canonical changed.

## What the engine actually measures

- NOAA operational **GLWU / Great Lakes wave model**, regional 2.5 km grid product \`glwu.grlc_2p5km_sr.tCCz.grib2\`. Specific fields:
  - \`HTSGW\` = combined significant wave height (m).
  - \`WVHGT\` = wind-wave significant height (m).
  - \`WVPER\` = wind-wave mean period (s).
  - \`WVDIR\` = **wave from** direction (degrees), NOT \`WDIR\` which is wind direction.
- Persist model analyses as model analyses, **not buoy observations**. Forecasts are separately tagged; an old forecast is not allowed to become historical evidence merely because its valid time has passed.
- For a **verified wet model cell and independently reviewed shore outward-bearing**, calculate a direction-sensitive *research proxy*: \`WVHGT² × WVPER × max(0, cos(wave_from - shore_bearing))\`. This is not measured erosion, exact wave energy, wave run-up, a stone probability, or a calibrated safety rating.
- A 72-hour lookback and retained ~14-day older baseline support provisional anomaly detection. Prototype trigger: peak >1.6 × baseline P75, decline in current proxy to ≤55% of peak, event age ≥4h, and a full 12-hour forecast that remains below the same relative threshold. These are **uncalibrated engineering heuristics**, never public stone-exposure claims. Calibration against episodes/field observation may materially change them.
- **Three independent questions:** Was regional model wave forcing anomalously high? Did it decrease? Do forecast/warnings justify even investigating an upcoming visit? The third is **not satisfied** by the directional proxy. If hazards are active: \`HAZARD_VETO\`; if unknown: no safe search window. All research responses have \`canPublishSearchWindow=false\`, \`canClaimNewStones=false\`, \`canClaimSafeConditions=false\`.

## Source mechanics / ingestion

\`scripts/rockhounding/glwu-extract.py\` builds the exact public NOMADS grib-filter query for one product file, 4 parameters, surface level and a small Grand Marais bbox (no API key). Requires **optional** \`eccodes\` only for decoding; the URL may be generated without dependencies. The script reads an existing subset GRIB2 or makes one explicit download, and returns provenance-tagged point samples, source model cycle, nearest wet point and distance from each approximate sampling target.

To print the download URL, without network or decoder:

\`\`\`bash
python3 scripts/rockhounding/glwu-extract.py --date 20261015 --cycle 06 --print-url
\`\`\`

To decode a downloaded regional GRIB2:

\`\`\`bash
python3 -m pip install -r scripts/rockhounding/requirements.txt
python3 scripts/rockhounding/glwu-extract.py --date YYYYMMDD --cycle 06 --grib-file ./subset.grib2 --output ./wave-samples.json
\`\`\`

To make **one** NOAA request, replace \`--grib-file ...\` with \`--download\`. NOAA explicitly requests **≥10-second spacing** between scripted GRIB filter requests. Do not poll per user or run this inside a user-facing Vercel serverless endpoint. The subset URL / file naming and ecCodes decoding have **not yet been verified against a live GRIB2 from October 15**; the output is therefore a research adapter, not a deployed pipeline.

\`lib/rockhounding/glwu-archive.cjs\` merges sampled fields, deduplicates by site+grid-cell+phase+valid time, retains about 19 days of actual model analyses and upcoming forecasts, and refuses forecast-to-analysis promotion. \`forSite\` splits 72-hour analyses, historical baseline and upcoming forecasts. This is a **local data-contract module**; it still requires a persistent store and scheduled ingestion before any continuous user-facing product.

## The exposed versus sheltered question

The model uses approximate study targets near Agate Beach (46.6760,-85.9853) and Bayshore Park (46.6719,-85.9839), NOT legal parking pins. It reports both sampled model-cell coordinates and whether the two study points resolve to the same grid cell. When model cells coincide, the program is **not allowed** to call their nearshore wave exposure independent. Most importantly, the protected Grand Marais harbor may be much smaller than the regional wave grid; it requires a separate observed/shelter/fetch treatment rather than an invented numerical attenuation factor.

The standing pilot config in \`data/rockhounding/grand-marais-wave-pilot.json\` deliberately leaves \`shore.outwardBearingDeg\` and \`modelCell\` **null** until verified. Therefore the research engine currently returns \`CELL_NOT_VERIFIED\` or \`SHORE_ORIENTATION_UNVERIFIED\` for *real* pilot data, not a fake post-storm opportunity.

## Deterministic verification

- \`tests/rockhounding-poststorm.test.js\`: storm signal, sustained waves, returning waves, hazards, stale, gappy history, incomplete baseline/forecast, wind vs wave direction, unreviewed geometry, unresolved protected bay, no public-safe signal.
- \`tests/rockhounding-glwu-archive.test.js\`: time-provenance and anti-leakage.
- \`tests/rockhounding-glwu-cli.test.js\`: NOAA URL parameters and invalid cycles, no live network.
- Earlier public-access/rock collecting permission tests remain unchanged. Run \`node --test tests/rockhounding*test.js\` and repository \`npm run verify:all\` before updating or merging PR.

## Failure taxonomy

\`CELL_NOT_VERIFIED\`, \`SHORE_ORIENTATION_UNVERIFIED\`, \`BAY_NOT_RESOLVED_BY_GRID\`, \`HAZARD_VETO\`, \`INSUFFICIENT_HISTORY\`, \`STALE_MODEL_ANALYSIS\`, \`INSUFFICIENT_BASELINE\`, \`NO_RELATIVE_DISTURBANCE_SIGNAL\`, \`MODEL_DISTURBANCE_ONGOING\`, \`SETTLING_CANDIDATE_FORECAST_INCOMPLETE\`, \`WAVES_MAY_REBUILD\`, \`SETTLING_CANDIDATE_HAZARDS_UNKNOWN\`, \`RESEARCH_SETTLING_CANDIDATE\`. All remain research-only.

## Validation gate still to be performed

1. Fetch and decode a live NOAA GLWU GRIB2 subset (with ecCodes installed), confirm the four parameter numbers, UTC valid times, wet masks and nearby model cell coverage. Review data-volume/rate-limits.
2. Validate stable coastal sampling cells and beach-facing normals; test whether two Grand Marais targets actually share the same wet cell; do not infer harbor surf if grid cannot resolve it.
3. Archive enough model analyses for **real** 72-hour + 14-day baseline comparisons, select three dated wave episodes, compare NDBC observations where relevant, and collect a limited set of shoreline field reports.
4. Calibrate directional proxy and settling window with measured successes *and false alarms*. Connect NWS marine hazard and local access/ice checks. Until then use no user-facing **\"Best time to rockhound\"** verdict.

Sources:
- NOAA GLWU filter: https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu
- NOAA product inventory (hours, parameters): https://www.nco.ncep.noaa.gov/pmb/products/wave/glwu.grlc_2p5km_sr.t00z.grib2.shtml
- NOAA NOMADS filter scripting/rate guidance: https://nomads.ncep.noaa.gov/info.php?page=gribfilter
- NOAA weather GRIB2 parameter definitions: https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_table4-2-10-0.shtml

**Next priority:** Live GLWU wet-cell extraction and an archival backtest. No municipality email is needed.
