# Anti-patterns — lessons we must remember even when conversations end

These are **design risks and previously reported complaints**, not claims each issue remains live today. Verify current page before repairing; don't regress an already fixed tool.

| ID | What fails | Corrective rule | How to catch |
| --- | --- | --- | --- |
| A01 | Gigantic hero image hides actual decision | Put answer/action early; photo supports rather than delays it | 390px first-screen screenshot, scroll burden |
| A02 | AI-generated scenery presented as an actual photographed park | Use independently sourced, exact-place rights-cleared photography | Image/source/attribution audit |
| A03 | Identical green-on-green CTA and unclear click targets | Distinct high-contrast text/background, visible hover/focus and action label | Contrast + mobile + keyboard audit |
| A04 | 50 generic cards under unrelated hero | Design a coherent editorial exploration and meaningful grouping | Visitor journey and hierarchy review |
| A05 | Map displays one route line over blank background | Map tile/basemap/load controls/pins must actually render, across zooms | Real browser tile/map visual and error fallback |
| A06 | One-pin-only map for a regional explorer | Map/data model covers correct scope and current selection | Multiple-place scenario |
| A07 | "Live" but last winter's data or unknown source age | Explicit season, issued/observed/retrieved time and expired no-data | Inject stale fixture; verify blocked positive verdict |
| A08 | Park/open-road/trail safety inferred from proximity | Link access authority and caveat; never assert unverified access | Route/parking source audit |
| A09 | Dramatic motion but user decision never changes | Interaction must produce changed, explainable output | Causality tests / no-animation test |
| A10 | Map/filter/graph drift out of sync | One stable ID and state model; selection mirrored everywhere | Select via each control and compare |
| A11 | Control works only via mouse hover or drag | Equivalent button/list/keyboard action | Keyboard and single-pointer tests |
| A12 | 3D/WebGL blocks first answer or breaks low-end mobile | Load optionally after HTML answer; provide accessible 2D/list alternative | CPU throttling, unsupported WebGL test |
| A13 | Repeated unsourced "confidence 92%" or arbitrary "worth 87/100" | Explain observed evidence and subjective editorial comparison | Trace every numeric metric to formula/authority |
| A14 | Tool redesign breaks ads, Person JSON-LD, canonical, indexability | Preserve owning-repo policies and run its gates | Full CI and emitted HTML audit |
| A15 | Agent reinvents existing guide/tracker in wrong repository | Locate authoritative product source before editing | Repo ownership/canonical check |
| A16 | Full-stack migration solely to show off React, Rust or Motion | Smallest justified module; no projectwide rewrite without measurable need | Dependency/performance rationale |
| A17 | A beautiful concept with no actual screenshot QA | Mark review incomplete until browser evidence exists | Release checklist and PR review |
| A18 | Recent research trapped in chat with no actionable entry | Capture source URL, pattern, limitations, test, PR link in repo | Source and release logs |
| A19 | Generic mechanical "data engineering" voice on scenic travel guides | Interpretive, accurate, readable copy supporting sense of place | Read aloud; source and action test |
| A20 | User gets asked to code, locate dozens of photographs or manually track credits | Agent owns research, verification and implementation within tools/permissions | Completion scope review |
| A21 | Scrollable horizontal jump links expand a phone CSS grid to min-content width (17px overflow at 360px) | Keep `grid-template-columns:minmax(0,1fr)`, `min-width:0` and scrolling inside the control | Browser assert document scrollWidth at 360/390/768/desktop |
| A22 | Leaflet fails but the UI still reserves a 430px blank map and spinner | Collapse the failed map into a short linked source notice, and offer non-map full stop browser | Block CDN/tiles in browser and verify placeholder height |
| A23 | Dynamically selected remote photo occupies a large blank panel while loading or after failed request | Hide the panel until a successfully loaded real image is available; keep source/detail readable | Screenshot after selection with slow/broken image requests |
| A24 | Source syntax tests pass but runtime `$().forEach` selector typo prevents all visitor controls | Run real browser interaction tests for every selected major control | Playwright keyboard and click scenarios, check pageerror |
| A25 | Photo/map choice scrolls users away from the updated detail, or is buried after secondary information | Put experience immediately after the core answer and scroll/focus to the changed evidence | Observe viewport before/after photo or marker select |
| A26 | Descriptive test expects a bare route name even when honest map state appends “line unavailable” | Assert the selected ID and meaningful route label while preserving safety/unknown qualifier | Select an unmapped route; make sure map/feature agree and test passes without weakening truthful wording |
| A27 | Desktop featured photo leaves a blank lower panel, or photo/caption composition differs from what source checks imply | Use real loaded image and aspect/layout screenshot; inspect fitting and linked credits | Capture selected photo at desktop/tablet/phone, not just hero and CSS selectors |
| A28 | Source kilometre values get overwritten during a miles-first change, or bike/foot versus round-trip semantics blur | Keep source data and calculation units stable; convert only display with explicit rounding | Unit tests on small/large routes; assert public text distinguishes return and permitted bike/walk segments |
| A29 | Green PR, merge or Vercel READY described as independently inspected live page | Record implementation, verified head, deployed matching merged SHA and public fetched HTML as separate facts | Check exact SHA and canonical public response; mark missing independent smoke NOT VERIFIED |
| A30 | Updated planner and map have different selected trail, photo or decision evidence | One selected ID with a causal matrix; photo request tokens must ignore old async results | Browser A→B→A via all input paths and blocked/slow photos, with matched card/map/answer |

## Severity and repair

- **Block release:** fabricated safety/access/live status, no useful fallback, broken map, invalid image rights, red owning-repo CI, unauthorized ads/canonical changes.
- **Design debt:** oversized hero, repetitive cards, poor contrasts, stale visual pattern. Fix as part of the next measured experience improvement; avoid broad unrelated changes.
- **Technical debt:** library migration, redundant packages, overactive animation. Only fix after evidence of visitor benefit/real regression.

After a legitimate production test reveals a new failure, record **page + screenshot/PR + repro + remedy + re-test**, not just a vague stylistic preference.
