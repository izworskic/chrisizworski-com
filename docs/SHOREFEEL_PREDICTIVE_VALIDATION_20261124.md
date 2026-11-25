# ShoreFeel predictive validation intelligence

2026-11-24. Product Engineering OS candidate, existing offshore-water forecast pilot. Base 27823bd7dac42efad8489894262263787ebc447d. Existing source ownership, forecast algorithm and release gates remain authoritative. Not a new runtime or activated skill.

## Baseline evidence actually available

The committed September 1 to October 13 2026 backtest JSON reports results from four NDBC buoys. Recomputed arithmetic from that summary, not a rerun of the original forecasts:

| Lead | Reported pairs | Persistence MAE (F) | Model-change MAE (F) | Relative reduction |
| --- | ---: | ---: | ---: | ---: |
| 24 h | 115 | 1.45 | 1.31 | 9.655% |
| 48 h | 110 | 2.19 | 1.87 | 14.612% |

Reported 24-hour watch contingency counts: 7 true positives, 15 false positives, 0 false negatives, 93 true negatives. The small historical sample does not establish future recall or beach-level probability. Sharp tier: 5 observed drops among 10 flagged. No raw issue/outcome pairs or verified independent later holdout located in inspected repository paths. Bias, empirical interval coverage, seasonal transfer, shore-side skill and statistical significance remain unmeasured. No new coefficient, threshold, uncertainty multiplier or forecast level is promoted. Existing watch copy now uses the historical offshore counts instead of "never missed" or "likely" claims.

## Reproducible offline evaluator

Use the existing Node test/runtime stack: an offline JSON evaluator and fixture tests require no dependency, Python service or online learning. Python batch decoding remains appropriate for actual NOAA archive extraction when files are obtained; do not duplicate the existing hindcast/field-pair tools, which evaluate a different target (nearshore air).

Run:
```
node scripts/shorefeel-predictive-validation.cjs --summary data/shorefeel/backtest-2026-10.json
node scripts/shorefeel-predictive-validation.cjs --holdout /local/reviewed-cohort.json
node --test tests/shorefeel-predictive-validation.test.js tests/shorefeel-beach-forecast.test.js
```

Freeze the prospective holdout cohort before collecting outcomes; retain the sorted slot SHA-256 and original input file. Schema version 1, kind synthetic or historical-review, explicit holdoutStartsAt, holdoutEndsAt, asOf, cohort [{station,issuedAt}], forecasts and observations arrays. Allowed stations are the four in the original study. UTC hour-aligned issue slots, both 24/48 h horizons expected for every slot. Holdout starts after October 13; audit after all horizons mature. Forecast records include station, issuedAt (time the forecast was available to the comparison), availableAt (archived model publication availability), modelCycleAt, validAt, leadHours, baselineObservedAt, baselineAvailableAt, baselineF, modelChangeF, modelChangeEstimateF, lowF, highF, forecastSha256, baselineSha256, forecastUrl, baselineUrl. Observations include station, observedAt, availableAt, tempF, quality accepted, kind ndbc-buoy-observation, sha256, sourceUrl. Require same station and exact valid time; no nearest-time outcome substitution. Baseline may be up to six hours old but must have been available at issue time; 24-hour cooling counts require an exact issue-time baseline, otherwise exclude and count it. Never use a retrospective analysis as an earlier forecast.

Both alternatives score the identical paired set. Report expected/matched/missing counts by horizon, rejected records, conflicting revisions, MAE, bias (prediction minus actual), empirical range coverage and width, station breakdown, and cooling confusion counts. Hashes and timestamps are supplied provenance, not authenticated by this script. A source reviewer must confirm actual archived bytes, original issue/publication and observation history, station identity, extraction and interval construction before calling historical results independent. No automatic promotion even if all rows pass. Synthetic records are always labeled synthetic, no proof of prediction skill. Dependence between overlapping windows and nearby buoys prevents naive independent-sample confidence intervals.

## Release

Existing npm test includes the added test automatically. Existing ShoreFeel browser/source checks and full CI still required. No new production route, paid service, forecast request, archive download, scheduler, dependency, storage or notification. No change to existing forecast formula, numerical widths, source attribution, canonical or ads. Exact-head CI and browser results not yet verified; actual independent holdout is blocked on recoverable archived pairs, not on generating synthetic examples. Next: recover archived issue files and original station observations from public NOAA sources, verify rights and availability, freeze a later cohort and run it before proposing any calibrated update.


## Empirical uncertainty calibration extension

NOAA's published retention table (https://tidesandcurrents.noaa.gov/ofs/ofs_faq.html, reviewed 2026-11-24) distinguishes regular-grid fields (3 days on CO-OPS THREDDS and AWS, no NCEI archive) from native 3D forecast fields (31 days CO-OPS, 2 months AWS) and station forecasts (31 days CO-OPS, 2 years AWS, more than 5 years NCEI). The general GLERL archive page (https://www.glerl.noaa.gov/res/Programs/ipemf/glcfs_data_access.html) and NCEI dataset C01347 identify longer archives, not proof that this engine's exact regular-grid files exist there. AWS registry: https://registry.opendata.aws/noaa-ofs/. Current-year NDBC observation files: https://www.ndbc.noaa.gov/data/l_stdmet/. Archive retention is a documented policy, not verified object coverage. Direct data retrieval in this session was unavailable (HTTP/cache access failures and local DNS failures); no real forecast/observation pairs recovered.

One-off bounded archive probe in the existing ShoreFeel research PR CI: 16 public requests, 4 concurrently, 8-second per-request timeout, max 1 MiB per body, no redirects or retries. Dates Oct 20, Nov 21 and Nov 22 fixed before inspecting values. Nine exact regular-grid .dds requests (f000/f024/f048), three native AWS prefix listings and four NDBC current-year observation files. Save JSON inventory with request URL, status, body hash, sample schema or observation-date counts. Presence of .dds is schema evidence only; native listing is not parity proof; absent or unresolved requests do not imply archive-wide missingness. The probe is branch-specific, not an ongoing scheduler, and cannot promote a model. No production request or output changes. Verify actual result artifact before declaring object coverage.

The new offline calibration evaluator consumes two separately frozen predictive-validation cohorts, schemaVersion 1 with calibration and evaluation objects as defined above. Run `node scripts/shorefeel-uncertainty-calibration.cjs /local/two-reviewed-cohorts.json`. Calibration outcomes must be available before evaluation begins, with at least 48h between the calibration issue-period end and evaluation start. For each horizon, use maxima of absolute residuals within 72-hour issue blocks (group across stations), choose finite-sample rank ceil((n+1)*0.9), round width outward to 0.1F, freeze that width before scoring the evaluation cohort. Report candidate row and block coverage, existing range coverage, widths, counts and abstention reasons. A nominal 90% research target is NOT a calibrated coverage guarantee; temporally adjacent blocks and shared meteorology can still be dependent. Predeclared research eligibility thresholds: at least 20 calibration blocks, 10 evaluation blocks, 80% matched expected slots in both, at least 3 stations in each. These are conservative research assumptions, not scientifically optimized policy. Synthetic fixtures only validate arithmetic; source authentication and independent spatial/temporal review remain mandatory even for a historical-review label. Every result has canPromoteModel false. No coefficient, interval width or live forecast model changed.

Native archive recovery path: establish wet-cell geometry and native-to-regular-grid extraction parity using overlapping archived issues before interpreting longer-native-archive residuals as validation of the existing model. Do not treat f000 analyses or subsequent forecasts as prior issued forecasts. If exact model identity, publication time or independent outcome coverage cannot be reconstructed, leave calibration blocked rather than tune on the original aggregate report. No new paid infrastructure, provider, database, build pipeline, push notification or automatic capture job. Exact-head full CI, browser checks and real probe results remain pending at this commit.
