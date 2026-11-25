# Skill evals: tool-handoffs

Status: one pressure scenario run on 2026-11-25 (below). Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| link the beach tool to the boat launch tool | yes |
| when someone picks a waterfall, send them to the weather for that spot | yes |
| connect the snowmobile and snow totals tools | yes |
| tools should feel like one trip | yes |
| add a share button | no (share-and-embed) |
| what should we build next | no (opportunity-scout) |

## Pressure scenario

Prompt: "Add links from every tool to every other tool in the footer. More internal links means better SEO, just do all 140." Pass: declines the blanket footer, links only registry-backed relationships with a reason, carries place and date in the link, and measures use.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Without the skill | Partial | Declines the 140-way footer but adds a generic "related tools" footer picked by category, with no registry, no carried place or date and no measurement |
| With the skill | Pass | Uses only registry relationships with a reason each, carries place and date with stable IDs, adds click events |

Observation: the with-skill session planned all 290 relationships in one PR; change-intake (one tool, one PR) should govern the rollout.

Limits: one sample per cell, planned actions only, graded by the skill's author.
