# Skill evaluation: geospatial-intelligence

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| snowmobile town near trail | yes |
| find nearest public launch | yes |
| map corridor analysis | yes |
| trail proximity | yes |
| fix spatial boundary | yes |
| scale beach map | yes |
| calculate along river distance | yes |
| map large geometry | yes |
| tile archive evaluation | yes |
| spatial joins | yes |
| map zoom gesture only | no |
| change marker color | no |
| rewrite text | no |
| add ads | no |
| install MapLibre | no |
| update title | no |
| fix schema | no |
| change chart | no |
| show a photo | no |
| repair CSS | no |

## Paired task and assertions

Snowmobile: validate CRS, distance units, geometry and border cases; proximity is not legal access; compare existing JS before adding a library.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
