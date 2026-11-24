# Great Lakes route-progress mathematical challenger

Development-only follow-on to #1936. No production forecast change, additional API, paid service, recurring workflow, agency request or new runtime dependency.

## Development evidence before choosing model

The fixed three-date retrospective study (September 4, 10, 15 2024, UTC) produced 28 Soo proxy crossings, 9 paired estimates, 16 model abstentions, 2 discontinuities and 1 missing issue. September 10 and 15 jobs [45501320333](https://github.com/izworskic/chrisizworski-com/actions/runs/45501320333) both passed. All three dates have zero retained Duluth model-reference crossings; the same nine opposite-side encounters were rejected outside that corridor, whereas nine provisional physical bridge-reference candidates were retained. This is an unresolved model target/geometry problem, not evidence of no traffic. Do not widen the corridor to manufacture labels, tune a Duluth ETA or silently use a different outcome. Separate future route/target reconciliation is needed.

| Date | Soo candidates | Scored | Current model MAE bounds (min) | Same-distance constant speed MAE bounds (min) | Fully contained |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sep 4 | 9 | 5 | 16.29–18.53 | 17.36–19.59 | 1/5 |
| Sep 10 | 7 | 2 | 14.95–17.21 | 15.52–17.78 | 0/2 |
| Sep 15 | 12 | 2 | 2.95–3.84 | 12.75–13.90 | 2/2 |

September 10 range receipt e632291a71084040c1397d1f3f1c4b05ba70f896a90c93df000002af8e7ba828, input d5aad68826e65fb9dc5f4721fbcb6afdbb544215107c151e6714bfeda1553fce, artifact 14969693503. September 15 range receipt 529527d34bd92c9f16a584ad1a8281aac5e2181b8bd16e66366892e5e316d0b7, input bb296521c70bf6f514965fcc8da6ae1c80521e4727a565aaf97a454f57f55fbb, artifact 14971212547. Conditional sample too small to fit many parameters. Do not claim operational accuracy.

## Prespecified challenger

Keep existing observation-time issue selection and outcome definitions. Existing engine must first emit a matching-direction forecast. Project the preceding 12 minutes of observations onto its existing upper or lower-upbound route; require >=4 fixes spanning >=6 minutes, no conflict, >5 minute gap, >0.8 NM lateral deviation, reversal beyond 0.03 NM, implausible >25 knot progress or route projection jump. Derive median along-route speed; require >=0.8 knots and agreement with reported issue SOG (0.5–1.25 times). Abstain for recent stopped/low-progress behavior, not an invented queue delay. Blend median progress and reported SOG equally for cruise; use existing one-NM/2.5-knot approach policy capped by cruise and, if >=2 observed near-approach intervals, median near progress. Conservative pilot assumptions, not fitted parameters. Same source inputs only, no later fixes, no destination, no inferred receive time, no use of outcome direction as predictor. No expansion to Duluth until its reference feasibility is resolved.

Compare current, constant-speed and challenger on the exact same paired subset. Count every challenger abstention. Exact paired difference bounds for absolute errors evaluate the common bracket endpoints and interior predictions; negative favors challenger. Recenter existing window for comparison without tuning its width; collect anonymous signed residual bounds for later uncertainty work. No independent labels; no operational accuracy or release authorization. Holdout remains blocked in executable pilot. First run on three development dates only. Do not choose a winner based on an unrepresentative matched subset or tune on holdout. Need adequate sample, coverage/abstention guardrails, uncertainty validation and public-use rights before release.

```
node --test tests/great-lakes-route-progress-challenger.test.js
node scripts/retrospect-great-lakes-reference.cjs /private/observations.json /private/report.json --route-progress-challenger
```

Default retrospective output unchanged; opt-in aggregate-only report. No raw tracks or identifiers committed. CI and real challenger execution pending.
