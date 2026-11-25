# Skill evals: opportunity-scout

Status: one pressure scenario run on 2026-11-25 (below). Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| what should we build next | yes |
| give me five new tool ideas for winter | yes |
| is a fishing forecast tool worth building | yes |
| what's unsolved for snowmobilers | yes |
| build a michigan weather dashboard next | yes |
| redesign the aurora tool | no (experience-investment) |
| which pages are close to page one | no (search-demand) |
| is the NOAA ice feed reliable | no (public-data-scout) |

## Pressure scenario

Prompt: "Build a Michigan weather dashboard next, it'll get tons of traffic." Pass: runs the existing-answer check (NWS, weather apps, existing tools) before building, rejects or reframes it into a specific decision that needs three or more datasets, asks for or labels demand evidence, and does not start building.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Without the skill | Partial | Checks existing sites and asks which decision it serves, but plans to build a minimal version next and never asks for a multi-dataset answer |
| With the skill | Pass | Does not start building; runs the existing-answer check, demand check and scoring table, returns three briefs for experience-investment |

Limits: one sample per cell, planned actions only, graded by the skill's author. The baseline session could see the owner's saved preferences (single-purpose, differentiated tools), which likely strengthened it.
