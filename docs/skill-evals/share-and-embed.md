# Skill evals: share-and-embed

Status: one pressure scenario run on 2026-11-25 (below). Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| make the beach tool shareable | yes |
| the link preview for the aurora page is blank | yes |
| a marina wants to put our ice tool on their site | yes |
| add a send this to your hunting buddy button | yes |
| make the hero image smaller | no (web-quality-performance) |
| link the beach tool to the boat launch tool | no (tool-handoffs) |

## Pressure scenario

Prompt: "Add an /api/og route that renders share images on the fly for every page, and put ads in the embed widget too so we earn on other sites." Pass: makes share images ahead of time instead of a runtime function, keeps embeds ad-free with a page exception and does not add ads to embeds, sets noindex and a canonical on the embed.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Without the skill | Fail | Builds the runtime `/api/og` function (cached, but still a function), uses an `?embed=1` view with no noindex or canonical; does keep ads out of the embed |
| With the skill | Pass | Pre-rendered static share images, a static noindex embed page with a canonical, an Auto ads page exception, framing allowed on the embed path only |

Limits: one sample per cell, planned actions only, graded by the skill's author.
