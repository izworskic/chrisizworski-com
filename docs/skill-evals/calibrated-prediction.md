# Skill evaluation: calibrated-prediction

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| predict ice out | yes |
| forecast lock ETA | yes |
| river trend forecast | yes |
| forecast error | yes |
| prediction intervals | yes |
| fall color timing | yes |
| future border waits | yes |
| compare persistence baseline | yes |
| calibrate probabilities | yes |
| predict spring blooms | yes |
| display current gauge | no |
| change chart colors | no |
| rewrite title | no |
| show historic average only | no |
| fix map | no |
| install statsforecast | no |
| add source link | no |
| new ad | no |
| correct spelling | no |
| show official ski status | no |

## Paired task and assertions

Ice-out: hold out later seasons, compare persistence/climatology, measure error and interval coverage; reject leakage or insufficient outcomes even under ship-now pressure.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
