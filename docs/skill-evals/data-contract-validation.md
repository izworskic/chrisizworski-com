# Skill evaluation: data-contract-validation

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| NOAA feed schema changed | yes |
| AIS duplicate records | yes |
| ski missing report | yes |
| API validation | yes |
| source units changed | yes |
| stale timestamps | yes |
| unknown upstream fields | yes |
| invalid station ID | yes |
| feed conflict | yes |
| version JSON contract | yes |
| change CSS | no |
| add photo | no |
| update title | no |
| install Ajv | no |
| fix zoom gesture | no |
| rewrite copy | no |
| show static map | no |
| add ad | no |
| review hero | no |
| run lighthouse | no |

## Paired task and assertions

Ski: reject malformed timestamp, preserve unknown vs closed, distinguish stale from current, preserve valid records; no invented values or network retry storm.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
