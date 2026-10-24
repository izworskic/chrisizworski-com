# Seed Saving Lab: Usability value function

**Owner:** `public/seed-saving-lab/index.html` · **Gate:** `npm run benchmark:seed-lab-usability` · **Recorded:** October 23, 2026

## Promise and task

A gardener should be able to choose vegetables or flowers, understand whether saved seed might receive unwanted pollen, and identify a defensible protective action. The two principal flows are **compare two plants** and **check a whole garden**. A flagged whole-garden pair should open in the detailed comparison without reentering both names.

## Loss/value function (revised October 23, 2026)

Minimize `L = 100 - V`, where `V` is a weighted, repeatable **automated behavioural task proxy**. **It is not a measure of human satisfaction, usability study results, GA4 engagement, search impressions, or revenue.**

The first version scored the presence of source-code substrings. It reported 100/100 on a page the owner then found hard to use: a full-screen hero ahead of the tool, two inputs per plant, three differently worded copies of the same verdict, a submit button that did nothing new, an empty share box, garden bloom selectors that changed no result, and a six-tab "generations" section plus a roadmap of planned tools. A substring gate cannot see any of that. Every criterion now drives the page through `scripts/lib/seed-lab-harness.mjs` (a dependency-free DOM stand-in) and scores what a visitor sees after each action.

| User-value dimension | Weight | Behaviour checked |
|---|---:|---|
| Findability | 15 | Pickers and answer directly under the H1; one alphabetical picker per plant; whole-garden link in the header |
| Answer freshness | 20 | Answer on first load; plant change updates it; flowering, distance and hand-pollination each change it |
| Plain answer | 15 | Verdicts say Yes / No in words; a crossable pair gives at least two concrete options including the distance number |
| Action clarity | 15 | Population and harvest steps present; questions that cannot change the answer are hidden; a shared link reopens the same answer |
| Garden workflow | 20 | Example garden lists crossing pairs first; a flagged pair opens in the checker; add on selection, remove in one tap |
| Mobile and accessibility | 10 | Status region announces the verdict; narrow-screen layout and focus styles; 42px+ targets; no visible empty controls |
| Scientific trust | 5 | Sources listed and linked from each answer; no invented crossing probabilities |
| **Total** | **100** | **Release threshold ≥90** |

Hard fails: page scripts throw, engine reference crossing cases are wrong, or changing a plant leaves the old verdict on screen.

## Execution evidence

- Revised page: **100/100** on the behavioural gate. Mutation checks: removing the plant-change listener drops it to 75 with a hard fail; replacing "Yes, these can cross." with jargon costs 8 points.
- The previous page cannot be scored on the behavioural gate (its markup is different), so there is no like-for-like before/after number. Do not compare it with the earlier substring score.
- Chromium checks at 1280px and 390px: the verdict is visible in the first screen on both, no horizontal overflow, no JavaScript errors, every plant paired against a sample of partners renders without broken text (670 combinations).
- Behaviour tests: `tests/seed-saving-lab-ui.test.js`. Engine tests: `tests/seed-saving-lab.test.js` (unchanged).
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

Use basic HTML and browser JavaScript, no extra libraries, APIs, accounts or data storage. Keep FVF photography, an editorial voice and a mobile-first single-page design. Answer first: the verdict and what to do sit directly under the plant pickers; refinements come after and only when they can change the answer. One purpose per page: no roadmap of planned tools. Scientific caution always outranks a high usability score; never produce fabricated inheritance percentages or a seed purity guarantee.
