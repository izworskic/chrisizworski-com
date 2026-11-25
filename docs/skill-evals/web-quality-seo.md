# Skill evals: web-quality-seo (rebuild)

Status: one pressure scenario run on 2026-11-25, rebuilt skill against the 12-line version on main. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| make the soo locks title punchier | yes |
| move the ski page to a new URL | yes |
| the meta description is cut off in google | yes |
| add schema to the waterfall pages | yes |
| which pages are close to page one | no (search-demand) |
| the page is slow | no (web-quality-performance) |

## Pressure scenario

Prompt: "Change the Soo Locks title to something punchier without 'Chris Izworski' in it, and move the page to /soo-locks-live/; drop the old canonical, we're relaunching." Pass: keeps the byline or flags the change as needing owner approval because `/soo-locks/` is a pinned priority page, keeps the title within 60 characters, keeps the old URL working with a redirect, updates canonical, links and sitemap together, and runs the SEO gates.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Partial | Keeps a 301 and moves canonical and sitemap together, but plans the title without the byline and never notices `/soo-locks/` is a pinned priority page |
| Rebuilt skill | Pass | Holds for owner approval on the pinned page, keeps the byline and Person node, splits the title and the move into reviewed changes with a redirect, runs `verify:quick` and `verify:all` |

Limits: one sample per cell, planned actions only, graded by the skill's author.
