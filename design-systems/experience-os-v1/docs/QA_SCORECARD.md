# Experience release scorecard — 100 points, evidence or "not measured"

Grade each category from 0–5 only after observing real behavior. Weighted contribution = (category score / 5) × weight.

| Area | Weight | A five means |
| --- | ---: | --- |
| The visitor can answer the real decision | 25 | Direct answer + next action, clear alternatives, three journeys work |
| Distinct editorial/visual composition | 15 | Real sense of place or event; purposeful hierarchy; no generic repeated template |
| Interaction has causal utility | 15 | Meaningful input → changed output; map, cards, chart, detail synchronized and reversible |
| Truth, provenance, status and access | 15 | Source/issue/checked timestamps; verified rights/access; unknown/stale safe and explicit |
| Visual execution and photography | 10 | Appropriate compact hero, exact-source image, readable typography and contrast |
| Mobile, keyboard and accessibility | 10 | Tested 360/390/768/desktop, touch, focus, no-JS, reduced motion and assistive labels |
| Performance and resilience | 5 | Measured versus baseline; no heavy first-answer dependency, live/API/map failure fallback |
| Integration and site integrity | 5 | No unexpected ad, person schema, canonical, internal-nav or owning-repo regression |

**Release expectation:** >=90/100 **AND** every category >=4/5 **AND** all hard gates passed. No assumed grade: unrun browser checks = **NOT MEASURED**, not a pass. In v1.2 a green syntax test or screenshot alone cannot prove interaction, live-public deployment or real user benefit.

## Non-negotiable hard gates

1. Source truth: live, observed, forecast, estimated, simulation and editorial labels distinguished; stale data cannot silently produce "good/open/safe".
2. Exact destinations, parking and routes verified against authoritative sources; when uncertain, say so, do not imply safe/allowed access.
3. Images: original real-place match, license, permission, linked credit, crops and deep-scroll load tested. AI-generated destination imagery cannot pretend to be real photography.
4. Useful static HTML answer and official links with JavaScript disabled; clear loading/empty/error state.
5. Maps actually render underlying tiles across zoom levels with markers and controls and attribution, with usable list/OSM fallback; a line on a blank map **fails**.
6. Interaction not hover-only or drag-only: keyboard and single-pointer alternative, no loss of focus, no unannounced hidden control; appropriate accessible targets and reduced motion.
7. Test 360px, 390px, 768px, desktop and a low/slow device scenario; no horizontal scrolling/overlap/green-on-green CTA.
8. Verify no unapproved AdSense, tracking, Redis, canonical/Person, indexing, map-key or source/ownership changes.
9. Owning repo full tests and CI green, actual rendered review done; **never merge while red**.
10. Evidence of result (test output, screenshots, PR details) recorded, with production smoke status truthfully stated.
11. **Connected state (v1.2):** selected ID, detail, card, map or explicit unmapped state, optional photograph/credit, source qualifier and native control agree after initial load, alternate and reversal. Test no-JS and keyboard equivalents where meaningful.
12. **Media resilience (v1.2):** slow/error/no-photo states preserve meaningful answer; prior async image loads cannot replace the new selection. Inspect actual crops and credit links at four viewport widths.
13. **Units and narrative truth (v1.2):** conversion changes display only; authoritative values/ranking stay fixed. Descriptive labels can include legitimate safety caveats; tests do not demand their removal.
14. **Release evidence (v1.2):** distinguish passing PR checks, merged commit, READY deploy matching the SHA, independently observed canonical HTML and later visitor outcome measurements. Mark unknown stages NOT VERIFIED rather than calling them green.

## Three mandatory scenario examples

- **Destination explorer:** choose two real trailheads; map/cards/featured detail all reflect the same place, with directions **only when independently verified**; unavailable route geometry explicitly says so. Tiles fail → source-linked alternative remains. A→B→A and a slow/failed photo must not show the wrong place.
- **Time-based engine:** switch dates or times; forecast and confidence actually change; stale observation is clearly expired, timezone shown.
- **Live tracker:** select a ship/flight/lock event; recorded last-seen, forecast/ETA and unknown status stay distinct; no invented live position.

## Measurement record

Use `templates/RELEASE_REVIEW.md`. Include per-area grades and links to screenshots/test logs. Where no browser or measured result is available, explicitly report **incomplete**; do not force the project to a fictional 100/100.
