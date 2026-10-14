# Niagara Falls Today — Component Loss System
**Version:** 1.0 · **Scope:** `/niagara-falls-today/` · **Release owner:** site maintainer · **Machine manifest:** `lib/niagara-falls/quality-loss-manifest.json`

## Why this exists
Passing a JavaScript unit test is not equivalent to helping a person enjoy Niagara Falls. The page must answer, in order: **Can I do my chosen experience on this date? Where exactly do I start? How do I get there? What does it cost? What can ruin the plan?** The page's credibility, legibility and calm visual hierarchy are separate products that can each fail.

The October 13 baseline found a concrete failure: `public/assets/niagara-visit-map.js` was not valid JavaScript. It contained a truncated `var cost=...` expression combined with duplicated rendering logic. Earlier site tests reported success while the map could not initialize. The repaired script and a syntax veto are the first intervention.

## Mathematical contract
For component `i`, define observed value `mᵢ`, desired behavior `tᵢ`, loss `Lᵢ in [0,1]`, severity weight `wᵢ` and confidence `qᵢ`.

- **Binary correctness/grounding:** `Lᵢ = 1 - 𝟙[validated test passes]`. Target zero, not an average.
- **Positive-benefit metric** (for browser/manual tests, e.g. comprehension): `Lᵢ = clip((tᵢ - mᵢ)/tᵢ,0,1)`. Explicitly log measurement, sample size and confidence.
- **Lower-is-better metric** (e.g. interactive delay or overflow): `Lᵢ = clip((mᵢ - tᵢ)/max(tᵢ,epsilon),0,1)`.
- **Weighted observed loss:** `L_obs = Σᵢ∈measured wᵢ Lᵢ / Σᵢ∈measured wᵢ`; critical weight 6, major weight 2. **Never impute zero for missing evidence.**
- **Hard veto:** If any automated *critical* component is nonzero, fail. For now, every automated major component must also be zero. This is intentionally stricter than an aggregate score, preventing beautiful media from compensating for a fake boat schedule.
- **Manual evidence:** `Lᵢ = null`, status `REVIEW_REQUIRED` until a qualified reviewer or real browser records a measurement. A passing CI badge does **not** constitute visual or editorial sign-off.

The machine manifest currently specifies **79 component losses** over eight systems: itinerary engine, UX, map, video, imagery, words, search discovery and release operations. It includes **65 automated vetoes** and **14 explicit browser/editorial reviews**. Each row identifies component, owner, desired condition, its loss function and release threshold. The evaluator must fail if a newly defined automated loss has no implementation.

## Visitor value versus failure costs

**Visitor value** `V = α·intent_satisfaction + β·usable_first_action + γ·confidence_calibration + δ·experiential_understanding - Σ wᵢLᵢ`.

Do **not** choose `α,β,γ,δ` from intuition and claim they are measured. Validate against visitor tasks. Hard physical, legal, temporal and price constraints are non-compensatory: no score can override them.

| System | Core losses | Critical visitor failure | Corrective measure |
|---|---|---|---|
| Engine | Dates, sides, hard goals, published hours, walking/time buffers, fare coverage, fallback labels, source attribution | Boat shown when closed; cross-border itinerary without consent; invented ticket certainty | Deterministic US/Canada/late/closed/family/budget fixtures and negative counterexamples |
| Experience UX | Decision order, visible result, human first action, first parking answer, progressive detail | The user cannot tell what to click or where to start | DOM contract and genuine phone/tablet usability run |
| Map | JavaScript parse, marker parity, origin, route truth, parking, directions, tile fallback, popups | Blank map or a straight-line path represented as a legal route | Compile + source-grounded stop checks + simulated missing-Leaftlet fallback + live device |
| Transport | Group WEGO/pass math, seasonal service, origin and missing prices | Declaring a false cheapest or guaranteed bus | Deterministic rates and explicit unknown coverage |
| Documentary video | Identity, rights/truthfulness, thumbnail parity, one opt-in player, embed/link reliability | Fake-looking media or playback that does not work | Static/functional checks + editorial and browser review |
| Photography | Authentic credited hero, contextual caption/alt, load budget, crop at mobile/tablet | Wrong place, fake photo, blocked top viewport or bad crop | Licensed asset check + human screenshot review |
| Words | Feasibility vs ticketing, specificity, plain-language route, disclosure priority, localized guide voice | Visitor leaves believing they booked a boat or mistaking uncertainty for certainty | Copy gates + real-user five-second and comprehension tests |
| Search | Intent title, visible FAQ/schema parity, canonical/person identity, contextual links | A useful experience is undiscoverable or a thin duplicate page is indexed | Current search benchmark + GSC query evidence |

## Critical, representative persona losses

| Persona | Desired answer | Unacceptable loss |
|---|---|---|
| Arriving at 11 a.m., New York, explicitly wants a boat, 4h | Boat stop with ticket/source caveat, correct boarding entrance and Lot 1, realistic transfer | Scenic viewpoint silently substituted for boat |
| Arriving after U.S. operator closing time | Clear boat infeasible, reason and published next opportunity only if verified | A boat reported available |
| Ontario visitor, 2h, scenic | Table Rock + an additional suitable public viewpoint if both fit; no paid tickets | Ticketed excursion mislabeled "best viewpoints" |
| Two adults and one child, Canadian WEGO | Correct group total; existing passes not recharged; unknown parking rates explicit | $16 represented as group fare or direct parking assigned invented rate |
| First-time traveler confused about shore | Explicit New York vs Ontario operator and no automatic cross-border plan | Boat boarding point across the international border |
| Family with limited walking | Public view first, restrained walking, honest access qualification | Long path or unverified step-free claim |
| Tablet landscape user | Date/side/experience/result/map accessible without side-scrolling; no giant empty hero | Horizontal overflow or hidden directions |
| Visitor on low-bandwidth connection | Text itinerary, parking and directions remain useful without Leaflet/video | Missing map blocks the itinerary |

## Acceptance benchmarks: human measurements
The following are **targets to validate**, not fabricated observations. Human review remains open until screenshots and task attempts are recorded.

1. **Five-second test:** At least 8 of 10 first-time testers can answer what the tool does and how to plan a boat ride within 5 seconds after seeing the first screen. `L = max(0, (0.8 - successRate)/0.8)`.
2. **Plan completion:** At least 9 of 10 people given a date, side and trip goal can obtain and interpret the first actionable stop without prompting. Measure elapsed time and failure mode, not clicks alone.
3. **Phone/tablet overflow:** Zero horizontal scroll on tested viewports 360, 390, 768, 1024 and 1280 CSS pixels. `L = 1` if `scrollWidth > clientWidth+1`.
4. **Map field trial:** All itinerary pins correspond to actual entrance or viewpoint coordinates; directions lead to appropriate *walkable* streets, not merely straight connectors. Test both countries and remote Rapidsview.
5. **Media and imagery:** All three films play when selected, one player only; hero crop is correctly identified on mobile and tablet, not a misleading shot. Inspect license and caption.
6. **Copy comprehension:** At least 9 of 10 testers distinguish *published feasible operating window* from *live ticket availability*, and can identify the appropriate official operator.
7. **Time-to-first-action:** Measured at the 75th percentile on real sessions and constrained devices. Establish baseline before choosing improvement target; do not invent current seconds.
8. **Confidence behavior:** No benchmark pass for unsupported source data. Unknown is **unknown**, not zero or a false negative.

Record device, viewport, visit fixture, screenshot, test date, evaluator, outcome, regression issue link and before/after notes. A review is incomplete without these artifacts.

## CI and release process
`npm run benchmark:niagara-quality` runs the evaluator. `npm run benchmark:niagara-quality -- --write` records `artifacts/niagara-component-loss-report.json` for inspection. `node --test tests/niagara-quality-loss.test.js` is included in the repository's existing `npm test` wildcard, so broken components veto release.

1. **Before coding:** Identify which losses the change is intended to reduce and which it might increase. Do not change an unaffected component for styling.
2. **Build:** Add a positive persona and a deliberately wrong/negative fixture for each changed engine or map contract.
3. **Pre-merge:** All automated critical and major losses zero, full repo tests and public output audit pass; written manual review gaps explicitly disclosed.
4. **Post-deploy:** Validate actual JS assets and same-domain runtime response, then perform manual tablet/device checks for the changed surface; do not claim premium UX until human gates are signed off.
5. **GSC:** Once enough observations exist, compare indexed queries, impressions, CTR, subsequent itinerary completion and operator link actions; don't claim a million clicks from a design score.

## Non-negotiable anti-gaming rules
Do not increase a score by hiding testable information, removing operator caveats, disabling a map, replacing a broken feature with a static screenshot, fabricating quotes/costs/timetables or adding SEO filler. If a metric becomes impossible to measure, label it `UNVERIFIED` and reopen the decision. Preserve all previous legitimate user constraints and tickets/safety vetoes.
