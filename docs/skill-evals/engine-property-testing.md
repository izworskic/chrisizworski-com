# Skill evaluation: engine-property-testing

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| test weird beach temperatures | yes |
| fuzz API | yes |
| test rollover | yes |
| random invalid inputs | yes |
| heading edge cases | yes |
| test numerical invariants | yes |
| latitude boundary tests | yes |
| unit conversion testing | yes |
| shrink failing input | yes |
| generate API edge cases | yes |
| fix title | no |
| normal screenshot | no |
| rewrite copy | no |
| run existing tests only | no |
| install fast-check | no |
| add marker | no |
| change ad | no |
| review photo | no |
| change typography | no |
| add link | no |

## Paired task and assertions

Shore Feel: write seeded properties for finite/range behavior and explicit missing data; include counterexamples, no formula assumptions, no live writes.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
