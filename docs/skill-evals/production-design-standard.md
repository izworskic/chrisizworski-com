# Production Design Standard: candidate evaluation
Status: EVALUATED (2026-11-25, 40 fresh-context trigger sessions + 16 fresh-context paired behavioral sessions; see `product-engineering-os-phase-1-results-20261124.md`). Kept scoped as an Experience OS reference without adding a standalone skill or root instruction bloat.

## Trigger cases for the proposed Experience Investment / Experience OS reference
Use the same owning-repo context and current instructions in fresh sessions. "Yes" means load the proposed production design reference, not a new standalone skill.

| Owner prompt | Expected |
| --- | --- |
| make the waterfall tool feel like a real product | yes |
| design a new lock watching tool | yes |
| why do all these tools look like AI slop | yes |
| make Calumet and Cuyahoga feel like the same platform | yes |
| rework this ski page so it is easier to use | yes |
| redesign the mobile beach explorer | yes |
| review visual consistency across the freighter tools | yes |
| build a new garden planning dashboard | yes |
| use experience design on the holiday planner | yes |
| create a reusable map selection component | yes |
| change one misspelled beach name | no |
| repair broken NOAA URL only | no |
| fix ice-cover calculation | no |
| merge existing PR without new design work | no |
| fix one wrong canonical | no |
| add a unit test for snowfall conversion | no |
| update historical vessel tonnage | no |
| investigate a specific page with REA, no redesign | no |
| fix a broken image credit link only | no |
| check Search Console for CTR | no |

Target >=90% correct, no unrequested REA/Penpot/Stitch/paid tooling. Narrow fixes retain directly relevant guardrails.

## Paired behavioral cases (baseline first, then candidate)
Use identical task, repository commit, fixture data, available browser and agent configuration. Do not change the rubric after seeing outputs. Archive the exact input, loaded instructions, outputs, screenshots where applicable and assertion results. Mark missing execution NOT VERIFIED, never pass.

| Case | Assertions that must be graded independently |
| --- | --- |
| Sibling freighter maps | Reuse compatible marker/status/icon and popup conventions; identify intentional domain-specific difference; no duplicated popup, source claims or AIS engine; loaded mobile map and selected-state screenshot |
| Snow totals and waterfall explorer | Preserve shared action/status vocabulary; separate primary task and page composition; do not apply snow-specific blue scale or numeric hero to waterfalls; exact-place evidence |
| Beach real feel mobile | Lead with actual temperature and units, primary action visible or immediately reachable at 390px; no page zoom conflict with map; no decorative content displacing answer; ad policy preserved |
| Holiday airport board | Show readable place/time/status, evidence freshness, useful ordering; no dashboard of redundant metric tiles or unsupported recommendation score |
| Source outage / stale state | Visually and verbally distinct unknown state; no fake live badge, empty chart, or plausible-looking fabricated data; useful fallback |
| Design pressure: "ship it, tests are green" | Missing rendered evidence blocks design acceptance; no claim that a screenshot filename, axe score or CI alone demonstrates polish |
| Consistency pressure: "copy this beautiful page everywhere" | Reuse tested component contracts; preserve distinctive task-specific composition; explicit reason for any exception; no universal template rollout |
| Scope pressure: "clean up all the styles while here" | Inventory affected consumers; scoped changes; no new dependencies, ads/SEO changes, broad CSS migration or auto-merge |

For each case record baseline pass/fail per assertion, candidate pass/fail, observed tradeoffs and regression. If the baseline passes all assertions, do not add redundant policy. If candidate misses a baseline success, revise. Do not activate without demonstrated incremental value and existing gates. A single-agent source audit is not a substitute for these independent fresh-context runs.

## First pilot
Use already-working Soo Locks/Duluth and sibling Cuyahoga/Calumet as a family of comparable components; verify current live or local state before treating any as a gold reference. A non-maritime pilot (Snow Totals versus waterfall explorer) tests against forced sameness. No production pages changed in this evaluation proposal.
