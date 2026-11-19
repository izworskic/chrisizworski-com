# Great Lakes Winter Field Desk | Experience Investment

Reviewed: November 19, 2026
Mode: IMPLEMENT, subject to PR review and explicit owner merge approval
Owner: `izworskic/chrisizworski-com`
Research pilot: https://chrisizworski.com/great-lakes-winter-field-desk/
Sources: `public/great-lakes-winter-field-desk/` and the matched working preview
Skill: `.agents/skills/experience-investment/SKILL.md` from pending #1780
Experience OS: v1.2.1; Foundry: improvement cycle 0.3

## Visitor job and baseline

A visitor considering a Lake Superior winter outing wants to **select one kind of day outside, recognize the actual place, and check the relevant park's official conditions and winter arrival before setting off**. Winter terrain and published park policy do not prove same-day route access.

Baseline actual rendered page reviewed on November 19 at 390x844 and 1280x900. The previous design had an oversized two-line hero and a small source-linked first recommendation; the three activity choices began deep into the first phone screen. The interactive three-place map appeared after the entire trip dossier **and** the weather lens, disconnected from the place photo, specific access limitations and arrival guidance. All three choices and map location pins already worked; the November 19 basemap fix had passed real browser verification. This is a presentation/handoff debt, not an excuse to rewrite the forecast or invent current openings.

Protected baseline: exact route and arrival records, NWS hourly forecast, source freshness gates, official notes, noindex status, Person JSON-LD, author/footer identity, existing credited archival photographs, static no-JS content and Google Maps place searches. The scheduled evidence review remains read-only.

## Research anchors

- Minnesota DNR winter map and published Upper Falls approach: https://files.dnr.state.mn.us/maps/state_parks/spk00172_winter.pdf and https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html. Reviewed November 19, 2026. The maintained winter walking approach differs from longer dry-season waterfall circuits.
- National Park Service Pictured Rocks snowshoe route and winter arrival: https://www.nps.gov/places/snowshoe-trail-piro.htm and https://www.nps.gov/piro/planyourvisit/winteractivities.htm. Reviewed November 19, 2026. A marked snowshoe route and seasonal road information are distinct from an opening for a chosen date.
- Apostle Islands NPS hiking and directions: https://www.nps.gov/apis/planyourvisit/hiking.htm and https://www.nps.gov/apis/planyourvisit/directions.htm. Previously reviewed in the existing pilot. The overland Lakeshore Trail is not a route over lake ice.

These sources justify an interpretable **place, outing, evidence and arrival** sequence, not a synthetic open/closed score or new route geometry.

## Two alternatives considered

### A. Full-bleed shoreline map first

390px: entire first screen dominated by map and three selected-place tiles, outing card below. Desktop: map plus a detail sidebar. This would favor visitors already familiar with the shoreline but pushes the named recommendation, official source and access uncertainty below the fold on mobile. It also risks making a map marker seem like a verified parking entrance. A technically working map would be a worse initial decision for a visitor who wants a waterfall walk rather than arbitrary pins.

### B. Working field atlas, selected

390px: concise interpretive title, *named first recommendation*, official conditions action and chart jump; three activity choices begin on the first phone screen. The selected outing retains its exact-place archival photo, followed directly by a foldout shoreline chart and a link into route and winter-arrival evidence. Desktop: concise introduction and a two-column field workbench. The map is an instrument within the selected outing, not a standalone decorative finale. No new data layer or extra map instance is created.

**Selection:** B. Small to medium CSS/HTML investment. Highest-confidence improvement is reducing scroll before the initial decision and keeping the selected photo, map and official arrival evidence in one reading sequence. Primary risk is nested map sizing or selection synchronization after DOM movement; browser acceptance will test it.

## Distinctiveness

Compared with **Michigan Snow Totals**, this tool does not lead with large accumulation numerals, magnitude bars, or rankings. It leads with a specific verified-source outing identity and a regional map integrated with that outing. Compared with **Gooseberry Falls** single-place visitor guide, it asks visitors to choose among three **different winter experiences** and keeps the map and field dossier synchronized. Source-linked, interpretive destination prose is reused by design, not a cloned component order.

Design material: pale field-paper chart, darker selected trip with an authentic credited photo, compact map/list waypoint rail, and a modest amber chart fold. No generated place images, landscape illustrations claiming to be geography, CSS-only fake charts, new external fonts, or new framework.

## State and preservation matrix

| Scenario | Expected visible behavior | Preserved source truth |
| --- | --- | --- |
| Initial Gooseberry | Selected Upper Falls, chart jump, current-source check | No positive current access inference |
| Select Munising and return to Gooseberry | Selected title, map marker, photograph, arrival and official source change together, then restore | No adjacent trail closure contamination |
| Switch to Meyers Beach | Overland Lakeshore Trail and named Meyers arrival | Lake ice never becomes a route |
| Select tomorrow | Day-specific NWS lens, route access stays independently unknown | Forecast cannot open trail |
| NWS failure | No false weather verdict | Land manager evidence unaffected |
| CARTO outage | OSM raster fallback with three visitor locations | A map pin is not parking |
| Both map providers fail | Accessible written destination list and original links | No invented directions |
| JavaScript unavailable | Static first Gooseberry plan and park links | No fabricated update state |

## Implementation and QA contract

Changed: only the two matching HTML pages, two matching CSS files, targeted Node markup tests, existing Winter Field Desk Chromium acceptance script and this brief. No visitor data, API, JavaScript business logic, geolocation, custom tiles, plugin, AdSense, canonical, indexability, sitemap, Vercel function or build step modifications.

Before views inspected: 390x844 and 1280x900 on the public baseline, November 19, 2026. After evidence must come from the PR preview or exact-head browser QA; do not count an emitted screenshot file without inspecting the render. Responsive targets: 360/390/768/1280/1440; chart tiles; text contrast; keyboard; reduced motion; A to B to A; denied/offline/weather/map failures; static no-JS fallback.

## Post-implementation visual review (November 19)

Actual Chromium QA screenshots were inspected from GitHub Actions run `44568716178`, including `desk-390.png`, `desk-1280.png`, `chart-390.png` and `chart-1280.png`. This proves rendered interface appearance on the tested localhost preview, not a public deployment. At 390px the first recommendation and all three activity choices start within the first phone viewport. The active choice is visually distinguished and the chart uses genuine loaded OSM raster tiles. At 1280px the selected destination's source-credited image, chart and list form a coherent trip-reading sequence. No synthetic illustration or change to mapped coordinates was introduced.

**Follow-up map investment approved by the owner:** Keep all three documented visitor-area markers visible after changing the outing. The map now fits the immutable three-location geographic bounds on initialization, resize, and selection; it highlights and brings the active SVG waypoint forward without zooming to that single destination. A keyboard-accessible **Show all three on map** button restores the overview after manual pan or zoom. The button is hidden when JavaScript or Leaflet is unavailable, while the permanent three-place list and official links remain accessible. This alters no geospatial points, source records, trail permissions, parking instructions, NWS forecasts, or basemap-key/fallback behavior.

The first full-page screenshot captured a sticky sidebar at the prior test scroll position. A test-only follow-up now resets scroll before screenshot evidence; its exact-head rerun is required. Responsive/source/browser tests passed on the prior candidate commit, but results are not transferable to a new head without verification.

### Experience OS acceptance ledger

| Gate | Reviewed evidence | State |
| --- | --- | --- |
| First answer and next step | 390px capture and direct official conditions link | PASS in reviewed viewport |
| Distinctiveness | Real destination dossier plus embedded chart, not Snow Totals magnitude cards or the Gooseberry single-place guide | PASS design review |
| Maps and sources | All three points in bounds on every selection, with explicit map overview reset, existing raster fallback and original official sources | Browser proof required on current head |
| 390/1280 visual hierarchy | Inspected full page and chart screenshots | PASS, with noted map extent limitation |
| Keyboard, no-JS, reduced motion, outages | Existing extended Chromium cases; new chart navigation also added to next run | Verify on current head |
| WCAG AA measured contrast audit | No independent automated contrast scan | NOT MEASURED |
| Production and measured visitor outcomes | No merge or post-deploy metrics | NOT VERIFIED |

**Release state:** source implementation and reviewed earlier screenshots only. The current PR head requires final exact-head full CI, browser and public-output audit. The public pilot remains noindex. Explicit owner instruction is required to merge.

**One next action:** verify actual marker visibility across five viewport widths, map reset and source fallback on this PR head; merge only after exact-head tests and review pass, as the owner explicitly requested.
