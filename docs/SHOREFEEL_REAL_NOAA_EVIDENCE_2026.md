# ShoreFeel: real NOAA historical data, three-date Saginaw Bay research pull

**Retrieved UTC:** 2026-11-21 using GitHub Actions, pinned ecCodes 2.50.1. **Scope:** three selected historical 12 UTC cycles only. All temperature contrasts below are **between archived NOAA model-grid samples**, never measured air at the beach or a calibrated `Shore Feel` forecast. This archive does not change the live visitor answer.

## The actual sampled results

Both points use the same latitude 43.6714 N. The park-area **NWS land reference** is 83.9120 W, about 419 meters inland from the Bay City State Park waterline reference. The independent inland reference is 84.1000 W, about 15.5 km west of the waterline. Neither location is a 2-meter temperature logger at the water's edge. Model points are nearest grid cells up to 1.3 km from their stated targets in this sample.

| Historical date | Dataset and valid UTC | Park-area grid air | West Bay County grid air | Park minus inland | Park-area 10-m wind |
| --- | --- | ---: | ---: | ---: | --- |
| 2026-07-15 | HRRR f01, 13:00 UTC | 76.62 F | 77.97 F | -1.35 F | 2.30 m/s from 296 deg |
| 2026-07-15 | URMA analysis, 12:00 UTC | 75.06 F | 75.24 F | -0.18 F | 2.44 m/s from 277 deg |
| 2026-09-20 | HRRR f01, 13:00 UTC | 64.43 F | 61.28 F | +3.15 F | 6.21 m/s from 26 deg |
| 2026-09-20 | URMA analysis, 12:00 UTC | 61.75 F | 60.46 F | +1.29 F | 4.01 m/s from 28 deg |
| 2026-11-19 | HRRR f01, 13:00 UTC | 43.20 F | 42.75 F | +0.45 F | 4.91 m/s from 200 deg |
| 2026-11-19 | URMA analysis, 12:00 UTC | 43.81 F | 43.20 F | +0.61 F | 4.78 m/s from 196 deg |

The July morning park-grid contrast is slightly negative; September and November are positive in the selected hours. This is **six samples**, and the HRRR and URMA columns have **different valid times**. The table does **not** establish model accuracy, typical gradients, lake-breeze climatology or whether the beach feels 3 F warmer.

## Source accountability and sample quality

- HRRR official public archive: `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.YYYYMMDD/conus/hrrr.t12z.wrfsfcf01.grib2`. Forecast initialized at the 12 UTC model cycle and valid at 13 UTC; the exact archive publication time is not established by this sample. 3-km class model, 2-meter temperature and 10-meter winds.
- URMA official public archive: `https://noaa-urma-pds.s3.amazonaws.com/urma2p5.YYYYMMDD/urma2p5.t12z.2dvaranl_ndfd.grb2_wexp`. Analysis valid 12 UTC, not a real-time forecast. 2.5-km class gridded analysis.
- The bounded retrieval reads original NOAA `.idx` files, validates strict ordered GRIB message offsets and cycle metadata, then fetches *only* the 2-meter temperature and 10-meter U/V wind GRIB fields via HTTP Range requests. Each field has its own SHA-256, plus index SHA-256 and a digest over the three selected fields. **No full-GRIB-file checksum is claimed.**
- Actual 2-meter grid air values come from ecCodes-decoded NOAA GRIB messages. All three dates yielded four accepted site/product records each, with no rejected or conflicting revisions. The JSON includes exact archive URL, UTC clock, forecast lead, nearest gridpoint latitude/longitude and distance, wind source direction and field hashes.
- NDBC Saginaw Bay Light #1 (SBLM4) in the 2026-11-21 pull reported wind records (most recently 03:00 UTC) but the air temperature field was missing in the available realtime dataset. NDBC buoy 45163 returned a source-unavailable HTTP response during the run. **Neither was used as a beach air thermometer, and there is no invented backup air reading.**
- NOAA open-data attribution: National Oceanic and Atmospheric Administration, NCEP and NDBC. No NOAA endorsement implied. Data references: https://registry.opendata.aws/noaa-hrrr-pds/ and https://registry.opendata.aws/noaa-rtma/.

## Versioned evidence files

- `research/shorefeel/noaa/2026-07-15-12z.json`
- `research/shorefeel/noaa/2026-09-20-12z.json`
- `research/shorefeel/noaa/2026-11-19-12z.json`

Each file is a historical research snapshot, not a continuously updating, live, or personalized source. Original source bytes and checksums can be independently fetched from NOAA. These files are not placed in `public/` and do not feed the live ShoreFeel API.

## Reproduce

On a research workstation with internet, Python 3.11 and ecCodes Python 2.50.1:

```sh
python3 -m pip install eccodes==2.50.1
python3 -m unittest discover -s tests -p 'test_shorefeel_noaa_pull.py' -v
python3 -m unittest discover -s tests -p 'test_shorefeel_real_snapshots.py' -v
python3 scripts/shorefeel-pull-noaa-research.py --date 20260715 --cycle 12 --lead 1
python3 scripts/shorefeel-pull-noaa-research.py --date 20260920 --cycle 12 --lead 1
python3 scripts/shorefeel-pull-noaa-research.py --date 20261119 --cycle 12 --lead 1
```

GitHub workflow `.github/workflows/shorefeel-noaa-real-data.yml` runs this actual extraction, performs source QA, and retains full machine-readable evidence artifacts for 30 days. The committed versions survive artifact expiry. Revisions can change if NOAA corrects archived analysis products. Never overwrite a checked historical sample silently.

## Before promoting a beach-specific air estimate

1. Collect independent and **verified** nearshore and inland shielded air thermometer records with timestamps, station metadata, calibration, exposure and site permission. No beach air logger has been verified by this research.
2. Acquire multiple timed HRRR forecast issues, relevant local NWS baseline forecasts and paired field observations across onshore, offshore, lake-breeze transitions, fronts and summer afternoons. Three isolated cycles are not training or calibration data.
3. Apply the event-blocked holdout in `lib/shorefeel/field-validation.js` and compare paired forecasts to **actual observed beach temperatures**, reporting errors by wind sector and event.
4. If and only if robust independently verified field skill improves on NWS, evaluate a clearly labeled site-specific estimate with error and hard unavailable fallback. Until then retain the forecast-based Shore Feel answer.

**Rollback:** revert the research PR; no visitor-facing code, AdSense, map, identity, canonical, runtime NOAA dependency, Redis, scheduled job or sensor installation is introduced.
