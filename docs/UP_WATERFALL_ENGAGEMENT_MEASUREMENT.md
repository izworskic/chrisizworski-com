# Upper Peninsula waterfall journey measurement — B85

## Purpose
Measure whether visitors use the existing four regional day planners and move between the waterfall hub, its map and the 15 source-gated individual guides. **This measures website interactions, not travel, parking availability, trail safety, or advertising revenue.**

### Existing infrastructure
The established production build runs `scripts/inject-ga4.mjs`, which injects the site's existing Google tag into public HTML pages. B85 adds **no new analytics property, cookies, storage, tracking endpoint, API key, tag manager, affiliate links or runtime dependency**. The small `/assets/up-waterfall-journey-metrics.js` script emits only while `window.gtag` is already present. Ad blockers and privacy settings may prevent measurement, so GA4 totals are not exact visitor counts. No call fails a UI action, map, itinerary, browser test or printable day sheet.

## Event contract (all measured **after deployment**, never backfilled)

| GA4 event name | Trigger | Useful parameters | Interpretation |
|---|---|---|---|
| `waterfall_region_open` | Explicit click from the four day cards, a waterfall result card, a visitor guide, or a waterfall-map popup to an existing regional itinerary | `wf_region`, `wf_surface` | **Navigation intent**, not proof of reading the destination |
| `waterfall_guide_open` | Click an eligible source-reviewed visitor guide from a waterfall result card or waterfall-map popup | `wf_region`, `wf_surface` | Guide discovery, not a visit to the waterfall |
| `waterfall_map_request` | Click a source-reviewed field guide's "Show this waterfall on the map" action | `wf_region`, `wf_surface` | Request; the map may still fail to focus |
| `waterfall_map_focus` | Map deep link attempts to locate the corresponding waterfall pin | `wf_region`, `wf_surface`, `wf_outcome` | `selected` or `unavailable`, **never a verified parking destination** |
| `waterfall_plan_apply` | A regional-day planner attempts to add a preset to the existing six-stop day sheet | `wf_region`, `wf_variant`, `wf_outcome`, `wf_stops_added` | `added`, `already_saved` or `blocked`; **blocked plans count zero stops** |
| `waterfall_day_sheet_action` | Visitor manually opens the day sheet or clicks copy notes, copy link or print | `wf_action`, `wf_stop_count` | Engagement intent. Copy and print clicks are **not proven clipboard or printer success** |

All events carry `wf_version=1`. `transport_type=beacon` requests browser-resilient delivery on navigation. Only four possible `wf_region` values: `munising`, `presque_isle`, `keweenaw`, `black_river`. Surface choices are `hub_jump`, `waterfall_card`, `map_popup`, `guide_bridge` and `map_deep_link`. Eight preset choices come from the previously source-gated buttons; arbitrary query-string waterfall IDs are not emitted. No raw search terms, GPS, IP, referrer, intended visit date, typed input or full URLs enter custom event properties. External land-manager clicks are not counted by this contract.

## GA4 reporting setup — one-time, no Apps Script

To report on parameters beyond `Event name`, in the **existing GA4 property** open Admin → Data display → Custom definitions (menu names may change), and register event-scoped custom dimensions for the following *event parameter* names:

- `wf_region` → "Waterfall region"
- `wf_surface` → "Waterfall entry surface"
- `wf_variant` → "Waterfall day option"
- `wf_outcome` → "Waterfall outcome"
- `wf_action` → "Waterfall sheet action"

Optionally register event-scoped custom **metrics** for `wf_stops_added` and `wf_stop_count`, but event count and dimension splits are enough for the initial investigation. Register before expecting reliable custom-dimension reporting; historical events generally cannot be retroactively populated into new GA4 custom definitions. We cannot confirm the GA4-side registration from GitHub code alone.

### First useful report
GA4 → Explore → Free form. Rows: Event name, Waterfall region. Columns (optional): Waterfall entry surface or Waterfall outcome. Values: Event count. Filter event names beginning with `waterfall_`; use a complete **28-day** window after launch, then compare with the next 28 days. Filter by page path to distinguish hub interactions from individual guide landings.

Questions to answer:
1. **Discovery:** How many visitors clicked `waterfall_region_open`, by region and from `hub_jump` versus `waterfall_card` versus `guide_bridge` versus `map_popup`? This establishes which connections are actually useful.
2. **Planning:** For each region, how many `waterfall_plan_apply` events had `wf_outcome=added` versus `blocked`? Blocked actions are **friction**, not conversions. `already_saved` is interest, not a newly added stop.
3. **Utility:** How often does `waterfall_map_request` lead to `waterfall_map_focus` with `wf_outcome=selected`? Compare counts only as a rough directional indicator because sessions/visitors may differ.
4. **Day-sheet signal:** Count user-triggered `waterfall_day_sheet_action` events. Automated itinerary popover openings do not count as manual engagement.

**Do not calculate a cross-event visitor conversion rate by naively dividing GA4 event counts.** A visitor can click multiple day cards or presets. For a true funnel, use GA4 session/user-level Explore Funnel with GA4's identity and time-window rules. Compare actual Google Search Console clicks and AdSense revenue separately; these events alone **do not prove incremental search visits, AdSense RPM or revenue growth**.

## Release safeguards
`tests/up-waterfall-journey-measurement.test.js` validates the low-cardinality allowlist, no unreviewed identifiers, and the correct scripts on all guides and hub. The full Chromium smoke tests the GA4 calls with a **local fake gtag**, proving the browser workflow without sending events to the real analytics property. The usual full repository, map/mobile, canonical and Name SERP protections run before merge. No change to indexability, sitemap, existing schema, original region presets, eligibility or land-manager source notes.
