# Interaction pattern library — reusable mechanisms, not interchangeable page layouts

A pattern is accepted only when **a visitor action changes meaningful information**, has data provenance, supports the alternative input method, and has a graceful fallback.

| ID | Pattern & best fit | Causal visitor interaction | Required evidence/fallback/QA |
| --- | --- | --- | --- |
| P01 | **Answer before controls** — every decision engine | User immediately sees current answer + data age, expands details | HTML answer visible without JS; unknown state not hidden |
| P02 | **Map ↔ card synchronizer** — parks, falls, public access | Selecting card focuses map feature; selecting feature opens same card | Stable verified IDs, keyboard list, tiles/focus tested |
| P03 | **Time machine** — weather, vessels, phenology | Slider changes *time-scoped* map, labels and verdict | Clear observed/forecast split, timezone, source issue time; no stale "now" |
| P04 | **Two-path compare** — travel, hikes, campsites | Choose A/B and see different distance, verified approach and tradeoffs | Genuine sourced measurements, unknown listed; never invent ETA |
| P05 | **Route-and-elevation lens** — trail explorers | Highlight selected verified route segment and corresponding elevation/terrain | Authoritative GPX/GeoJSON and public access; flat/table fallback |
| P06 | **Proof panel** — live trackers and high-stakes decisions | Click status to inspect observation, freshness, forecast model and confidence basis | Last-seen timestamp, source link, expired/unavailable behavior |
| P07 | **Narrative-to-map handoff** — guides | Select a place in story and locate it with matching photo/map pin | Exact place imagery, credit, location, no false map promise |
| P08 | **Progressive disclosure** — dense weather/technical pages | Reveal advanced layers only after simple explanation | Primary task possible without toggles; keyboard and reset |
| P09 | **What-if lever** — forecast/tools with numeric inputs | Change input and read altered result + "why" | Numerical model/source validated with fixtures, bounds/units clear |
| P10 | **Alternatives after failure** — all outdoor travel | User sees closed/unverified option and a verified different kind of outing | No invented open/available status; source-backed links |
| P11 | **Clustering-to-evidence** — wildlife and sightings | Zoom or filter aggregate to dated individual records | Sampling bias disclosed, age shown, no "no sightings = no wildlife" |
| P12 | **Season journey** — ice, fall color, sap, migration | Period switch reveals historical versus current evidence appropriately | Year/season rollover, archive labels, no last-season as live |
| P13 | **Live operational timeline** — launches, freighters | Select event to reveal known state transitions and links to reliable tracker | No predictive track disguised as observed position |
| P14 | **Shareable decision state** — route planners | Changing meaningful inputs updates a stable share link | Parse/replay safe, privacy, canonical unaffected, invalid param fallback |
| P15 | **Mobile focus panel** — map-heavy tools | Map, card and action use limited viewport with accessible expand/collapse | No double scrolling trap, focus returns sensibly, pinned controls visible |
| P16 | **Selection spine** — any connected experience | Preference, card, map/list, image and detail derive from one stable selected ID; A→B→A restores truth everywhere | Fill STATE_MATRIX; assert visible answer and valid unavailable geometry; check same selected ID under click, keyboard and reset |
| P17 | **Source-backed media handoff** — parks, guides, destinations | Change selected place to a credited exact-subject image and narrative, only after image loads | Image failure/slow A→B race hides previous photo/credit; text-only answer stays; inspect responsive crop/credit |
| P18 | **First-screen decision threshold** — every destination/tool | Choice and primary actionable answer precede secondary storytelling on the narrowest phone | Measure answer/action location at 360/390, and full/deep screenshot; do not impose a one-size fixed hero height |

## Pattern recipe (required in a design brief)

For each selected pattern, document:

1. **Visitor question and primary answer.** Name the decision, not the library.
2. **Inputs and source.** E.g., `selectedTrailId` referencing verified public trailhead table, `validAt` and `issuedAt`.
3. **Changed output.** E.g., one card, route highlight and source-linked access note change together.
4. **Failure.** With map API missing or status stale, readable list and citations remain.
5. **Accessibility.** Native control, visible label, focus, keyboard, reduced motion, alternative to dragging/hover.
6. **Validation.** At least three scenarios and a test proving a changed *decision*, not simply a changed CSS class.
7. **State matrix (v1.2).** Record A→B→A, input-method equivalence, source unit versus displayed unit, geometry/photo unavailable behavior and actual screenshot artifacts using [`templates/STATE_MATRIX.md`](../templates/STATE_MATRIX.md). Follow the [`connected contract`](CONNECTED_EXPERIENCE_CONTRACT.md), including assertions based on user-visible meaning instead of brittle exact descriptive strings.

## When NOT to add a pattern

- User is seeking one exact fact and no additional action is needed.
- Interaction state depends on unverified data, hidden private APIs or map images we lack rights to use.
- New controls add cognitive load but do not improve the action/decision.
- The surrounding tool's map/audio/camera/data source cannot survive failed initialization.
- The proposed interaction would compete with the canonical purpose of another existing site tool.

## For Porcupine pilot

Candidate first pattern: **P02 + P05 + P06**. Choose a verified public trailhead → matching photo and exact map pin/route evidence → parking and seasonal access source panel. Map and route geometry must be independently verified; no route, road closure, or departure-time guarantee can be inferred from proximity. Keep the current static visitor answer and map if the enhanced one fails.
