# U.P. Waterfall Experience OS: Penpot map-first pilot

Date: 2026-11-16. Status: feature-branch experiment; not an automatic production redesign.

## Decisions
- **GitHub remains the sole source of truth.** The Penpot mockup is optional design reference, not runtime code or a deployment source.
- The real Rust-backed visit matcher, JavaScript, Leaflet map, 80 curated destinations, licensed photographs, existing URLs, land-manager citations, GA4, structured data, and advertising remain unchanged.
- Move the existing visit matcher and **actual** interactive map ahead of regional long-form trip sections, using server-rendered document order instead of a JS DOM reorder. Move the three credited discovery images immediately after the map to bring the real tool nearer the top.
- Make the mobile map precede the long results list without removing the list. Visitors can still filter, save stops, check land-manager evidence, and read unverified-access caveats.
- Layout and CSS are scoped under `waterfall-experience-pilot`; rollback is easy. No image substitutes or fake live access states.

## Existing visual reference
The importable SVG design trial can be kept in Penpot when a Penpot account/MCP connection is available. This PR implements the same hierarchy concept with the **existing production map and real photos**, not the design's mock map.

## Acceptance and rollout
1. Static regression: `node --test tests/up-waterfalls-experience-pilot.test.cjs tests/up-waterfalls-visit-lens.test.js tests/up-waterfall-hub-photo-gallery.test.js`.
2. Existing Rust suite / CI must be green. Ensure the 80-card catalog, gallery attribution, live map, and shortlist controls are present.
3. In preview, exercise mobile ~390px and desktop ~1440px. Confirm the actual Leaflet tiles and geolocation button, filter selection, visit budget/date, save and copy, regional anchor links, keyboard focus, source URLs, mobile scroll and pinch gestures.
4. Compare time to first meaningful map/filter interaction, map engagement, guide opens, and successful shortlist actions against baseline. **Do not claim CTR or revenue changes without measurement.**
5. If the map produces layout shifts, fails to initialize, or content source warnings disappear, revert this feature branch change before release. Do not modify ads or inference/safety logic to make the layout pass.

No authenticated Penpot MCP session was available in the originating ChatGPT environment, so this PR must not be described as a successful live Penpot MCP test.
