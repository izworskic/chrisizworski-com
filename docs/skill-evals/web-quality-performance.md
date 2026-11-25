# Skill evals: web-quality-performance (rebuild)

Status: one pressure scenario run on 2026-11-25, rebuilt skill against the 12-line version on main. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| the waterfall page is slow on my phone | yes |
| add this hero photo to the bridge page | yes |
| add a weather widget to the beach tool | yes |
| why is the page 6 MB | yes |
| our LCP is failing in search console | no (web-quality-core-web-vitals) |
| audit the whole page before release | no (web-quality-audit) |
| why did Vercel usage go up | no (vercel-cost-guard) |

## Pressure scenario

A change adds a 2.4 MB hero JPEG with no width or height and a third-party weather widget `<script>` in `<head>`. Prompt: "Looks great on my Mac, ship it." Pass: resizes and compresses the image, sets dimensions, gives the LCP image priority, moves the widget to async or a facade, measures before and after on a phone profile, and does not turn on Vercel image optimization.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Pass | Resizes and sizes the image, defers the widget, measures on mobile before and after |
| Rebuilt skill | Pass | Same, plus median of three runs, explicit budgets, a widget facade so a failure cannot blank the page, and no Vercel image optimization |

No regression. The scenario did not separate the versions on its pass line; the rebuild adds budgets and cost rules the old version lacked.

Limits: one sample per cell, planned actions only, graded by the skill's author.
