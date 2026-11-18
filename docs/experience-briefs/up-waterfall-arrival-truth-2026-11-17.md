# U.P. Waterfall Arrival Truth: Experience OS / Foundry improvement
Date: November 17, 2026
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/upper-peninsula-waterfalls/
Baseline commit: 69fd9328ad5e1bff3f30f9c971193f59bb80fdb0

## Visitor question
"I found the waterfall. Where can I park, how do I walk in, and is the mapped pin actually a safe arrival point?"

The baseline already has 80 curated destinations, a Leaflet map, Rust/WASM visitability, Python proximity, time-filtered selections, a saved day sheet and source-linked details. The facts are split across popups, hidden card details, individual guides and the day sheet. The waterfall marker is naturally the most tempting click, yet a mapped natural feature is not the signed entrance. The baseline shows directions only for separately sourced parking coordinates, but does not offer a single in-context answer at the map.

## Grounded source examples
- Michigan DNR Wagner Falls Scenic Site map (dated August 7, 2026): https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsT-Z/Wagner-Falls-Scenic-Site-Trail.pdf . The signed lot and 0.13-mile trail are distinct from the waterfall point.
- Keweenaw Land Trust Hungarian Falls Nature Area: https://keweenawlandtrust.org/protected-lands/hungarian-falls-nature-area . Golf Course Road is seasonal and unplowed in winter; upper, middle and lower falls share a sourced road-side arrival, while their hiking approaches differ.
- NPS Munising Falls: https://www.nps.gov/places/munising-falls.htm . The waterfall trail remains closed until further notice. A nearby visitor-center parking area does not make the waterfall reachable.
- Scott Falls Alger County park-side viewpoint versus unsafe M-28 falls-side crossing; see the existing research and published county-park evidence. No exact independently sourced lot point is encoded, so no precision driving directions.
- Tahquamenon Falls is a specialist handoff: Upper and Lower Falls have distinct day-use arrivals. Never collapse both into a single waterfall-coordinate destination.

These dated observations are not current opening guarantees.

## Three opportunities compared
1. **Arrival answer at selection point**: show parking, approach, cautions, source and next safe action as one connected panel. Uses the published 80-card HTML evidence and existing Rust-backed caution review. Strongest direct visitor decision gain. Selected.
2. **Finish verifying all precise parking entrances first**: useful in the long run, but official sources are incomplete for many locations. Publishing guessed coordinates would be harmful. Retain as a separate editorial source-reconciliation backlog.
3. **Generate road-mileage itineraries**: possible with a road-network service, but not warranted without source-verified arrivals. Avoid turning straight-line Python proximity into legal driving routes.

## Two credible designs
A. **Map popup-only arrival checklist.** Tightest composition; works with marker clicks, but weak when Leaflet fails, map popups close, or visitors choose from the static cards. Rejected.
B. **Compact map-companion Arrival Desk.** One persistent selected destination, sourced park/walk/check steps, clickable guide/source and tightly gated directions. Can be selected from map, visit-lens focus, drop-down or result card. No floating photo wall and no duplicated 80-card narrative. Selected.

## First screen and distinctiveness
Unlike a regional itinerary list or generic park card, the selected answer explicitly separates natural-feature geography from a legally documented visitor entrance and names the unknown. The main map remains above the desk; the visitor can choose before reading the full 80-card inventory. This extends the U.P. waterfall map rather than copying Gooseberry's single-park route chooser or the rocket planner's access desk. The layout adds one low-profile evidence surface, not another hero, large photo set or map.

## State contract
- Default is clearly an example: Wagner Falls. Its published DNR lot and packed-gravel/boardwalk route show how the panel works; no live open-now claim.
- Closed: Munising Falls shows an explicit closure and never offers a driving route to the waterfall.
- Unverified: pending or research-only arrival shows no claimed parking or walk instructions and no route.
- Restricted: source-backed park/walk text with restriction warning; no precision parking route without approved coordinates.
- Seasonal: visitor arrival evidence with gate-date caution; do not interpret typical seasons as a live gate state.
- Specialist: Tahquamenon is a separate park planner, not a combined parking waypoint.
- Verified mapped visitor parking: require a data-recorded verified arrival, a bounded regional parking coordinate and an agency/land-trust source URL. Tourism-only published coordinates cannot issue directions.
- Hungarian winter: with a November-April intended month, withhold precision vehicle routing on unplowed Golf Course Road and direct to the trust's published guidance.
- Map/JS failure: static cards and their original source links remain complete. In a no-map JS case the arrival desk still operates; without JS the static card source evidence remains.

No separate runtime API, new Java, REA invocation, Penpot session, map stack, AdSense change, SEO title, canonical, photo or new waterfall pin. Rust and Python engines remain unchanged.

## Replay / release proof
The original page has no single map-companion arrival answer. The new dedicated Node test checks source-gated roles and fallback content. The actual Chromium smoke replays Wagner, Munising, Scott, Saxon, Hungarian winter/summer, Tahquamenon, Bond via map-focus and Agate from result-card choice. It also blocks the Leaflet script to prove independent access to the evidence.

Required: source checks, full verify:all, public site build, visitor browser smoke at phone/desktop, and the existing SEO/person/ad/sitemap safeguards. A green code test is not production traffic, visitor value measurement, or completed field access verification. Full Foundry before/after CLI proof is not claimed unless an actual run with immutable artifacts succeeds.

## Measurement
Compare arrival-panel selections, guide/source opens, verified-parking link openings and successful saved-stop actions on complete post-release 28-day windows only if privacy-safe existing GA4 instrumentation is available. Do not emit new raw search terms, GPS, coordinates, dates or user-identifying events. Do not call a click proof of reaching the waterfall or a revenue increase.

Next source effort: widen documented real parking entrances from the current limited set, working only from park or managing-land-owner maps and a published pedestrian approach. Dead River, Au Train, and Alger remain research-only holds until access authority is established.
