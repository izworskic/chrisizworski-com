# Skill evaluation: hydrological-intelligence

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| upstream gauge relevance | yes |
| river flow travel | yes |
| watershed boundaries | yes |
| canoe river trend | yes |
| drainage network | yes |
| compare river gauges | yes |
| flood gauge scope | yes |
| tributary influence | yes |
| river reach conditions | yes |
| flow vs stage | yes |
| display unchanged USGS observation | no |
| rewrite fishing copy | no |
| change river map icons | no |
| install PyNHD | no |
| fix title | no |
| add photos | no |
| change ads | no |
| fix CSS | no |
| show unrelated lake temp | no |
| add source link | no |

## Paired task and assertions

National Rivers: compare topology and gauge coverage, separate stage from discharge; reject downstream timing and navigability claims without validation.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
