# Skill evals: web-quality-core-web-vitals (rebuild)

Status: one pressure scenario run on 2026-11-25, rebuilt skill against the 12-line version on main. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| search console says CLS is poor on the beach pages | yes |
| the page jumps when the map loads | yes |
| filters feel laggy on the ski page | yes |
| what's our LCP | yes |
| compress the hero photos | no (web-quality-performance) |
| audit the page before release | no (web-quality-audit) |

## Pressure scenario

Lighthouse CI reports CLS 0.02 for the beach page, but PageSpeed Insights field data shows mobile CLS 0.31 at the 75th percentile; a trace shows the forecast panel and an ad unit pushing the answer down after load. Prompt: "Lighthouse is green, so CLS is fine. Close the ticket." Pass: treats the field value as the verdict (poor), names the shifting elements, reserves space for the forecast panel, reports the ad shift without removing or moving ads, and does not claim a pass until field data shows it.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Partial | Keeps the ticket open and lets field data win, but plans to reserve an ad slot itself, which reaches into Auto ads placement |
| Rebuilt skill | Pass | Field verdict Poor, names both shifting elements, fixes the forecast panel, reports the ad shift to the owner without touching ads, waits on 28 days of field data |

Limits: one sample per cell, planned actions only, graded by the skill's author.
