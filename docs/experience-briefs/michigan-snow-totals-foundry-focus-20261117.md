# Michigan Snow Totals: Foundry / Experience OS / Penpot / REA technical pass

**Date:** November 17, 2026  
**Owner:** `izworskic/chrisizworski-com`  
**Tool:** https://chrisizworski.com/michigan-snow-totals/  
**Implementation:** [Draft PR #1755](https://github.com/izworskic/chrisizworski-com/pull/1755). The previous approved visual pilot is merged. This new pass remains unmerged pending explicit owner approval and final PR checks.  
**Framework:** Experience Foundry 0.3, Experience OS 1.2.1, `ANTI_PATTERNS.md`, `QA_SCORECARD.md` and `CONNECTED_EXPERIENCE_CONTRACT.md`.

## The unfinished visitor task

A visitor selecting the largest source-backed report expects to inspect *that exact NWS observation*: reported inches, place, time, measured/estimated qualifier, authoritative original text and geographic context. The original ranked item stored a base town string, launched an unrelated asynchronous place lookup and could lose identity in ambiguous towns. The map and report list were connected only by approximate town association. This is an Experience OS P16 selection-spine and P02 map/card handoff gap.

**Three opportunities investigated:** (1) exact report identity, map and source synchronization using existing NWS observations; (2) normalized storm-period comparisons, rejected because observers report mixed accumulation durations and no authoritative normalization exists; (3) county reporting-coverage modeling, deferred because no report does not mean no snowfall. The first opportunity directly closes the observed visitor task without speculative weather math.

**Concepts compared:** (A) compact source dossier below the ranked list, synchronized to the existing map, with native button states and a guarded Google Maps coordinate search; (B) map-popup-only ledger, simpler technically but obscures a 390px viewport and pulls keyboard focus away from the ranked action. Chose **A**. Full authored tradeoff, evidence references and replay cases: `experience-foundry/examples/snow-observation-focus-improvement.mjs`.

## What changed in the visitor experience

- A stable `place | county | reportedAt` key now identifies the selected NWS observation. The three ranked buttons, a detail panel and its Leaflet marker use the same row.
- A→B→A restores source, amount, place and observation time. Time-window and region changes explicitly clear the old selected ID, preventing a valid but off-filter marker from pretending to remain selected.
- Selecting a ranked observation reveals the original allowlisted NWS product text when available, otherwise an explicit missing-link explanation. Two nearby reported observations may appear within 25 miles, drawn from the same selected data window. Their existence does not establish comprehensive coverage.
- A Google Maps **search for the reported latitude/longitude** gives spatial context. The link is not directions or a verified address. Coordinates are accepted only within a Michigan bounding rectangle, and the UI states that a report location is not a public entrance, route or parking destination. No latitude/longitude is inferred from a place string.
- Clicking an existing Leaflet circle marker updates the same source panel. A failure of Leaflet or raster tiles leaves the ranked list, original report links and separate full report table useful.
- The number-first answer, date stamp, live-source failures, existing API/cache, current-season charts, canonical/schema, creator identity, AdSense and full guide copy remain unchanged.

## Foundry 0.3 evidence

**Paired source replay:** [Snow report Foundry proof](https://github.com/izworskic/chrisizworski-com/actions/runs/44106997438). Real `improve`/ `assess`/ `prove`/ `assess --proof` ran against baseline commit `9d8a5da` and the candidate. Status: `BEHAVIOR_DEMONSTRATED`, no proof problems. Its five cases cover selection reversal, coordinate-only map search, missing original source, preserved original NWS URL allowlist and crawlable no-JS archive/canonical. The adapter evaluates the candidate's actual source-panel and URL helpers, not merely its labels. It **does not** prove actual page rendering, map tiles or Google Maps external behavior; the Playwright browser suite handles local page and tile behavior separately. The proof artifacts are in the run's uploaded bundle, not published visitor content.

**Browser QA:** [Snow scorecard browser suite](https://github.com/izworskic/chrisizworski-com/actions/runs/44107420984) checked 360, 390, 768, 1280 and 1440px, actual loaded raster tiles, map marker selection, ranked A→B→A, original-source and approximate-location actions, no-JS fallback, aged NWS and ACIS payloads, blocked tiles, blocked Leaflet, API outage, keyboard, reduced motion and axe WCAG AA. A source selection screenshot is in the run's artifact as `selected-report-390.png` and `selected-report-1280.png`. Later source changes require a new green browser run at the exact final head.

## Experience OS state matrix

| Journey | Selected identity and content | Map and alternate path | Failure/reversal criterion |
| --- | --- | --- | --- |
| Initial | No specific observation selected; 56px maximum value remains the timed statewide/region answer | Full Leaflet report map plus ranked list and original NWS archive | No false location or source action |
| Choose A | A's exact reported inches, place, timestamp, source and qualifier; matching rank button pressed | Focus A's existing Leaflet marker; original NWS text and approximate coordinate search | A matches all active evidence surfaces |
| Choose B then A | B replaces A and returning to A restores A's original NWS text and coordinate link | Matching map popup and ranking state, no unintended saved-town change | No stale B detail after returning to A |
| Change window or region | Old selected report clears, new ranking derives from scoped NWS rows | New markers and rankings follow selected period/region | Old report cannot appear as current |
| No map/tiles or JS | Current reports and original archive fallback remain available | Native ranked buttons and full report table; no blank map footprint | Never claim unavailable geometry |
| Stale official feed | Current answer and current-season graphic suppressed under existing conservative expiry rules | Historical context/source archive available | No old data elevated to current observations |

## Penpot, REA and language/tool decision

An [editable Penpot-importable SVG composition](snow-observation-focus.penpot.svg) records desktop and phone hierarchy, including the ranked selection and source panel. SVG elements remain separately editable when imported. **No authenticated Penpot MCP session was available in this task**; this is a Penpot-compatible design study, not an actual cloud file or a completed Penpot MCP review. GitHub remains the production source of truth. The selected implementation is native HTML/CSS/JS, not SVG rendered on the website.

**REA (Reverse Engineer Anything)** was evaluated but not invoked: no REA tool session was available, and the complete first-party JavaScript, NWS API, Leaflet state and browser test sources were already inspectable. On-demand REA is valuable for unknown third-party binary/UI behavior, not needed to extract functions we own. It was not installed or left running, and no reverse-engineered competitor interface was copied.

| Technology | Decision | Visitor and operational basis |
| --- | --- | --- |
| HTML and CSS | **Use** | Native source panel, 8/16px radii, WCAG AA contrast, responsive columns, zero extra build step; keeps crawlable guide |
| Existing JavaScript and Leaflet | **Use** | Only client state needed: exact report key, original-source action and marker synchronization; reuse existing map/tile fallback |
| Rust or WebAssembly | **No** | The bottleneck is selection identity, not CPU-bound geospatial ranking; WASM would add bytes, compiler/build steps and failure points |
| Python | **No new runtime role** | No spatial/forecast model or ETL addition is justified; the server already normalizes and dates NWS/ACIS reports. Python remains useful for offline science only after a validated numerical problem is identified |
| React, 3D, Blender or motion library | **No** | Native controls and CSS solve the observed task without a second state model, large map layer or decorative animation |
| Penpot | **Reference only** | Source-controlled importable SVG, not an active remote editable Penpot workspace |
| REA | **Not invoked** | No connected on-demand backend or unknown binary to reverse engineer |

## Release gate and score

The prior scorecard was **97/100 provisional**. This pass demonstrates a previously unverified connected-state behavior, but it does **not** by itself justify awarding the remaining three points. Manual assistive-technology verification and a production READY + independent canonical smoke after merging are still needed. Real-user conversion, GSC CTR, revenue and field Core Web Vitals improvements are **NOT MEASURED**.

**Next single action:** inspect the final PR #1755 browser screenshots and pass the owning repository's final full CI before approving its merge; only then verify the exact deployed SHA on the public page.
