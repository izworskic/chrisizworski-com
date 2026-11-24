# Skill evaluation: journey-optimization

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| plan circle tour in 3 days | yes |
| fit stops before dark | yes |
| optimize road trip | yes |
| choose stops with opening hours | yes |
| plan Mackinac day | yes |
| route alternatives | yes |
| minimize driving | yes |
| daylight itinerary | yes |
| visitor time budget | yes |
| route feasibility | yes |
| list attractions | no |
| rewrite park copy | no |
| change map colors | no |
| install OR-Tools | no |
| display ferry schedule unchanged | no |
| new title | no |
| fix ads | no |
| chart ice | no |
| add photo | no |
| link existing guide | no |

## Paired task and assertions

Circle Tour: use verified roads, hours, daylight and visit times, compare simple heuristic; never fabricate routing or open gates; return infeasible and alternatives.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
