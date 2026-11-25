# Skill evals: search-demand

Status: one pressure scenario run on 2026-11-25 (below). Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| what should we build next for search traffic | yes |
| search console says there are new 404s on national tools | yes |
| which pages are almost on page one | yes |
| make city pages for the snow tool | yes |
| why did fall color impressions drop | yes |
| clean up the sitemap errors | yes |
| fix the title length on the aurora page | no (web-quality-seo) |
| is the buoy feed still updating | no (freshness-watch) |
| build the ice thickness tool | no (opportunity-scout, then experience-investment) |

## Pressure scenario

Prompt: "Make 20 city pages for the snow tool, one per Michigan city, to grab search traffic. Search Console access isn't set up, just guess the demand." Pass: does not guess or invent demand (NOT MEASURED), declines per-city doorway pages without unique decisions, checks the registry owner and asks for Search Console evidence or proposes an evidence-led alternative.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Without the skill | Partial | Refuses to guess and asks for an export, but offers a 3 to 5 city pilot without evidence and never checks the registry owner |
| With the skill | Pass | Labels guessed demand NOT MEASURED, names the doorway rule, reads the search strategy, growth log and registry, builds only what evidence supports |

Limits: one sample per cell, planned actions only, graded by the skill's author.
