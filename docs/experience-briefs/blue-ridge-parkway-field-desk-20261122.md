# Blue Ridge Parkway Field Desk: Experience Investment review and implementation
Date: 2026-11-22
Mode: REVIEW then IMPLEMENT
Canonical: https://chrisizworski.com/blue-ridge-parkway/
Owning source: izworskic/chrisizworski-com

## Visitor question
From my Parkway gateway, on my chosen day, with the hours available, which drivable section and stop sequence should I choose? The main utility is a feasible personalized plan, not four generic starting-place cards. NPS status is authoritative; unknown is never an open-road verdict.

## Diagnosis
The original hero was followed by four lengthy live gateway cards before the personalized planner. A visitor ready to decide had to scroll past secondary suggestions. The real scenic image was heavily obscured by generic promotional text. Several labels and explanatory card paragraphs used 10 to 12 pixel type. The dark status panel drew more attention than the actual decision. The map and stop timeline already exist after planning; no additional map engine is needed.

## Concepts considered
**A. Map-first Parkway atlas:** Open on a whole-corridor interactive map with clickable mileposts, with the planner in a side drawer. Strong for geographic exploration, but costly in map accessibility and map-failure states; it delays the personalized answer and suggests unwarranted continuous road access through closure segments.

**B. Scenic field desk, chosen:** Compact headline plus actual Parkway photo; direct action; planner immediately afterward; selected result immediately after the planner; four useful gateway comparisons retained as a secondary exploration section. The selected plan still owns map, stops, fallback and NPS source details. Works when the photo or map fails and does not change data ownership.

Compared with Michigan Snow Totals, this is a route-and-hours decision with a trip form and sequenced itinerary, not a numeric dashboard. Compared with Lake Superior Circle Tour, it centers a same-day gateway choice and official closure hard gates rather than a multi-day geographic atlas. This is more than swapping a header photo or palette.

## Implemented source changes
- Move the existing personalized planner ahead of the snapshot grid; keep route results directly after the form.
- Add a visible planner action and official NPS closure link within the hero.
- Uncover the existing Standing Rock Overlook photo and display the named photographer/NPS source.
- Scoped, responsive CSS for main tool only: calmer ridge palette, legible 14px body text in the gateway cards, clearer form focus and action, no arbitrary pseudo-oval, two-column result metrics on narrow phones.
- Add no-JavaScript path for official road status and stop guides.
- Update main canonical dateModified and its sitemap generator lastmod without changing any sibling canonical dates.
- Update tests to enforce the revised deliberate order. All route scoring, forecast, NPS parsing, map geometry, ad loader, Person and canonical ownership remain untouched.

## Technology fit
HTML/CSS: **keep and use** for first-screen hierarchy, form/accessibility and imagery.
Browser JavaScript: **keep unchanged**; existing Leaflet, route state and snapshot adapter are adequate.
Node/API: **keep unchanged**; the NPS/NWS route engine already owns deterministic feasibility.
Python: **reject** for visual hierarchy; no analytical model added.
Rust/WASM: **reject**; no measured compute bottleneck.
Java: **reject**; no existing Java runtime required.
New backend/service or paid API: **reject**. No Redis, new build step or new production spend.
Rollback: revert this scoped source/test/sitemap patch.

## Evidence and acceptance
Primary sources reviewed November 22, 2026:
- NPS road status: https://www.nps.gov/blri/planyourvisit/roadclosures.htm
- NPS maps: https://www.nps.gov/blri/planyourvisit/maps.htm
- NPS photos: https://www.nps.gov/blri/learn/photosmultimedia/index.htm
- NPS plan your visit: https://www.nps.gov/blri/planyourvisit/index.htm

Static source order and preservation assertions were evaluated before commit. GitHub CI is the source for actual repository checks; browser screenshot review at 360/390/768/1280/1440, keyboard and ad placement remain **NOT VERIFIED** because the connected public-browser run reported insufficient credits. Test NPS unavailable, missing photo, missing map tiles, changed gateway A to B to A, network errors and return/finish modes before merge. Do not infer road openings or claim conversion/SEO lift from a visual source patch. Ads retain existing account-controlled placement and must be inspected in a live rendered page.

Recommended next action: review the PR, complete live mobile/desktop QA with an available browser and merge only if CI and ad/layout checks pass.

## Investment 2: Selected-stop roadbook (2026-11-22)

The map, route sequence, timeline, and individual stop cards share one selected stop. The roadbook shows an official catalog milepost, modeled arrival/dwell, original practical guidance, matched interests and official links. A Google Maps place search is labeled for orientation only, never verified parking or driving directions. Map markers draw before optional GIS corridor data. Failure leaves the stop itinerary and official map links. No route engine or additional infrastructure changes; existing browser JS and CSS are sufficient. Browser screenshots, tile failures, ads and real mobile/touch still require verification before merge.
