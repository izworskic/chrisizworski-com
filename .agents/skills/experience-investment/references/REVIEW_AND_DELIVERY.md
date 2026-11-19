# Review and delivery contract

## Modes

**PROPOSE** (new visitor tool or new experience): Find the canonical owner and neighboring tools, define the unique decision and evidence gap, research at least two credible current external examples for a substantial concept, and present two non-cloned directions. Recommend one based on user value, source feasibility, first-screen clarity, maintenance and incremental cost. Describe implementation phases and acceptance. Do not create a production route unless asked to build it.

**REVIEW** (existing page, no implementation requested): Inspect code and an actual page/viewport when available. Report what already works, where visitors become confused, what is purely visual versus an underlying utility/data failure, and the highest-return improvements. Show two divergent design approaches with mobile/desktop wireframe descriptions or screenshots when available. Do not pretend a screenshot was taken if only source inspection occurred. Recommend whether to preserve, refine, or rebuild. Do not change source.

**IMPLEMENT** (new build or substantial rework requested): Run REVIEW or PROPOSE first as part of the work, choose the most defensible concept, and implement in the owning repository. A review request alone never implies production mutation; an implementation request does not end with a suggestion. Use a branch and PR, do not silently merge. Show real before/after evidence if available and test the most valuable visitor journeys.

## Investment decision record (concise but specific)

- **Visitor job:** one sentence, including what they do after receiving the answer.
- **Baseline:** URL/owner/source, what is verified, viewport screenshots or NOT CAPTURED; data and release guardrails.
- **Diagnosis:** visitor friction and cause, not simply "dated UI".
- **Candidate A / B:** first 390px screen, meaningful action, composition, visual/data language, unknown/failure behavior, cost and why it differs.
- **Selection:** benefit, effort level (small/medium/large), source confidence, key risk; avoid made-up numeric scores.
- **Distinctiveness check:** name the two closest existing site tools and two demonstrated function-led differences. If only color/imagery changed, FAIL.
- **Implementation scope:** touched files, preserved search-visible text and data/ads/SEO contracts, dependencies and budget effect.
- **Proof:** before/after 390px and 1280px, actual 360/390/768/1440 responsive check, keyboard, no-JS, reduced-motion, error/source-stale/map/photo states as relevant, Experience OS QA scorecard, targeted and full CI. Use NOT MEASURED / NOT VERIFIED where appropriate.
- **Release:** separate code committed, PR open, checks passed, merged, deployed, live-public verified and measured-outcome statuses. Include exact links/SHA; never conflate.

## Priority rule for reworks

Fix broken visitor decisions or incorrect source claims first. Next fix inaccessible first-screen hierarchy, map/list failure, poor interaction causality and legibility. Then invest in richer charts, precise images, narrative, motion and delight that support function. A visual treatment that hides the answer is a regression even when it looks modern.

## Safeguards

- Preserve all existing search-facing factual prose during a visual-only change, including content moved below the main tool.
- Preserve Auto ads policy and excluded regions; do not design around placement speculation.
- Preserve Person schema, canonical, source timestamps/rights, units, navigation/location safety, and site performance.
- Avoid page-wide horizontal scroll, content jumps, hover-only controls, decorative empty maps, inaccessible palettes, generic uniform cards, unlicensed images and oversized heroes.
- Do not adopt Penpot unless explicitly requested, and do not equate a design mockup with code or browser evidence.
- The original Experience OS QA hard gates and owning-repository full tests are not waived by a strong visual critique.
