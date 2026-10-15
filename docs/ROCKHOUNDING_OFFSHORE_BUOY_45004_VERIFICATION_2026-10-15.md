# Michigan Rockhounding — independent offshore NOAA wave verification

**Date: October 15, 2026. Status: verified first real date-matched offshore observations; NOT a shoreline or agate-finding forecast.**

## The critical distinction

The Grand Marais rockhounding engine samples provisional north-of-Agate model cells. NOAA NDBC **45004 (East Superior)** is approximately 111 km offshore from Grand Marais. The buoy cannot independently validate waves at Agate Beach. Instead, the verification engine selects a **different Great Lakes model cell near the buoy itself** and compares *that* model significant-wave height with *real buoy-recorded* significant-wave heights on identical dates.

- Actual buoy station: **45004**, approximate official coordinates **47.583 N, -86.586 W**.
- Original observations: https://www.ndbc.noaa.gov/data/realtime2/45004.txt (field `WVHT`, meters; `MM` missing).
- NOAA model source: https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu, Great Lakes **2.5 km** regional `glwu.grlc_2p5km_sr.t12z.grib2` and `HTSGW` (combined significant wave height in meters).
- Decoded model cell actually selected: **47.578791 N, -86.573970 W**, **1.016 km** from buoy 45004. The sampler rejects 9999/masked cells and any candidate farther than 5 km. The model is a grid estimate, not a wave instrument.
- First source run: [GitHub Action #38815145941](https://github.com/izworskic/chrisizworski-com/actions/runs/38815145941).
- Integrated source/archive run: [GitHub Action #38815371040](https://github.com/izworskic/chrisizworski-com/actions/runs/38815371040).

## Real observed comparison — first run

Original **October 15, 2026, 12Z model issue**: the GRIB2 file returned **49 modeled wave-height timestamps**. At evaluation, the NDBC observation stream provided **nine usable one-to-one pairs** at model forecast leads **1 through 9 hours**. Matched buoy timestamps differ from model valid hours by at most **30 minutes**, without interpolation or substituted zeroes.

| Real validation quantity | First-cycle result |
| --- | ---: |
| Forecast/observed matched pairs | **9** |
| Mean absolute error | **0.1022 m** |
| Root mean square error | **0.1136 m** |
| Mean bias (model minus buoy) | **+0.0089 m** |

Sample positive and negative errors both occur; the aggregate masks day/lead effects. The later integrated run, also storing a genuine NOAA **20Z** model issue, initially counted 11 candidates from two issues, but the **corrected latest-issued-per-valid-hour report has 10 unique matched observations** from the same calendar day, with **MAE 0.1100 m, RMSE 0.1211 m and bias +0.0260 m**. Source cycle count 2, independent observed dates 1; no calibrated seasonal model skill. Neither result is a meaningful *seasonal* model skill estimate, much less a shoreline prediction.

## Honest matching and leakage prevention

- Reads **original NOAA issue times** and each forecast's **valid UTC time**. Forecast valid hours in the future of the evaluation timestamp are never scored.
- Compares only **`MODEL_FORECAST`** lead times 1–24 hours; never scores the lead-zero model initial state as a buoy observation.
- Parses **actual NDBC `WVHT`**; missing values, malformed dates, readings outside ±30 minutes and observations earlier than the model issue are not matched. A source failure produces zero matched observations, not reassuring zero wave height.
- Each observed wave report can be used **at most once**. When multiple NOAA issue cycles predict one valid UTC hour, selects the **latest nominal issue** for that hour so multiple forecasts do not independently count the same wave reading. Model nominal issue UTC does not prove real-time publication latency.
- Calculates MAE, RMSE and signed bias only on paired significant heights from **the same nearby model-cell location**. If the model shifts to multiple different grid cells, aggregation fails closed.
- Reports separate **source issue counts, distinct observed UTC dates and sufficiency flags**. A sample of 11 pairs from one day never demonstrates accuracy over other wind directions, storms or seasons.
- Uses the non-Amazon, public NOAA/NDBC source feeds with **no API keys, no municipality contact and no onsite visit**.
- **Never** claims safe conditions, newly exposed rocks, harbor surf or a trustworthy post-storm collecting window.

## Code and data

Source code on research PR #1001:
- `scripts/rockhounding/capture-buoy45004-model.py` — single bounded 2.5 km NOAA GRIB subset at buoy position; ecCodes decoding, valid wet-cell proof.
- `lib/rockhounding/buoy-model-verification.cjs` — strict source validation, independent NDBC matching, error diagnostics, duplicate avoidance and 21-day issue retention.
- `scripts/rockhounding/verify-buoy45004-model.cjs` — atomic JSON ledger/report writer.
- `tests/rockhounding-buoy-model-verification.test.js`, `tests/test_rockhounding_buoy_model.py` — source/geometry/tolerance/issue-time/sufficiency checks.
- `.github/workflows/rockhounding-buoy-verification.yml` — successful one-time independent check.
- `.github/workflows/rockhounding-issued-archive.yml` — captures BOTH the Grand Marais research point and independently collocated buoy sample into a **separate research-data branch** with at least a 12-second gap between GRIB requests.

Persistent research records on `research/rockhounding-wave-data`:
- `data/rockhounding/buoy45004-issued-model-ledger.json`
- `data/rockhounding/buoy45004-verified-offshore-report.json`
- `data/rockhounding/issued-cycle-ledger.json` (separate Agate North source).

GitHub's scheduled six-hour workflow is **not automatically active** while this feature remains in draft PR #1001; only branch-push test runs have executed. Avoid conflating the existence of a cron expression with active harvest.

## Scientific go/no-go before productizing

1. Continue collecting data over **multiple distinct weather systems/dates**, not just overlapping hours from October 15.
2. Inspect lead-time and storm-strength calibration separately; include missing NDBC periods and publication delays. More daily matched hours do not substitute for independent events.
3. Remote GIS validation of Agate open-water exposure, water-body connectivity and outward shoreline normal.
4. Independently resolve the protected harbor/breakwater and posted shoreline access/collection rules.
5. Only after these gates can the public tool provide **evidence-backed disturbance and settling context**. It must not claim a validated probability of freshly exposed agates or safe waves until independent shoreline labels and hazards are established.

**Next single engineering priority:** broaden the actual independent buoy comparison to multiple storm days and lead-time buckets; keep the Agate/harbor shoreline validity gates locked.
