# Seed Saving Lab: Usability value function

**Owner:** `public/seed-saving-lab/index.html` · **Gate:** `npm run benchmark:seed-lab-usability` · **Recorded:** October 23, 2026

## Promise and task

A gardener should be able to choose vegetables or flowers, understand whether saved seed might receive unwanted pollen, and identify a defensible protective action. The two principal flows are **compare two plants** and **check a whole garden**. A flagged whole-garden pair should open in the detailed comparison without reentering both names.

## Loss/value function

Minimize `L = 100 - V`, where `V` is a weighted and repeatable **automated task-affordance proxy**. Each criterion is binary and fixed before release. **It is not a measure of human satisfaction, usability study results, GA4 engagement, search impressions, or revenue.**

| User-value dimension | Weight | Observable contract |
|---|---:|---|
| Findability | 15 | Direct, visible paths to pair and whole-garden views |
| Answer freshness | 20 | Initial answer and recalculation after plant, flowering overlap, protection, distance or goal change |
| Plant lookup | 15 | Filtering by common and botanical names |
| Decision clarity | 15 | Pair-specific action and prioritized whole-garden action |
| Garden workflow | 20 | Matrix works, easy successive additions, drill from flagged pair |
| Mobile and accessibility | 10 | Narrow-screen CSS, keyboard focus, readable target sizes, concise live verdict |
| Scientific trust | 5 | Botanical references; no unsupported purity or crossing probability claims |
| **Total** | **100** | **Release threshold ≥90** |

Critical hard fails: engine error, incorrect reference crossing cases, or a stale verdict after plant selection. Tests enforce these even if a weighted total could otherwise pass.

## Execution evidence

- Before changes: **26/100** by the Node benchmark on the previous published HTML; **24/100** in locally scripted Chromium interaction checks at both 390px and 1280px.
- Revised feature: **100/100** by the Node benchmark; **100/100** in Chromium scripted interaction checks at both widths. Verified search by common and species name, instant update after changes, garden first action, a flagged-pair jump, keyboard-reachable links, primary action target sizes, no horizontal overflow and no JavaScript exceptions.
- The Node benchmark is committed under `scripts/benchmark-seed-lab-usability.mjs` and registered in `verify:all` for future changes. Run `npm run benchmark:seed-lab-usability` for one iteration.
- Difference between original Node score (26) and scripted browser score (24): separate criteria and tooling. Compare like with like, not these scores interchangeably.
- No real users were recruited; the scores should **not** be described as validated human task completion.

## Human research acceptance targets (not yet observed)

| Persona | Scenario | Target |
|---|---|---|
| First-season vegetable grower | Understand zucchini + pumpkin and choose an isolation method | ≥90% correct action in ≤60 s without coaching |
| Flower seed saver | Compare zinnia varieties and distinguish cosmos species | ≥90% correct answer in ≤60 s |
| Whole-garden grower | Find top issue in an eight-plant scenario and open that pair | ≥90% completed in ≤90 s |
| Mobile gardener | Change plant, flowering overlap and share scenario | ≥90% completed, zero stale verdicts |
| Keyboard or screen reader | Execute comparison and understand announced result | Zero focus traps, actionable feedback |

Start with moderated sessions and report success rate, time, comprehension and error type per scenario. Do not claim human target attainment until measured. Keep unknown pollen sources and reference-distance limitations visible.

## Product decisions

Use basic HTML and browser JavaScript, no extra libraries, APIs, accounts or data storage. Keep FVF photography, an editorial voice and a mobile-first single-page design. Highlight action ahead of the exhaustive comparison table. Scientific caution always outranks a high usability score; never produce fabricated inheritance percentages or a seed purity guarantee.
