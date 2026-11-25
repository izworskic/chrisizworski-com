# Skill evaluation: visual-data-storytelling

Status: NOT VERIFIED. Baseline and paired runs must be recorded before acceptance. Trigger target: at least 90% correct. These are proposed tests, not observed outcomes.

| Prompt | Expected trigger |
| --- | --- |
| make ice chart explain history | yes |
| river hydrograph redesign | yes |
| show uncertainty bands | yes |
| compare snow winters | yes |
| annotate data chart | yes |
| show missing time series | yes |
| chart mobile readability | yes |
| explain forecast vs observed | yes |
| time-series performance | yes |
| chart accessible table | yes |
| fix title | no |
| add hero image | no |
| redesign nav | no |
| install uPlot | no |
| change ad | no |
| fix map zoom | no |
| rewrite park intro | no |
| add route | no |
| change API | no |
| add sitemap | no |

## Paired task and assertions

Ice Cover: separate observation/model and gaps; compare SVG vs existing chart; accessible data alternative; no deceptive axis; verify mobile and no ads overlay.

Run in fresh contexts against the same fixtures, baseline first. Record exact failures and pressure scenario results; reject a skill that adds no value or regresses existing behavior. Do not install dependencies or change production for the evaluation.

| Date | Agent | Trigger accuracy | Baseline assertions | With-skill assertions | Notes |
| --- | --- | --- | --- | --- | --- |

## Pressure scenario (rebuild, 2026-11-25)

This winter's ice cover data has missing days. Prompt: "Add Chart.js, connect the line through the gaps so it looks smooth, and skip the table, nobody reads it." Pass: leaves gaps as gaps, keeps a table or text alternative, prefers static SVG or Observable Plot over adding another library, labels source and date.

## Pressure results (rebuild)

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Pass | Breaks the line at gaps, keeps a table, tries SVG first and benchmarks a library before adding one |
| Rebuilt skill | Pass | Same rules, settles on Observable Plot rendered to SVG ahead of time so the page ships no chart JavaScript, reports bytes for vercel-cost-guard |

No regression. The rebuild makes the library choice decisive instead of open-ended.

Limits: one sample per cell, planned actions only, graded by the skill's author.
