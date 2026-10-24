# Seed Saving Lab: a value function for each feature

**Owner:** `public/seed-saving-lab/index.html` · **Gate:** `npm run benchmark:seed-lab-features` · **Recorded:** October 24, 2026

The page-level gate (`docs/SEED_LAB_USABILITY_VALUE_FUNCTION.md`) asks whether the tool works as a whole. This one scores each feature on its own promise, so a strong page cannot hide a weak part. Every feature scores 0 to 100 from the criteria below. Each criterion drives the page through `scripts/lib/seed-lab-harness.mjs` and scores what a visitor would see, except the few that only exist in markup (labels, focus styles).

**Release gate:** every feature at least 90 and the mean at least 95. These are automated task proxies, **not** human usability results, search data or revenue.

Plain-language checks (`scripts/lib/plain-language.mjs`) use a Flesch-Kincaid grade with a simple syllable count and a list of botanist words a home gardener should not need (embryo, segregation, cultivar, interspecific, xenia and so on). The verdict criteria sweep **all 2,601 ordered pairs** of the 51 crops.

## Scores, same gate, before and after

"Before" is `main` at a87d7ecc scored by this same script.

| Feature | Criteria (weight) | Before | After |
|---|---|---:|---:|
| Plant pickers | Every crop once per picker, grouped and alphabetical (25); crop names, not varieties (15); botanical name follows the choice (20); swap trades plants and answer (20); two varieties of one crop explained (20) | 100 | 100 |
| Verdict | No botanist jargon in any of 2,601 answers (30); no broken text (20); grade 8 or below on average (20); screen-reader status names both plants and the verdict (15); heading starts with a plain answer word (15) | 94 | 100 |
| What to do | Crossable pairs get 2+ options, the first with the distance (30); population guidance wherever a figure exists (20); non-crossing pairs name what would matter (20); biennials say they flower in year two (15); hybrid (F1) seed gets a plain warning in the main answer (15) | 50 | 100 |
| Refine questions | Every visible question changes the answer (40); irrelevant questions hidden (20); slider and feet box in step, nonsense ignored (20); every change announced (20) | 92 | 100 |
| Distance chart | Guideline marked (25); your distance marked (25); words say whether you meet it (25); log scale evenly spaced (25) | 100 | 100 |
| Pair picture | Line style differs by answer (30); species same/different matches the engine for every pair (30); separation fact matches (20); pollination in plain words (20) | 80 | 100 |
| Examples | Each example sets a pair and answer (40); examples cover three or more kinds of answer (30); labels name the plants (30) | 70 | 100 |
| Share links | Checker link round-trips every answer (40); garden link keeps plants, varieties and seed marks (30); pre-rename links open (15); junk ignored (15) | 70 | 100 |
| Garden builder | Add on selection, remove in one tap (20); up to three varieties of a crop (20); twelve-plant limit explained (15); example and Clear (15); mark which plants you save seed from, and results follow (30) | 70 | 100 |
| Garden results | Ordered by severity (20); each flagged pair gets a plain, plant-specific next step (30); open in checker loads that pair (20); counts add up (15); pairs with no seed at stake step aside (15) | 55 | 100 |
| Pollen web | One line per flagged pair, solid or dashed (30); no plant name cut short (20); plants are keyboard buttons that highlight partners (25); a line opens its pair (25) | 80 | 100 |
| Room chart | One bar per species (40); darker with a crossing partner (20); table mirrors chart (20); labels not cut short (20) | 80 | 100 |
| Garden export | One spreadsheet row per pair with a plain next step (50); header row and Excel BOM (20); copy link (30) | 50 | 100 |
| Voice and story | No em dashes (25); speaks to the gardener (25); no invented personal anecdotes (25); story at grade 9 or below (25) | 100 | 100 |
| Trust | Sources listed (25); each answer links a source (25); no invented percentages (25); says outside pollen is not counted (25) | 100 | 100 |
| Accessibility | Every select and text input labelled (25); status regions (15); focus styles and 42px targets (20); charts have a text alternative (20); copy works without clipboard access (20) | 100 | 100 |
| **Mean / lowest** | | **80.7 / 50** | **100 / 100** |

## What changed to close the gaps

- **Plain words everywhere.** Seed-shelf notes, exception details and cautions rewritten (no "compatible", "interspecific", "xenia", "embryo", "F2 segregation"). The engine's decisions are unchanged; only the words shown to visitors moved. "Next spring" now has its own plain text.
- **Season awareness.** Biennials (cabbage, kale, Brussels sprouts, collards, kohlrabi, rutabaga, turnip, carrot, wild carrot, beet, chard, onion, hollyhock) say they flower in their second year, so a crop harvested this year cannot cross. Broccoli, which flowers in year one, does not get the note.
- **Hybrid seed.** Choosing "Hybrid (F1)" puts the warning at the top of the steps: saved hybrid seed will not grow true even without a cross.
- **Population guidance** now also appears in "Rarely" and "Unconfirmed" answers.
- **Pair picture** says "its own pollen and insects" instead of "self + insects".
- **A fifth example**, French + African marigold, shows the "Rarely" answer.
- **Garden: saving seed or just eating.** Each plant chip has a seed toggle. Pairs where you only eat both plants move to a "No seed at stake" group and drop off the pollen web. Links keep the marks (`id:s`, `id:e`; older `:y`/`:u` links read as saving seed). "Open in checker" puts the seed crop first.
- **Garden next steps** name the crop at stake and the distance ("To keep seed from the zucchini true: 1,600 ft apart, hand-pollinate and bag the flowers you save from, or let only one flower for seed this year"). The spreadsheet uses the same words and adds a "Saving seed from" column.
- **Charts:** pollen web uses the space it has and wraps names onto two lines instead of cutting them; room chart wraps long species rows.
- **Phone:** the examples row scrolls sideways, so the verdict starts at 702 px on a 390 × 844 screen (it was 847 with five chips wrapping).

## Browser evidence (local Chromium, not CI)

1280 × 900 and 390 × 844: no JavaScript errors, no horizontal overflow, verdict in the first screen on both. Garden of 11 plants with three marked "eating only" renders the toggle states, the stake-aware groups, two-line web labels and a wrapped room chart.

## Limits

No real gardeners were observed. A perfect score here means every stated behaviour is present and correct for the inputs swept, not that people find the page easy. The human research targets in the usability doc still stand.
