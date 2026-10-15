# NOAA offshore wave-skill slices and previous-day backfill — October 15, 2026

## Outcome: two authentic dates; no rockhounding forecast claim

On **October 15, 2026**, a GitHub Actions runner fetched one authentic **October 14 12Z** NOAA Great Lakes 2.5km model file for the **same actual offshore NDBC 45004 model cell** (47.578791, -86.573970, 1.016 km from the buoy). The model issue was archived alongside the October 15 12Z and 20Z source issues. Original observed wave heights came from **NOAA buoy 45004**, field `WVHT`, and were matched at ±30 minutes with *no* interpolated observation, zero substitution, future leakage or reuse of the same buoy measurement.

The result is an **independent buoy-versus-model offshore verification**, not a prediction of the waves at Agate Beach or in the sheltered Grand Marais harbor. It is separate from the real rockhounding engine's unverified northern Agate study cell.

- Live authentic backfill: [GitHub Actions run #38817420954](https://github.com/izworskic/chrisizworski-com/actions/runs/38817420954).
- Corrected source and full focused test: [GitHub Actions run #38817566664](https://github.com/izworskic/chrisizworski-com/actions/runs/38817566664).
- Research-data branch: [research/rockhounding-wave-data](https://github.com/izworskic/chrisizworski-com/tree/research/rockhounding-wave-data), specifically `data/rockhounding/buoy45004-issued-model-ledger.json` and `data/rockhounding/buoy45004-verified-offshore-report.json`.

## Actual updated data snapshot

| Independent offshore metric | October 15 research report |
| --- | ---: |
| Original GLWU issue cycles | 3 |
| Distinct UTC observation days | **2** (October 14–15) |
| Valid one-to-one buoy observations matched | **34** |
| Overall mean absolute error | **0.0576 m** |
| Overall root-mean-square error | **0.0755 m** |
| Signed mean error (model less buoy) | **+0.0112 m** |
| Identified measured elevated-wave episodes | **1** |
| Sufficient for multi-storm model skill? | **NO** |

The numbers are descriptive for the sampled forecasts and dates. They do **not** imply equivalent accuracy during other Great Lakes storms, nor validate shoreline wave exposure, legal collection, beach hazards, changes in rock placement or actual agate finds.

## Error breakdowns — actual observed buoy waves

The new `lib/rockhounding/offshore-skill-slices.cjs` reports separate descriptive bins. Lead-time ranges are **inclusive** at 6, 12, and 24h; missing hours do not move into the wrong bin. Buckets with fewer than 5 distinct matched observations show sample count but **no MAE, RMSE or bias**.

| Forecast lead | Matched independent buoy readings | Offshore MAE |
| --- | ---: | ---: |
| 1–6 hours | 14 | 0.0807 m |
| 7–12 hours | 8 | 0.0563 m |
| 13–24 hours | 12 | 0.0317 m |

Do not claim longer leads are more accurate. **Lead-hour buckets sample different sea states and time windows**; there are not enough repeated independent weather events to make a causal or reliable skill comparison.

| Observed buoy significant wave height | Matched readings | Offshore MAE |
| --- | ---: | ---: |
| Under 0.5 m | 11 | 0.0482 m |
| 0.5 to under 1.0 m | 17 | 0.0718 m |
| At least 1.0 m | 6 | 0.0350 m |

The 1.0 m boundary is a **descriptive research bin**, **not** an NWS storm warning threshold or beach safety threshold. Six high-wave matches from **one** October 14 disturbance count as **one correlated episode**, not six storms.

## Code and provenance protections

- `lib/rockhounding/offshore-skill-slices.cjs`: independently validates real NDBC-model paired rows and groups by **forecast lead, independently observed wave height, distinct UTC observation day and elevated-wave episode**. Elevated episodes are separated by more than 48h; at least 5 actual high-wave matches are required to consider a distinct episode adequately sampled. Never equate an hourly run of measurements to separate storms.
- `lib/rockhounding/buoy-model-verification.cjs`: uses all pairs to compute stratification even when its lightweight rendered `matches` preview is capped at 200. Keeps original latest-nominal-issue-per-valid-hour comparison, paired observation uniqueness, forecast-vs-buoy source provenance and absolute errors.
- `tests/rockhounding-offshore-skill-slices.test.js`: seven tests for inclusive hour bins, actual observed-wave classifications, correlated events, duplicate/falsified data rejection, suppressed thin buckets, signed-bias/MAE calculations and strict no-visitor-verdict output.
- `.github/workflows/rockhounding-multi-day-skill.yml`: manual/research branch-only one previous-day source backfill, no scheduled extra NOAA polling. It fails closed with an explicit unavailable-source notice if NOMADS has already discarded the issue; **a missing old forecast must never be reconstructed from a later model run.**
- Operational NOAA Great Lakes source typically retains the present and previous day, so September/earlier October issued forecasts cannot be confidently recreated from the live NOMADS server. Historical measured buoy readings alone are insufficient for issued-model skill estimates. Official NOAA source: https://polar.ncep.noaa.gov/waves/download2.shtml .

## Release status and next physical-science gate

[PR #1001](https://github.com/izworskic/chrisizworski-com/pull/1001) was successfully merged to main first. Its 6-hour NOAA source/archive workflow is now present in the **default branch**, enabling GitHub's normal scheduled operation; actual future executions and continuous historical coverage remain to be observed. This follow-on stratified-source change should also be merged after tests.

**Next focused priority:** remote GIS validation of the *physical lakeward exposure and true beach orientation* at Agate Beach, then separate protected-harbor geometry for Bayshore Park. While waiting for NOAA to accumulate 3+ independent elevated-wave events, those geographic gates are a more useful blocker to clear than fitting a premature probability-of-agates score.

No town emails, site visit, API keys or paid data were required.
