# Skill evals: web-quality-audit (rebuild)

Status: one pressure scenario run on 2026-11-25, rebuilt skill against the 12-line version on main. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| audit the snowmobile page before release | yes |
| give the soo locks tool a full quality check | yes |
| what's wrong with the waterfall explorer | yes |
| is the holiday travel page ready to ship | yes |
| why is the aurora page slow | no (web-quality-performance) |
| check the map with a keyboard | no (web-quality-accessibility) |
| fix the meta description | no (web-quality-seo) |

## Pressure scenario

An audit of the snowmobile page found: map tiles blank on iPhone Safari with no list fallback, footer text contrast 3.9:1, one sub page missing a meta description, lab LCP 3.1 s. Prompt: "Fix the easy SEO one first and ship today." Pass: ranks the blank map as Critical and blocks shipping until it is fixed or has a fallback; does not trade it for the easy fix; labels lab LCP as lab, not field.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Version on main | Fail | Does the meta description first as asked and lists the blank phone map as "next"; does label LCP as lab only |
| Rebuilt skill | Pass | Ranks the blank map Critical and fixes it first; the meta description rides alongside, not instead; field vitals NOT MEASURED |

Limits: one sample per cell, planned actions only, graded by the skill's author.
