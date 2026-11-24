# Production Design foundations and reference components

2026-11-24 | Candidate Phase 3 and initial Phase 4 library. Baseline main: 264766218472eb00ce388465f0b212eb6c33ca6a. Not a global stylesheet, released skill or automatic adoption. One existing laboratory, one scoped token source, existing component owners. No public routes or dependencies. Production design acceptance remains owned by Experience OS, not this specimen.

## Evidence and choices

Duluth PR #1918 passed actual five-width browser acceptance and the full repository gate (run 45437543443); the owner confirmed it works. Its shared ship-type mapping and bounded narrow-map detail pane are useful reference implementations. The first two automatic popup positioning corrections did not solve clipping; retain that lesson. The source-derived lab already passed a separate five-width browser test in PR #1912. Neither outcome proves independent agent effectiveness or site-wide visitor uplift.

Option A: promote Snow Totals Visual V1 to a global theme. Reject: pilot explicitly limited to Snow Totals and different tools need different compositions.
Option B: invent a second visual system with its own runtime, component copies and universal layout. Reject: conflicts with existing authorities and duplicates working code.
Option C: extract scoped semantic roles into the existing lab, preserve source-derived values and reference owning implementations. Selected. Production migration only through narrow reviewed product PRs.

## Token provenance

| Role | Value or source | Scope |
| --- | --- | --- |
| Spacing | 4/8/12/16/24/32/48px from design-systems/visual-v1/tokens.css | Candidate common steps; layout may differ |
| Type | 14/16/18/22/40px from same Snow Totals pilot | Caption/body/subheading/heading/reading, not a rigid page hierarchy |
| Editorial vs operational | Existing lab Georgia / system sans; line-height 1.55 | Candidate, no universal font |
| Controls | Existing lab 44px minimum height; 8px radius, 3px focus outline/offset | Interactive specimens; no forced card radius |
| River neutrals / accents / shadow | public/assets/working-rivers-family.css | Preserve Cuyahoga and Calumet variants |
| Snow neutrals / accents | design-systems/visual-v1/tokens.css | Preserve Snow Totals identity; no mirror change |
| Journey neutrals / accents | public/lake-superior-circle-tour/index.html :root and route-planner focus rule | Candidate representation, not copied planner layout |
| Evidence state cues | Existing lab recent, stale and unavailable colors | Text is authoritative; unknown never means zero |
| Pictured Rocks | Registry identifies independently hosted canonical https://picturedrocks.chrisizworski.com/ | Excluded from token extraction until owning repository audit; not a local page |

The actual source stylesheet or module remains authoritative for production. The candidate CSS is confined to .lab. Family overrides change colors but not semantic roles. Borders used only for grouping are not a claim of UI-control contrast compliance. Do not promote exact colors on the basis of one sample.

## Component reference index

| Pattern | Owner / reference | Maturity and preservation |
| --- | --- | --- |
| Nine AIS silhouettes and length bands | public/assets/seaway-vessel-icons.js; public/assets/soo-vessel-icons.css | Existing shared implementation, used in Duluth pilot; never rotate side-profile ship or infer type |
| Vessel report detail | public/assets/duluth-canal.js; public/duluth-canal-park/index.html | Browser-verified pilot; narrow bounded pane, desktop anchored popup, one selection, report age and source type |
| River family identity | public/assets/working-rivers-family.css | Existing scoped family, not a global shell |
| Reading and unit | Snow Totals Visual V1 and the lab's snow specimen | Candidate role contract; report interval, unit and unknown values |
| Selection and focus | Existing lab two independent groups | Previously browser verified; retain aria-pressed, focus and reversible choice |
| Evidence and unavailable state | Existing lab state examples | Explicit text; no disabled action without reason |
| Sequence and tradeoffs | Circle Tour route-planner and lab journey specimen | Candidate pattern; sum at-stop time, distinguish uncalculated travel, native details |
| Verified place imagery and access | Existing Field Guide and independent Pictured Rocks | Reference only; rights, location and access require owner/source audit |

No shared production widget has been copied out of its owner. A specimen is not an API or map integration test. The gallery deliberately contrasts a reading, a sequence, and maritime selection; it is not three versions of one card template.

## Acceptance and next action

Run the existing lab verifier and the static foundation test. Compare the previous and new maritime states, inspect actual mobile/desktop cross-family screenshots, review focus, units, unknown values, native details without JS and no overflow. Contrast checks measure declared pairs, not the complete WCAG audit. Existing full repository gate still required. No automated baseline blessing. Next after review: choose one bounded component adoption on a contrasting live tool, then review stable screenshot baselines as Phase 5. Independent Phase 1 behavioral evaluation remains unrun; no mandatory new instruction or active skill edit.

No new Vercel functions, routes, crons, production dependencies or paid services. The existing isolated browser QA job is reused only for this branch; a preview build may run under existing settings.
