# Pictured Rocks Planner V5 — October 13, 2026

## Product
Canonical: https://picturedrocks.chrisizworski.com/
Publisher: izworskic/chrisizworski-com (the active Vercel project owns the verified subdomain).
Source: public/labs/pictured-rocks-planner/index.html (remains noindex on the lab path); middleware.ts alone promotes root HTML to indexable on the single canonical hostname.
Promise: Choose water, Chapel or land; then turn a date and party into a credible field plan. No false cruise tickets, route times, closure/sea-kayak clearance or second indexed copy.

## What changes from V2/V3
- Retain all six existing causal persona inputs and existing lake map/three zones, NWS/NPS layer, trip shapes, photo/editorial layer, print/save, and operator list.
- Add visit-date and cruise-departure selection with a source-versioned public schedule. Published times are separate from live seat inventory, confirmed reservations, and operator weather decisions.
- Anchor the boat timeline to a chosen published time, including 30–45 minutes for check-in at 100 City Park Drive, Munising. Remaining stops are explicitly flexible rather than fabricated appointments.
- Warn that a late-day sailing leaves little time for other park stops.
- Outside the verified published window, do not offer a purported departure. State the gap and give west-side land alternatives.
- Kayak timelines never claim a departure until a permitted guide and marine forecast are confirmed.
- Contextual ranger notes explain why a stop earned a place; no generic photo carousel.
- Remove hardcoded CARTO query key; retain CARTO 256px tiles with OSM fallback and a visible NPS official-map path if both basemaps fail.
- Existing responsive UX and keyboard/labelled map controls remain.

## Source & data truth
- Cruise: https://picturedrocks.com/fares-schedule/ reviewed October 13, 2026. Published 2026 season May 9–October 18. Only October 12–18, 2026 has date-level published slots validated in V5: 10:00, 11:00, 13:00, 14:00, 15:30 (Spray Falls) and 17:15 (Sunset Spray Falls). All are timetable rows only, not bookable seats. 2026 Spray Falls duration ~2 hours; adult $56, child age 4–12 $19, under 4 $1; arrive 30–45 minutes early. Revalidate fares and times for later seasons.
- NPS: https://www.nps.gov/piro/planyourvisit/conditions.htm for access; https://www.nps.gov/piro/planyourvisit/maps.htm for offline map; https://www.nps.gov/piro/planyourvisit/safety.htm and https://www.nps.gov/piro/planyourvisit/kayak-tours.htm for guide eligibility and paddling constraints.
- Live API /api/pictured-rocks-live remains existing NWS/NPS derived feed; never certifies marine conditions or operator sailing.
- Retain prior NPS/source photography and attribution; no fabricated trip photographs or forecasts.

## Value and loss functions
Maximum V5 build target 100: trip constraint safety 25; published operator truth 25; map/navigation 15; interpretation/geography 15; resilience/accessibility/mobile 10; SEO identity 10. Targets are not measured satisfaction, ranking or impressions.
Hard stops:
1. Inventing a boat sailing or treating a published schedule as seat inventory.
2. Offering a purported 2027 boat using a 2026 timetable.
3. Recommending independent recreational kayak/canoe cliff paddling or inferring lake safety from shore weather.
4. Scheduling full-day Chapel plus fixed cruise as one-day itinerary.
5. Exposing an indexed lab copy or competing author/host.
6. Showing blocked map without official NPS fallback.
7. Calling it production before CI and live hostname response checks.

## Acceptance
- Run node --test tests/pictured-rocks-v5.test.js tests/pictured-rocks-planner-v2.test.js tests/pictured-rocks-operators.test.js tests/pictured-rocks-subdomain-cutover.test.js
- Run npm test and npm run verify:all where CI resources allow.
- Mobile widths 360, 390, 768, 1280; keyboard tab on forms and map; personas: Oct 14 1 PM cruise, Oct 14 unselected, Nov 1 cruise, 2027 cruise, guided kayak, dog, mobility, full Chapel, Grand Marais half-day.
- Check canonical host indexability, lab noindex, map tiles, NPS fallback, source links, dates, published price labeling.
- The one-million monthly impressions and 5% CTR remain site goals, not a predicted outcome of this single release. Observe indexed 28-day Search Console and actual engagement after release.
