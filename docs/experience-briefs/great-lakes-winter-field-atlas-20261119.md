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

**Release state at authoring:** source implementation only. CI, post-implementation screenshots, final Experience OS scored acceptance, production deploy and actual visitor improvement are **not yet verified**. The public pilot remains noindex. Explicit owner instruction is required to merge.

**One next action:** verify the changed real-page screenshots and the exact-head full repository and browser gates, then offer the reviewed PR for owner decision.
