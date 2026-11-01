# Michigan Growing Season Explorer — Experience OS v1.2.1 brief

**Date:** 2026-11-01  
**Canonical:** https://chrisizworski.com/michigan-gardening/  
**Owner:** `izworskic/chrisizworski-com`, `public/michigan-gardening/index.html`  
**Scope:** upgrade the existing planting explainer and season chart; preserve the MSU-only decision engine and its canonical URL, no additional harvest or fall-crop estimates.  
**Status:** implemented in feature branch; CI, browser visual QA, merge, deployment and live publication not yet established.

## The problem and the decision

The original dated-bars chart showed only five crops with calculated windows, excluded soil-dependent crops, rendered open-ended bars to July 31 (a display boundary), and had no crop-by-crop explanation. A visitor looking at May 9 might read it as a frost-free guarantee or mistake a bar for a harvest period. Visitors wanted to know **what to do next, why that date exists, and what their own soil changes**.

The existing answer-first heading and conditional PlantNow engine remain authoritative. The new visitor journey follows one crop through sourced steps, preserves the selected crop across station/soil changes, and offers a full-chart drill-down rather than leading with undifferentiated bars. No new tool route or indexable duplicate is created.

## Research, 2026-11-01

- Michigan State Climatologist / MSU official frost probability table, https://www.canr.msu.edu/resources/frost-free-dates and https://k8s-msu-msuprod2-d4425984bb-1723155632.us-east-1.elb.amazonaws.com/resources/frost-free-dates . Bay City: 50% May 2, 25% May 9, latest recorded May 26. Percentiles describe risk of a 32°F freeze **on or after** the date, not a guarantee about this week's forecast.
- MSU Extension, *Planting a Smart Vegetable Garden*, https://msu-prod-2.dotcms.cloud/resources/planting_a_smart_vegetable_garden (2023). It encourages using frost probabilities and garden conditions, not a blindly chosen "safe" date.
- MSU Extension, *How to Plant Vegetables*, https://www.canr.msu.edu/uploads/resources/pdfs/plantingveg.pdf (2009). Existing engine source of indoor six-to-eight weeks, hardening seven-to-ten days, workable soil, 40°F and above-60°F germination gates.
- The Old Farmer's Almanac planting calendar, https://www.almanac.com/gardening/planting-calendar (checked 2026-11-01), is a useful counterexample for a comprehensive ZIP-to-table index with many crops. It does not address the source-limited Michigan engine's missing starts, or center the explanation for a chosen crop.
- GrowVeg Garden Planner, https://www.growveg.com/garden-planner-intro.aspx and https://www.growveg.com/downloads/gardenplanneruserguidev3.pdf (checked 2026-11-01), is a counterexample for a full garden plan and months-bars chart. Its chart supports detailed garden planning but would not fix the original chart's missing soil-gate narrative.
- Newly found MSU Lower Peninsula Garden Calendar (2026), https://k8s-msu-msuprod2-d4425984bb-1723155632.us-east-1.elb.amazonaws.com/resources/garden_planning_calendar, appears relevant to a future **separate source validation** of the fall planting rules. It is **not silently merged** into the older, independently tested PlantNow engine.

## Two approaches

**A. Redraw every crop as an animated 12-month Gantt.** Pros: easy scanning. Rejected as the primary view: the source does not give start/stop dates for soil-controlled crops and has no harvest windows. Adding illustrative bars would turn research gaps into false precision; mobile readability and July 31 interpretation would remain difficult.

**B. Crop-first field journal with a source-backed seasonal sequence, and the Gantt folded below.** Chosen. Deliberate distinctive identity: typographic field-notebook palette, sequential "chapters," prominent frost threshold interpretation, crop-specific conditional explanations, and explicit unavailable states. No animation, autoplay, generated garden imagery, map or framework migration. The original station-based crop table stays available.

The existing **Zone 6a Planting Calculator** is a broad 47-crop planner. The existing **Michigan Frost Dates** tool is a probability-lookup page. The new page differs from both by interpreting an individual plant's sequence and connecting that reasoning to soil decisions without expanding unsupported dated coverage.

## Connected state matrix

| Scenario | Selection | Expected visitor result | Source boundary |
|---|---|---|---|
| First load: Bay City, May 12 | tomatoes, transplant chapter | indoor Mar 14–28; harden Apr 29–May 8; planting from May 9; current result from engine | 25% threshold is not a safety promise |
| Change crop to beans at 55°F | beans, warm-soil story | waiting for 60°F soil; no fictitious sow date past threshold | thermometer at planting depth needed |
| Same beans at 64°F | beans, same ID | current engine changes to plant now; text and table row change together | no harvest promise |
| Switch to peas and workable soil | peas, soil-workable story | a decision without a fabricated Gantt bar | no fixed MSU sow date |
| Switch to garlic | garlic, missing-data story | not reported, no fabricated rule | separate fall guide remains linked in seasonal jobs |
| Change city to ZIP 49783 | selected crop persists | Sault Ste. Marie station dates, crop chapters and chart agree | no interpolation between stations |
| Crop A → B → A, manual stage | selected crop and chapter | stage description, selection button, table row and chart highlight synchronized; link restores crop | not merely visual hover state |
| JavaScript blocked | Bay City tomato static example | readable May 2/May 9/May 26 interpretation and MSU explanation | cannot personalize without JS |
| No tiles/photo | N/A | source narrative remains completely functional | none is required |
| Unknown place | last valid location | old answer persists, warning appears in location field | no invented station |

## Source and display contracts

The `PlantNow` engine owns all dates, status and soil thresholds; `season-story.js` narrates its existing data, and does not become another independent date source. `crop` is optional in the existing shared link, defaulting to tomatoes. Old location, date, soil and workable-soil parameters remain accepted. Keep the original table, facts, legend, full chart and MSU source block. No harvested-on date, real-time weather claim, estimated live soil reading, photo attribution or geolocation is added. The July 31 spring-rule cutoff remains explicitly a **display limit, not a deadline**.

## QA / release evidence

- Source patches and regression tests committed on feature branch.
- Automated scenarios added to `tests/garden-tools.test.js`: selection, station, manual chapters, 55°F → 64°F changes, workable soil, missing crop evidence, return A→B→A, URL restoration.
- **Not yet browser-verified:** 360/390/768/1440 screenshots, visual contrast/focus, real browser tab interaction, no-JS experience. Do not classify this as verified or live.
- Required merge gate: `npm run verify:all`. Must pass before merge. CI results may be affected by separate ongoing site PRs; diagnose rather than override.
- Distinctiveness criterion: NOT a cloned map, park hero, garden table, or shared chart; its signature is the connected agricultural-season explanation.
- Outcomes (CTR, dwell time, task completion) **not measured**.

## Transferable lesson (hypothesis, awaiting browser verification)

A source-constrained calendar should not invent dates for soil-dependent work to fill its visual timeline. A selected-crop story can show *what must be checked*, while the full all-crop chart remains a secondary reference. Test comprehension with novices before calling this a demonstrated improvement.
