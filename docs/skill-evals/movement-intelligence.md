# Skill evaluation: movement-intelligence

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| freighter arrival | yes |
| ship heading backwards | yes |
| AIS corridor progress | yes |
| vessel stops | yes |
| shipwatch arrival window | yes |
| track movement | yes |
| lock queue travel time | yes |
| vessel path snapping | yes |
| ship turnaround detection | yes |
| stale AIS position | yes |
| ship icon styling only | no |
| port history | no |
| static bridge map | no |
| rewrite vessel bio | no |
| add ad | no |
| chart snow | no |
| boat launch pin | no |
| install MovingPandas | no |
| fix sitemap | no |
| change title | no |

## Paired task and assertions

Cuyahoga: irregular timestamps, duplicate fixes, reverse heading and stale position; abstain from ETA without reliable history and route direction; preserve measured fixes.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
