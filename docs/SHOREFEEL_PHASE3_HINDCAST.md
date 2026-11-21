# ShoreFeel Phase 3: NOAA hindcast and paired field observations

**Status:** offline research tooling and synthetic tests. No claim of measured beach temperature, calibrated model, live NOAA archive harvest, model skill, public correction, or verified sensor installation. Builds on PR #1809; tracks issue #1810.

## Visitor decision and scientific constraint

At Bay City State Park, visitors want to know whether air *at the water's edge* differs from air roughly a quarter mile inland, and how wind changes the practical experience. The live page currently offers an NWS land-area forecast and NOAA water observations. Neither resolves the actual thermal gradient at the sand.

**Do not replace the live forecast with HRRR, URMA, or assumed physics.** Accurate beach estimates require independent field measurements. Keep wind chill, heat index, lake-water hazard reporting, official safety links, ads, canonical URL, Person identity and map fallback unchanged.

## Three choices examined

| Architecture | Decision |
| --- | --- |
| Adjust the existing JavaScript forecast from NOAA water and onshore wind | Reject for now: no calibrated nearshore observation target; would invent numerical accuracy |
| **Offline Python to extract archives and pair actual loggers** | **Chosen:** GRIB analysis and data integrity require reproducible batch processing, not Vercel request-time dependency |
| Request-time Python or Rust/WASM coastal model | Reject: expensive, no independent calibration, adds production failure surfaces without visitor benefit |

The 27-scenario Wolfram parcel calculation in PR #1809 remains a research sensitivity model. This work makes the next validation inputs inspectable and repeatable. Rust, Java and interactive client frameworks provide no advantage for small offline archive extraction or instrument QA. No new frontend visual pattern is justified until real values exist.

## Authoritative source register

| Input | Owner and frequency | Spatial/time meaning | Failure treatment |
| --- | --- | --- | --- |
| HRRR CONUS surface `wrfsfcfHH.grib2` | NOAA NCEP, forecast cycle hourly, ~3 km | 2-m model temperature, 10-m winds when in file; cycle and valid time differ by lead | Reject unexpected file identity, units, missing temperature or distant point; preserve model lead |
| URMA CONUS `2dvaranl_ndfd.grb2_wexp` | NOAA NCEP, hourly analysis, ~2.5 km, delayed ~6 hours | Retrospective model-assisted analysis of record; **not** an earlier issued beach forecast | Reject nonzero analysis lead, unexpected source/file metadata; never substitute as beach truth |
| NWS hourly shore and inland grids | NWS points API; metadata from PR #1809 | Verified land-classified forecast points approximately 0.42 km and 16 km west of beach | Keep grid identity and forecast issue time; no same-grid independent contrast |
| NOAA GLSEA surface water | NOAA GLERL | Satellite-derived inner-bay open-water pixel, not water at swimmer's feet and never air | Retain original 36-hour gate |
| Two physical air loggers | Permissioned independent site operators | Radiation-shielded 1-4 m dry-bulb measurements near beach and inland, with calibration/date/coordinates | Reject unshielded, undocumented, duplicate/future/flagged readings; preserve missing pairs |

NOAA public data use is allowed; do not imply NOAA endorsement. Respect source attribution and dataset scope. Source references checked November 2026:

- https://registry.opendata.aws/noaa-hrrr-pds/
- https://registry.opendata.aws/noaa-rtma/
- https://www.nco.ncep.noaa.gov/pmb/products/hrrr/
- https://www.nco.ncep.noaa.gov/pmb/products/rtma/
- https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/rtma.php

An archived HRRR run is a **forecast only for positive lead**. An HRRR f00 initial model state, like URMA, is labeled `gridded-analysis`. URMA may incorporate observations received after the target time; never treat it as a prospective forecast. Forecast issues and beach measurements must be compared with contemporaneous, version-locked issued model outputs.

## 1. Offline NOAA archive extraction

Pre-download an official NOAA GRIB2 file on a research workstation after verifying its object exists. The code does **not** search/fetch archives, install GRIB libraries, run in Vercel, or create a scheduled task. Install local ecCodes and its Python bindings for GRIB decoding.

Example for an HRRR cycle at 12 UTC with forecast lead 01, assuming the GRIB2 file is already downloaded:

```bash
python3 scripts/shorefeel-noaa-hindcast.py extract \
  --product HRRR --site park-land-grid \
  --file /local/verified-hrrr-file.grib2 \
  --source-url https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20260701/conus/hrrr.t12z.wrfsfcf01.grib2 \
  > /local/park-hrrr-20260701.json
```

Use the same source GRIB file with `--site west-bay-inland` for the inland grid point, and a separate NOAA URMA analysis archive for retrospective verification. The extractor checks the GRIB `dataDate/dataTime`, `validityDate/validityTime`, physical units, 2-m temperature, optional same-grid 10-m wind components, official archive filename and SHA-256. The JSON includes gridpoint-to-site distance, model temperature in Fahrenheit, forecast lead, UTC cycle, UTC validity, source file URL and checksum. Failing fields cause an error, not invented model values.

This is a **point sample of a model grid**, not a waterline air thermometer. The 8 km maximum spatial rejection bound is an integrity cap, not a precision claim. We do not infer a beach correction from this output.

With several extracted JSON files:

```bash
python3 scripts/shorefeel-noaa-hindcast.py audit /local/park-*.json /local/inland-*.json > /local/noaa-inventory.json
```

The audit reports accepted files, duplicates, conflicting revisions, rejected records and matched same-cycle shore-minus-inland **model** contrasts, and always returns `REQUIRES_FIELD_MEASUREMENTS`. Archive gaps and missing periods must be recorded separately when selecting an actual date range; an inventory is not a claim of full seasonal coverage.

## 2. Pair independent thermometers

With permission to install/use both stations, collect independently calibrated, radiation-shielded 2-m air temperatures near the park beach and inland. A beach station and a land-area NWS cell are **not** the same thing. Capture local terrain, solar exposure, wind sector, actual distance to shore, instrument serial/model, calibration, maintenance, and event identifiers in external research notes. Permission flags in metadata are self-reported, not independently verified.

Each logger metadata JSON has:

```json
{
  "station_id": "ACTUAL-APPROVED-STATION-ID",
  "role": "beach",
  "temperature_unit": "C",
  "permission_documented": true,
  "radiation_shielded": true,
  "sensor_height_m": 2,
  "distance_to_shore_m": 45,
  "lat": 43.6714,
  "lon": -83.907,
  "calibrated_on": "2026-06-01"
}
```

*The coordinates above are illustrative reference geography, not proof an instrument exists there.* For inland metadata, use `role: inland`, a different `station_id`, actual coordinate and distance 200-5000 meters from shore.

CSV minimum header:

```csv
observed_at_utc,temperature_c,quality_flag
2026-07-01T12:00:00Z,19.0,valid
```

Examples in this document **are not real measurements**. Do not add fabricated readings to production, public GitHub or a model-training archive.

```bash
python3 scripts/shorefeel-field-pair.py \
  --beach-meta /local/beach-meta.json --inland-meta /local/inland-meta.json \
  --beach-csv /local/beach-logger.csv --inland-csv /local/inland-logger.csv \
  > /local/field-pairs.json
```

The pairing logic requires independent station IDs, physical site metadata, valid UTC stamps, Celsius units and `quality_flag=valid`; it uses at most one inland reading within 5 minutes of each beach reading. Conflicting duplicate timestamps are excluded. It computes observed paired air-temperature differences, but always returns `UNVERIFIED_FIELD_METADATA`, `calibrationAuthorized=false` and `publicationAuthorized=false`.

Do not upload private raw logger data, identifying site details or permissions into the public repository. Keep local exports in access-controlled research storage, not any web-facing path.

## 3. Validation requirements before ever showing a beach-specific number

1. Verify physical logger existence, permission, sensor calibration, shielding, height, exposure, service status and periods; collect multiple independent lake-breeze/onshore and offshore regimes.
2. Independently archive the *issued* NWS land-side baseline and a candidate estimate made before observation time. Do not construct predictions from hindsight URMA and call them forecasts.
3. Preserve event IDs and a model-version lock **before** out-of-time/event-blocked holdout. Never let one event cross training and holdout.
4. Compare the exact same held-out observations: paired baseline/candidate MAE, RMSE, bias, season and wind regimes, station availability and coverage. If intervals are proposed, evaluate their empirical coverage separately. HRRR/URMA can assist model understanding but cannot substitute for withheld beach thermometer truth.
5. Release a calibrated public estimate only after independent field verification and model performance review. Include issued timestamp, expected validated error and a hard `UNAVAILABLE` fallback. Until then, keep the existing NWS forecast as the public answer.

The original existing `node scripts/shorefeel-validate-field.cjs /local/pairs.json` format takes separately pre-issued NWS/candidate forecasts and `eventId`; raw paired thermometer output is not directly a validated-model input. Do not silently transform it into a prediction or invent issue times.

## QA and release

```bash
python3 -m unittest discover -s tests -p 'test_shorefeel_*.py' -v
node --test tests/shorefeel-field-validation.test.js tests/shorefeel-physics.test.js
npm run verify:all
```

The dedicated ShoreFeel GitHub workflow runs both offline Python suites and existing mobile/desktop browser QA; full site CI is a separate merge gate. ecCodes is optional and only exercised against a *real locally supplied GRIB*; synthetic unit tests do not establish real-file compatibility, source availability, actual sensor existence, or forecasting skill.

**Rollback:** revert this research-only branch/PR. No new endpoint, live API calls, frontend/SEO/ads changes or Vercel jobs are introduced. Next outside-code requirement is to establish an actual, permissioned pair of temperature loggers and verify real NOAA GRIB extraction with controlled archive files.
