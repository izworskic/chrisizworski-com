# Skill evaluation: historical-data-intelligence

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| analyze decades of ice | yes |
| join historical weather | yes |
| query parquet archive | yes |
| compare GSC windows | yes |
| historical backtest dataset | yes |
| dedupe long time series | yes |
| aggregate daily river records | yes |
| reproducible offline data analysis | yes |
| historical seasonal baseline | yes |
| large CSV processing | yes |
| show today's gauge | no |
| install DuckDB | no |
| change headline | no |
| fix CSS | no |
| new paid database | no |
| edit ad | no |
| add map icon | no |
| rewrite copy | no |
| add photo | no |
| fix sitemap | no |

## Paired task and assertions

Ice archive: preserve raw revisions, units, missing records and date boundaries; compare stdlib/JS before DuckDB; no sensitive data or deployed database.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |
