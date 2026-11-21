# ShoreFeel Saginaw Bay: deployment-ready field pilot, November 21, 2026

**Status:** instrument co-location preflight and prospective NWS archive software built, synthetic tests provided. No instruments acquired, installed, verified or read. No park research permission or scientific sensor partnership has been obtained. This work does **not** alter a public ShoreFeel temperature, wet-skin safety statement, HTML, API, SEO, maps or AdSense.

## Visitor question and scientific goal

**At the beach, how different is the actual air temperature from an inland site about a quarter-mile away?** The established NOAA coastal weather forecast is useful but gridded; an apparently close station can be separated by marsh, shade, asphalt or a different wind field. A credible beach-specific correction needs two independent **dry-bulb air thermometers**, checked against each other while co-located, then logged simultaneously at distinct sites, plus credible contemporaneous local wind. The optional mathematical parcel model may be evaluated only against withheld observed beach truth and genuinely pre-issued forecasts.

The primary pilot is the Saginaw Bay coast by Bay City State Park, not a fabricated installation in that park. A separately authorized private or institutional shoreline/inland site in the **same coastal exposure** can be considered if site permission and safe mounting are established. Private or personal exact coordinates and serial numbers belong in a secured research log, not a public GitHub file.

### Choice of technology

- **Chosen:** Python stdlib offline sensor bench verification and event/forecast archive, reusing `shorefeel-field-pair.py`, `shorefeel-field-context.py`, `fieldAudit`. Costs almost nothing at request time and does not add a site endpoint.
- Deferred: shipping a JavaScript/Rust shoreline correction without field data. Faster code cannot replace observation.
- Deferred: automatic request-time weather harvesting or a new Redis/Supabase store. A small manually dispatchable GitHub Actions evidence snapshot is sufficient until a verified field program begins.

## Field partner and permission work

**Required for a state park:** Michigan DNR documents that **all research activities in state parks require a land-use permit**. Application generally needs a map/detailed site, research purpose, dates, methods, equipment and any effect on public use. The DNR public-land permission guidance says permit applications should be submitted at least 60 days before the proposed use. Do not mount equipment on the park beach, in Tobico Marsh or on infrastructure based on a conversation or this document alone.

- DNR research permit instructions: https://www.michigan.gov/dnr/managing-resources/public-land/permission/scientific
- DNR public-land permission overview: https://www.michigan.gov/dnr/managing-resources/public-land/permission
- Bay City State Park contact published by DNR: **DNR-BayCityStatePark@Michigan.gov**; park details https://www.michigan.gov/recsearch/parks/baycity
- Potential scientific collaborator: Saginaw Valley State University's **Saginaw Bay Environmental Science Institute**, https://www.svsu.edu/sbesi/research/ . SVSU has separately announced a Lake Huron environmental research station, but this is not evidence of a calibrated beach thermometer already operating or that partnership permission has been granted. https://www.svsu.edu/newsroom/news/2023/december/environmentalresearchstation/

**Suggested first outreach**, not sent: ask Bay City State Park whether a two-logger nonintrusive summer 2027 meteorology study is appropriate and for its land-use-permit pathway; separately ask SVSU whether existing measured shore/inland research stations or a co-investigation could reduce the need to install new equipment. Record the written responses and any permit number privately before site work.

## Instruments and site design

Two separate, calibrated, **matching temperature loggers** with radiation shields and 5-minute UTC time-series exports; 1.5-2 m above representative ground (~5 ft) and separated from direct solar heating, reflective walls, pavement, vehicles and buildings. NWS temperature sensor guidelines recommend **5 ft ±1 ft above representative ground** and exposure that reflects the surrounding area: https://www.weather.gov/aly/CoopEquipment . A research partner should review exact exposure and site safety.

A third independent nearby wind source is desirable: actual *wind-from direction* and speed, not a distant forecast mislabeled as observed wind. If local wind measurements are unavailable or unqualified, report the wind regime as unknown. The prior `shorefeel-field-context.py` refuses to derive predictive skill from missing local wind data.

| Proposed comparison | Constraint and caveat |
| --- | --- |
| Nearshore thermometer | Within 200 m of water under the existing pairing contract; independent land-manager permission and a known dry-bulb shielded sensor; **not automatically on the sand** |
| Inland thermometer | 200-5000 m from water under the pairing contract; target **roughly 400 m** as a study hypothesis, not a predetermined GPS site |
| Wind | Independently documented local observation and valid meteorological from-direction; no assumed fetch from the mapped pixel |
| Water | Recent sourced NOAA GLSEA satellite nearshore pixel only, kept distinct from waterline temperature |
| Forecast | Actual NOAA/NWS land-grid hourly forecast retrieved **before** its valid period, with source checksum and grid identity |

Use a minimum 24-hour co-location bench run before any field separation. The bench test cannot prove absolute accuracy; ideally compare both against an independently calibrated reference thermometer and document its calibration. After deployment, require across-season coverage and multiple onshore/offshore events, as already set out in `docs/SHOREFEEL_PAIRED_CONTEXT_FIELD_STUDY_20261121.md` and `docs/SHOREFEEL_PHASE3_HINDCAST.md`.

### Preflight: instrument agreement, not absolute calibration

Input is two logger CSV exports, with header:

```csv
observed_at_utc,temperature_c,quality_flag
```

The private metadata JSON must have the following **schema contract**, with actual sensor IDs and dates supplied after hardware is selected; these placeholder values are **not actual installations**:

```json
{
  "schema": "shorefeel.field-logger-bench.v1",
  "coLocatedSameExposure": true,
  "benchSitePermissionDocumented": true,
  "distanceBetweenSensorsM": 1.0,
  "devices": [
    {
      "stationId": "REPLACE_WITH_REAL_DEVICE_A",
      "radiationShielded": true,
      "sameLoggerModelAsPartner": true,
      "sensorHeightM": 1.5,
      "calibratedOn": "YYYY-MM-DD"
    },
    {
      "stationId": "REPLACE_WITH_REAL_DEVICE_B",
      "radiationShielded": true,
      "sameLoggerModelAsPartner": true,
      "sensorHeightM": 1.5,
      "calibratedOn": "YYYY-MM-DD"
    }
  ]
}
```

`calibratedOn`, shielding and permissions are self-reported metadata, not verification by software. Store real calibration certificates and authorization separately. The benchmark code pairs no farther apart than 2 minutes without interpolation, and requires 200 pairs over >=24 hours, >=30 local daytime and >=30 nighttime pairs, mean logger bias <=0.75°F, MAE <=1°F, 95th percentile absolute difference <=2°F, half-to-half bias drift <=0.75°F, and zero invalid/duplicate/conflicting input rows. These thresholds are **conservative trial screening criteria**, not manufacturer specifications, a standard-accuracy assertion or a prediction performance claim.

```bash
python3 scripts/shorefeel-field-preflight.py \
  --manifest /private/shorefeel/bench-manifest.json \
  --first-csv /private/shorefeel/logger-a.csv \
  --second-csv /private/shorefeel/logger-b.csv \
  > /private/shorefeel/bench-audit.json
```

Even `BENCH_AGREEMENT_FOR_REVIEW` returns `deploymentApproved:false`, `absoluteAccuracyCertified:false`, `fieldSitingVerified:false`, `landManagerPermissionVerified:false`, `publicationAuthorized:false`. It demonstrates relative agreement under an intentionally shared exposure only.

### Prospective NWS baseline capture

`scripts/shorefeel-nws-forecast-capture.py` queries official NWS `/points` metadata and its hourly forecast, then records a snapshot for two **public research grid reference coordinates**, about 0.4 km and 15.5 km inland, respectively. They are not a quarter-mile weather experiment, not actual field loggers and not the precise user's home. The data is gridded, not an observation.

It always stores the actual grid identity, provider-generated metadata timestamp, source SHA-256 digest, valid hours and **the UTC time the forecast was successfully received**. That receipt time is a deliberately conservative source-availability bound when the forecast may have been generated earlier; it is never backdated. Forecast periods that had already started before the response arrived are excluded. Archived bytes and metadata can be supplemented with versioned original source responses if independent reproducibility is needed. No model candidate, site observations or event ID are invented.

```bash
python3 scripts/shorefeel-nws-forecast-capture.py \
  --output /private/shorefeel/nws-issued-2026-11-21T1500Z.json
```

The output file is created exactly once and cannot be overwritten. Do not put real field records under `public/`, `data/` or the GitHub repository. One CI source audit captures a snapshot as a temporary GitHub artifact and **does not** turn on a scheduled weather harvester. Revisit cadence only after logger deployments are genuinely authorized.

NWS API documentation: https://www.weather.gov/documentation/services-web-api and https://weather-gov.github.io/api/gridpoints .

### First deployment day

1. Obtain **documented** permission for both sites, site map, owner contacts, mounting plans and dates. Weatherproof the instruments without blocking solar radiation shielding ventilation.
2. Complete side-by-side 24h bench test, check clocks, serials, shields, battery and calibration records; separately verify absolute reference accuracy. Keep an untouched copy of raw CSVs and hashes.
3. Install on the authorized shoreline and inland site at verified heights/exposures, and inspect for direct sun, buildings, precipitation infiltration, obstruction and tampering. Measure actual distance to shore and each site. Use private files for exact location.
4. Collect every 5 minutes, no interpolated missing records; note maintenance moves and exposure changes. Archive upstream NWS forecast snapshots **prospectively**, not by later API fetch.
5. After a sufficient range of wind events, run `shorefeel-field-pair.py` and `shorefeel-field-context.py` and the locked event holdout. Compare to contemporaneous NWS baseline on **the same cases**. Public model promotion requires independent human verification and measured out-of-time accuracy gain.

## Verification, rollback, blockers

```bash
python3 -m unittest discover -s tests -p 'test_shorefeel_*.py' -v
npm run verify:all
```

The dedicated research workflow replays both the synthetic bench checks and live source query to NOAA/NWS. A green test of NWS *source access* does **not** prove any station is installed or beach forecasting skill. No new Vercel cost or production route. Rollback is reverting this research-only branch.

**Next external blocker:** actual instrument access and written site permission. Do not represent this as complete; humans must authorize land use, calibrate and place equipment, and verify collected field data.
