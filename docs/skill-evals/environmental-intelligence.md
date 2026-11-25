# Skill evaluation: environmental-intelligence

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| beach real feel | yes |
| HRRR shoreline wind | yes |
| frozen lighthouse icing | yes |
| ski snow forecast | yes |
| airport weather risk | yes |
| lake breeze | yes |
| cloud cover for aurora | yes |
| snow model comparison | yes |
| weather grid near beach | yes |
| validate weather units | yes |
| change beach hero | no |
| fix ski report parser | no |
| aurora title | no |
| install MetPy | no |
| show current station reading unchanged | no |
| add map pins | no |
| rewrite weather copy | no |
| change ads | no |
| fix CSS | no |
| adjust chart labels | no |

## Paired task and assertions

Shore Feel: compare existing engine against observed shoreline and inland readings using matching hours; reject HRRR grid as beach observation; refuse forecast if missing necessary inputs.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
