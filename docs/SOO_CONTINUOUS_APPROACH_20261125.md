# Soo continuous approach intelligence: development replay

Follow-up to #1972. Existing first-issue study clustered 29/30 issues at 10 to 15 nautical miles and no modeled lead under 60 minutes. Avoid another fitted correction. Measure the unchanged production model as a ship approaches the locks using original NOAA AIS archive run 45390603940, artifact 14917313872, three spent dates June 15, August 15, October 15 2025. NOAA Nationwide AIS 2025, CC0 public domain dedication; observed AIS positions are not verified official lock events or complete vessel coverage. Reconcile source digests, regional fix/vessel counts and initial issued/matched cohort to #1972. No new nationwide archive downloads.

## Fixed episode and evaluation contract

- Exactly the original first eligible 15-minute UTC issue for each vessel-day, one episode, no outcome requirement. Every five-minute UTC tick from that issue until eight hours or UTC day end, whichever comes first. Only observations at or before tick, at most five minutes old. No future termination. Once an actual strict chamber-rectangle fix becomes known by tick, stop issuing for that episode and retain remaining ticks as after-observed-chamber. This is not official passage completion.
- Existing geometric side and route projection, <=0.8 NM lateral, other lower-route ambiguity rejected, rounded to 0.1 NM for consistency with initial engine. Distance strata (10,15], (5,10], (3,5], (1,3], [0,1] NM. These are observed position bands, not interpolated threshold-crossing times. Count fresh band opportunities even if no candidate; unknown stale/off-route bands remain unbanded. No assumed location for missing data.
- Unchanged existing model, confidence >=0.52, direction consistent, no cached forecasts. Count missing motion, low speed, model abstention, other route/side, stale, after-observed-chamber, forecast available, withdrawals/resumptions and revisions. Withdrawals may reflect actual observed chamber arrival rather than failure. The past-only motion diagnostic is descriptive and not a new predictor.
- Score available ticks only on same initial strict chamber bracket and at or before its prior outside observation. Compare unchanged model to same-distance constant-speed baseline; mean absolute error, signed error, width, full containment, warning time. Average within each vessel-day and band then across episodes, not treating repeated observations as independent. Separate all fixed-grid opportunity/availability counts (including post-observation ticks) from matched pre-bracket error. Unresolved outcomes not false positives or imputed failures. No probability, no future labels used for selection, no parameter tuning.
- Record per-band and per-direction opportunity, available forecasts, matched episodes and updates. No release threshold or production calibration claim; this descriptive study diagnoses whether sufficient coverage exists for a later prespecified independent study. Prioritize coverage and visitor decision value; no extrapolation to other ports or short lead without matched evidence.

## Execution

Reuse Node and existing geometry rather than new Python or request-time service. Original artifact available for five days; one branch-only Actions run, no recurring work or new dependencies. Normal runner quota applies. Tests before artifact reuse, aggregate-only result. No public assets, APIs, ads, canonical URLs or ETA behavior changed. Exclude temporary execution workflow from durable integration. Full repository gates after consolidating stacked branches; no merge authorization. Rollback discard research branch. No measured search or visitor outcome.

## Actual results and next decision

Run 45612405911, job 139199042522, exact execution commit db4ac4d495cc094aed15abca1888bffdeed20468: 16/16 tests passed, original artifact reused, no nationwide downloads. Aggregate report artifact 15019849814, ZIP SHA-256 d04d174e1c3028b272901259c622f3b51f9ac865c8b20bfcc1e0310ea00fba4d. Full report preserved in data/freighter-history/soo-continuous-approach-actual-20261125.json.

30 initial episodes, 28 matched, 19,097 regional fixes, 2,598 ticks, 692 available forecasts, 1,544 post-observed-chamber ticks. 67 withdrawals and 37 resumptions; these include normal closure, not 67 forecast failures. 625 consecutive revisions, mean absolute revision 4.13 minutes. Unbanded opportunities include stale/other-side/off-route and post-closure; not part of band availability denominators.

| Distance NM | Forecast slots / band slots | Matched episodes | Existing / naive MAE min | Full containment (episode weighted) | Mean width min |
| --- | ---: | ---: | ---: | ---: | ---: |
| 10 to 15 | 176/176 | 27 | 53.51 / 69.56 | 26% | 63.88 |
| 5 to 10 | 161/162 | 28 | 49.64 / 65.53 | 18% | 43.59 |
| 3 to 5 | 102/102 | 28 | 40.73 / 55.73 | 20% | 26.25 |
| 1 to 3 | 158/174 | 28 | 33.67 / 42.50 | 19% | 20.79 |
| 0 to 1 | 95/302 | 28 | 17.53 / 17.29 | 52% | 19.64 |

Mean signed errors remain negative throughout. Within 1 NM, 203 low-speed slots and four modeled chamber presence slots account for unavailable forecasts. Even the nearest band has insufficient containment, and existing error is comparable to constant-speed baseline. Upbound 47/177 available vs downbound 48/125; conditional MAE 22.59 vs 12.48. These are observed-position bands for the selected pilot, not calibrated probabilities, confirmed waiting or official lock entry.

Decision: preserve current production model and withhold unsupported estimates. Next investigate low reported speed as observed state, duration of contiguous five-minute low-speed observations, and observed subsequent transitions; no inference of queue, lockmaster instructions or actual waiting duration from missing data. Do not assign a countdown to slow vessels. A future visitor state can distinguish reported motion from uncertain ETA, subject to actual user-facing QA. No new model fit or numeric promotion. Consolidate the completed research branches, exclude all temporary execution workflows, run full repository gates before any owner-authorized merge.
