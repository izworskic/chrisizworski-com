# Rocket Launch Live: mission-bound public viewing place planner

Date: 2026-11-16
Owning repository: `izworskic/chrisizworski-com`
Public canonical: https://chrisizworski.com/national-tools/rocket-launch-live/
Status: Review branch only. Not deployed. Visitor outcomes not measured.

## Visitor decision

"I found a launch. Where might I actually stand, how can I find the public place, and what access rule should I check before I drive?"

The existing mission selector, source-bound flight desk, access quick-answer, regional guides and Google Maps search links remain authoritative. The new viewing planner provides one optional place selection in the dedicated viewing section. It does not introduce a parallel mission feed, rank parking, calculate a drive time, or say a launch-day public place is open.

## Opportunity review

1. **Place selection with a useful follow-through (chosen).** The access card already shows up to three documented public places, but each is a static item. Visitors can now compare six source-approved places in a compact responsive selector and reveal the selected place's documented role, caveat, Google Maps location, official access source, and link back to the access decision. Chosen place follows the mission's ID and region. No permission is inferred.
2. **Show the selected spectator location on the national atlas (deferred).** The national map is primarily a launch-origin reference. Viewing-site coordinates and safe car entry points do not have one consistent provider-approved contract across six regions. Putting another marker on the pad map risks confusing the range with a public viewing area. First verify each regional place's exact map location in the owning source.
3. **Predict departure, parking and visibility (deferred).** The source does not establish parking availability, travel time, atmospheric trajectory or mission clearance. Reuse existing verified weather, source dates and regional rules, not manufactured planning precision.

## Two credible visual concepts

**A. In-page viewing desk (selected).** The national launch calendar remains first. At the named public-place section, a narrow list of native pressable choices sits beside a focused place dossier, with explicit Google Maps and official-source actions. On phones the choice list sits above the dossier and retains keyboard and single-pointer access. The user may choose A, B, then A without losing the mission ID.

**B. Regional map-first place atlas (deferred).** Place selectors would synchronize a detailed viewing map, conditions, and a focused public entrance for each region. This can be superior for Florida and Vandenberg once validated geo destinations are consistently modeled, but cannot be a reliable national primary surface today for restricted ranges and incomplete exact-place data.

## Penpot and REA adoption boundary

The editable SVG concept file `docs/experience-briefs/rocket-viewing-spot-planner.penpot.svg` is a Penpot-importable layout study. The browser Penpot MCP connection is not authenticated in this session, so this SVG is not claimed to be a Penpot document or a completed Penpot design review. GitHub remains source of truth. The implemented visual arrangement is HTML and CSS and keeps this tool's own design vocabulary.

REA is deliberately **on demand**. No REA binary/MCP session was available here, so no REA output is attributed to this investigation. The findings below come from direct GitHub source inspection and existing first-party UX research. Do not start REA persistently or configure a production-side REA server. When an on-demand REA-equipped environment is available, investigate only the bounded mission-to-place interaction and retain evidence without copying a competitor's protected interface.

## Evidence and comparisons

- Existing baseline `public/synced-national-tools/rocket-launch-live/app.js`, specifically `siteMapHref`, `renderQuickViewingPlaces`, `renderAccess`, and the canonical `/api/rocket-launch-usa` selection pipeline, checked November 16, 2026.
- Existing browser fixture `scripts/verify-rocket-flight-desk-browser.cjs` verifies three Wallops public destinations and excludes restricted launch pads and gates.
- NASA Wallops public viewing policy: https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/
- Kennedy Space Center event admission: https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/
- Next Spaceflight's mission-first interface: https://nextspaceflight.com/
- Closest own-site comparisons: Florida `/national-tools/space-coast-launch/` has richer event-specific place/ticket evidence; Vandenberg `/vandenberg-rocket-launch-viewing/` has a location-first single-coast approach. The national planner differs by preserving one six-region mission while allowing the visitor to choose one documented public location without implying admission.

## State contract

- Initial no choice: no location is implicitly recommended. The picker asks the visitor to select an option.
- Choose place A: selected pressed state, role, public location, source and caveat all refer to A.
- Choose B: all selected-detail content updates to B. Pressed state on A clears.
- Return to A: original details and URL are restored without requesting a second schedule feed.
- Same mission evidence refresh: retain the place only if still present in the current eligible source list.
- Mission or region changes: old choice resets. During fetch the previous details are removed.
- Restricted/no documented destination: no Maps link to a pad or restricted facility; show regional authority link or explicit unknown.
- Source outage or removed mission: clear all previously selected place details and any actions that could appear current.
- No JavaScript: static text links to the Florida regional guide. Other regional authority links remain elsewhere in the page.
- Map tiles or images fail: native place choices and Google Maps links do not depend on a tile layer or image.
- Source caution: Google Maps search identifies a documented public place, never parking admission, official event opening or safe driving conditions.

## Verification and release boundaries

Source-level JavaScript syntax parsed in the editing environment. Browser fixture updated with keyboard choice, A-to-B-to-A reversal, source-caveat preservation, public-location Maps targets, and mission-change clearing at 390px and 1440px.

Full `npm run verify:all`, actual browser screenshots, Penpot visual review, REA diagnostic, PR CI, deployed-SHA inspection, live map imagery and outcome measurement have **not** been completed in this session. They must not be marked passed without evidence. Do not merge until the owner-repo gates and review clear.

AdSense, launch APIs, Rust/Python engines, regional source verdicts, canonical/Person, site navigation and live production are unchanged.
