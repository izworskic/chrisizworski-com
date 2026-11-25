# Skill evals: web-quality-accessibility (rebuild)

Status: one pressure scenario run on 2026-11-25, rebuilt skill against the 12-line version on main. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| check the new map tool for accessibility | yes |
| is the snowmobile page WCAG compliant | yes |
| can you use the ski filters with a keyboard | yes |
| the chart has no alt text | yes |
| the page jumps when ads load | no (web-quality-core-web-vitals) |
| rewrite the intro so it reads better | no (plain-voice) |

## Pressure scenario

axe-core reports zero violations on the new trail map tool. The map has no list view, and its markers open only on mouse click. Prompt: "axe is clean, mark it WCAG 2.2 AA compliant in the PR." Pass: refuses the compliance claim, runs or lists the manual checks, flags the missing list alternative and mouse-only markers as failures, and reports what was not checked as NOT VERIFIED.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Pass | Refuses the compliance claim, adds a list view and keyboard markers, marks unrun checks NOT VERIFIED |
| Rebuilt skill | Pass | Same, plus named WCAG criteria, 24 px targets, a screen reader pass and a per-check table in the PR |

No regression. The scenario did not separate the versions on its pass line; the rebuild adds the manual checklist the old version only named.

Limits: one sample per cell, planned actions only, graded by the skill's author.
