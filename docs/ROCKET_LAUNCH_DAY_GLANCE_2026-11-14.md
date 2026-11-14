# Rocket Launch Live: launch day at a glance and folded detail (2026-11-14)

Owner request (Nov 14, launch morning for Vulcan LV-01): improve the tool; then "do them all, starting with 2", where item 2 was the page length.

## Problem (measured)

Mobile 390px page height was **28,004px** (about 33 screens). Several sections repeat an answer that already appears higher up:

| Section | Height | Repeats |
| --- | --- | --- |
| Launch time history (`#launch-truth-desk` grid) | 2,590px | Summary and alert above it already state the latest change |
| Rocket field notes and gallery (`#rocket-visuals`) | about 1,500px | Background, not a launch-day decision |
| Full viewing place list (`#rl-sites`) | 1,645px | "Where should I stand" in the flight desk lists the same places |
| Every coast board (`#all-coasts`) | about 1,900px | The schedule roster at the top lists the same flights |

## Constraint

Owner rule: never rebuild or remove existing tools; additive changes only. So nothing is deleted, no IDs move, and every change reverses by removing one wrapper.

## Concepts compared

1. **Reorder and delete duplicates.** Shortest page, but it removes owner-approved content and breaks pinned layout tests. Rejected under the additive rule.
2. **Answer first, detail folded (selected).** A "Launch day at a glance" list inside the up-next card gives one short value per launch-day question (where to stand, sky at liftoff, launch weather, if it slips, watch online, status), each linking to its section. Duplicated or background blocks move into native `<details>` boxes, closed by default.

Experience OS fit: P01 (answer before controls, details expand), A21 (no horizontal overflow from jump links: single `minmax(0,1fr)` column on phones), "unknown state not hidden" (the glance says "Not forecast yet" rather than hiding a row).

## Rules kept

- Primary answers never fold: map `#rl-coast-map`, `#rl-access-decision`, sky `#rl-regional-sky`, delay planner `#rl-slip-lab`, weather, webcasts, roster. A test enforces this.
- Works without JavaScript: native `<details>`, and the glance rows are plain links with neutral text.
- A jump link or deep link into a folded section opens it (`revealHash`).
- The glance makes no requests; it reads data the page already loaded.
- Folded content stays in the HTML, so it is still indexed.

## Evidence (local browser against live production data, Nov 14)

| Width | Height before | Height after | Horizontal overflow |
| --- | --- | --- | --- |
| 360 | n/a | 22,322 | 0 |
| 390 | 28,004 | 21,213 | 0 |
| 768 | n/a | 16,117 | 0 |
| 1440 | n/a | 13,235 | 0 |

Glance values for Vulcan LV-01: 5 public spots, with directions; Sunny, 12% cloud; Open the official 45th Weather Squadron forecast; Same sky if it slips; 2 spaceport cameras; Go for Launch. Keyboard Enter opens a fold; `#rl-sites` deep link opens its fold; no-JS render shows 6 glance links and 4 folds; no page errors.

Stages: implemented and locally browser-verified. Not yet deployed; no visitor outcome measured.
