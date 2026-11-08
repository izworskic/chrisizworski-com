# Lake Superior Circle Tour — Foundry 0.3 second pass and Experience OS v1.2.1

**Date:** November 8, 2026 | **Owner:** izworskic/chrisizworski-com  
**Canonical:** https://chrisizworski.com/lake-superior-circle-tour/  
**Baseline:** faa4b83712a20f40c97d8ec161fd6d11332808db (the first live independent bridge)  
**Scope:** public/assets/circle-tour-bridge.js and .css, its single embedded HTML section, new tests and Foundry proof; **no changes to any specialist tool, original planner, map, Journey Atlas, ads, or canonical**.

## Visitor goal and observed friction

> “For the stops in my trip, what should I actually check next, why does it matter for this stop, what can I not yet assume, and how do I continue to the next stop?”

The first integration was architecturally sound (approved-only registry, 22 specialist connections, official 511 links, URL-only trip context), but the first visible output was up to six independent specialist cards. A visitor must still prioritize them and establish the current stop. The route chips linked into the original stop cards, not to the connected decision. The original bridge also cleared an explicit focus after unrelated trip selection edits. These are observable source/interaction facts, not inferred analytics or a claim about visitor complaints.

**What the first release did well and must survive:** 31-stop map and itinerary engine; selectedId and applied itinerary query; no copy of park/ferry rules; canonical approved specialist links; four official road source links; graceful no-JS/catalog-error state; Journey Atlas editorial choices; SEO/ads.

## Three opportunity investigations

| Opportunity | New visitor outcome | Existing intelligence | Cost / risk | Decision |
| --- | --- | --- | --- | --- |
| Stop-by-stop decision progression | One useful check, clear uncertainty, progress A→B→A across chosen stops | existing selectedIds, approved catalog, URL direction, stop events | Low integration risk; must avoid claiming that custom selection is road routing | **Chosen** |
| Date-specific live access verdict | Know if a boat, ferry or trail can actually be used on a future date | Future validated operator/official access feeds | High source/TTL risk; monthly season tags cannot prove trips or openings | Defer to independent research |
| Full two-way specialist editing | Destination updates chosen plan across products | Existing specialist tools and route IDs | Cross-owner and cross-repo API changes forbidden in this task | Defer pending approved contracts |

## Credible design references (checked November 8, 2026)

1. [NPS App](https://www.nps.gov/subjects/digital/nps-apps.htm): self-guided park tours, amenity and source information and saved lists support visiting **one place at a time**. The new desk borrows the task sequence and explicit contextual source, **not** NPS data, offline download claims or its interface.
2. [AllTrails route previews](https://support.alltrails.com/hc/en-us/articles/37212870983700-Trail-previews-on-trail-pages): a clear route progression ties a changing selected position to route context. The desk borrows only the principle of an explicit current location in a route, **not** proprietary 3D visualizations, measured trail geometry, elevation or inferred travel time.
3. [Pictured Rocks NPS current conditions](https://www.nps.gov/piro/planyourvisit/conditions.htm): official park conditions are distinct from editorial suggestions. The bridge must send the visitor to a specialist and its sources, rather than interpret a stale alert or infer a safe/current trip from season labels.

### Two viable interaction concepts

**Concept A: a compact stop decision desk (selected).** First useful answer is the visitor's stop, one question and an explicit “what this does not establish” qualifier, followed by the correct specialist action and prior/next controls. Route chips move this exact answer. Remaining expert links are in a collapsed but accessible disclosure, official highway links below. This keeps the page's existing map/itinerary experience primary and creates a meaningful decision transition without creating a new mapping or tracking product.

**Concept B: a route decision checklist ledger (not selected).** Each chosen stop owns explicit unchecked tasks for access, experience and transport; visitors mark checks completed. Its benefit is retaining review progress across a long route and revisiting failed tasks. However, without reliable dated source outcomes it could falsely suggest a manually checked item means “safe/open”; extra state and storage are not warranted before observed demand. It remains feasible as a distinct later phase.

### Distinctiveness hard gate

The two closest existing experiences are (1) the original 31-stop Circle Tour map/7–15-day itinerary and (2) JOURNEY_ATLAS_V1, the visual photo-led experience chooser. The original answers **what route and stops**; Journey Atlas answers **what kind of destination experience matches interests and available time**. This desk instead answers **what independent verification question to resolve right now at a specific chosen stop, and where next in this selected trip**. It has materially different information hierarchy (one large sourced answer, caveat, direct action before secondary links) and interaction (explicit stepper among selected stops, no implicit map navigation, reversible conflict recovery). Reusing the shared map and photographic card shell would fail this distinction. No new photographs or map overlays are introduced.

**Review gate status:** Design comparison completed from real code and external reference documentation. Final visual originality remains subject to actual Chromium screenshots and review; never infer a PASS from stylesheet changes.

## Context, state and source truth

- Stable ID: existing original stop IDs, 1–31 (Whitefish Point is ID 31 between Tahquamenon and Sault). A future tool cannot invent a stop or silently move one.
- Existing shared state: CircleTourPage.selectedIds(), original plan, itinerary and direction in URL, original trip-change/stop-open events. No modification of the planner's source.
- Custom trip: follow the user-selected insertion order **as selected**, not a supposed optimized highway itinerary; disclose this in the UI.
- Published itinerary applied with query itinerary=7/10/15: use the actual saved direction. Clockwise reverses the canonical route, anchored at Duluth. Preview-only direction controls never override a custom trip.
- Explicit focus outside selected trip: preserve it, disclose “not in your saved trip”, and do not invent a next planned stop.
- Choice: a focused stop's approved matches sorted by usual season and stop specificity. One primary decision, question and original caveat; the full secondary catalog is available by disclosure.
- No choice: ask the user to pick a stop rather than guess a priority; no-match shows approved coverage gap, original stop link and reversible “other interests” reset.
- Season: in-season/out-of-season are metadata, NOT source-confirmed operation, ticket inventory, road clearance, accessible trail status or weather.
- Road: official WI 511, MI Mi Drive, ON 511, MN 511 remain external source links; Sault and Pigeon River supply *both* highway jurisdictions. Zero live road verdicts.
- Link continuity: valid first-party canonical opens in a new tab, original selected plan persists in current tab and URL-only return link. No changes to specialists, no fictitious two-way data sync, no geolocation, new cookies or Redis.
- Catalog error: static HTML specialist sources remain and original 31-stop planner continues; bridge never takes over site boot.
- No new map/photo/data layer: existing real map and Journey Atlas imagery remain entirely with their original owners. Blocked original map import must not prevent the independent decision action.

## State matrix and measurable QA

| Case | Expected first answer | Action and reversibility | Source/failure qualifier |
| --- | --- | --- | --- |
| No selected itinerary | “Where do you want to stop?” not arbitrary recommendation | Choose route focus or use original 31 stops | Static guide links work with JS off |
| 11/15/18 selected, July, water | Pictured Rocks specialist question at stop 11, next stop 15 | Choose next, then prior to restore exactly | Operator access/weather unverified |
| Applied clockwise 10-day | Stop 18 first, next 15 | A→B→A; share retains direction | No false drive-time estimate |
| Stop 11, ships interest | No approved specialist for that interest at 11 | Reset to all interests, recover a real result | Missing coverage ≠ park closure |
| Stop 18, February, parks | Pukaskwa listed but outside usual season | Open specialist and verify current access | Out-of-season ≠ closed |
| Explicit 11, saved only 15/18 | Pictured Rocks outside saved trip | Clear focus to return to selected route | No silent state loss |
| Catalog 503/invalid | Static approved links and 31-stop guide | Continue trip independently | No guessed live status |
| Map import/tiles absent | One independent, source-linked decision remains | Use original stop link and specialist | No fake map or routing |
| No JS | Original stop guide and static canonical sources | Normal keyboard links | No reliance on client catalog |

**Measurement definition:** Distinguishable event tool-bridge-next-check-open with approved destination ID, stop ID, interest and season metadata; planned-stop step event is separate. This measures explicit outbound intent **only**, not the specialist's task completion. No new personal coordinates, travel date/event payload or session storage. Before-and-after source replay is behavior proof, **not** conversion evidence. GSC impressions, CTR, observed handoff rate and return rate are NOT MEASURED.

## Release and safeguards

Before approval: generate immutable real-baseline Foundry 0.3 packet using experience-foundry/examples/circle-tour-decision-improvement.mjs, run assess/prove/assess --proof against the exact same nine behavior fixtures, inspect browser runs at 360/390/768/1366/1440 px with keyboard controls, A→B→A, broken map, broken catalog and no JS. Run the OS v1.2.1 evidence verifier plus full owning repo CI and the existing Circle Tour/Journey Atlas/map tests. No release if a specialist, map, original route, ads, canonical, Person metadata or CI gate changes or fails.

**Implementation status:** Changes authored on feature branch. Foundry/OS checks, browser screenshots, original repo CI, PR, merge, production and real visitor outcomes are all separately evidenced; no unverified release claims in this brief.
