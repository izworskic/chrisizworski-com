# Great Lakes Winter Field Assignment Desk

**Status:** Noindex, unpublished Lake Superior pilot. This folder is not in public output or the Tools directory. It is a functioning source-led visitor prototype, not a current trail-access service.

## Visitor decision

"What kind of winter day can I actually plan along Lake Superior, and what do I need to verify before leaving?"

One assignment is shown at a time. The first mobile screen contains the named outing and direct official check. Changing the activity changes the specific place, real photograph, land-manager source, forecast, Google Maps place search and map highlight together. Length/effort mismatches are displayed instead of pretending that a rugged route is a quick walk.

Selected journeys:
- Minnesota: Gooseberry Falls Upper Falls, short maintained winter walking approach
- Michigan: Pictured Rocks 2.65-mile marked snowshoe loop, not the closed Munising Falls Trail
- Wisconsin: Apostle Islands Meyers Beach **overland** Lakeshore Trail, never an invitation to walk on Lake Superior ice

## Preview locally

Run from the repository root:

~~~bash
python3 -m http.server 8765
~~~

Then open \`http://127.0.0.1:8765/previews/great-lakes-winter-desk/\`.

The first answer and source links remain in HTML when scripts, photographs or maps fail. This is a **preview** and has no public canonical, indexable route, ads or new Vercel service. Do not link the preview from production content.

## Provenance and separate source dimensions

1. **Published route identity:** NPS and Minnesota DNR original route pages, reviewed 2026-11-17. This proves named trail/route and permanent restrictions, not current winter access.
2. **Operator access:** **NOT VERIFIED** for a future date. The browser does not infer "open" from weather or an HTTP response. A verified route-specific closure can block an outing in the pure JS decision model.
3. **Official source reachability:** \`source-checks.json\` records only whether the three official conditions pages responded, at what UTC time, and a prefix hash. It **never** asserts public admission, plowed roads, safe lake ice or groomed tracks. The UI expires its "reachable" indicator after 24 hours.
4. **NWS hourly forecast:** Browser requests official NWS \`/points\` and \`forecastHourly\` endpoints. A source-issued time older than six hours, a missing time, or network failure means no hourly weather claim. A forecast cannot override operator restrictions.
5. **Photographs:** One verified Chris Light 1982 winter Gooseberry Falls photograph on Wikimedia Commons under CC BY-SA 4.0; two NPS-sourced location-specific archival photographs, including a *summer reference* of Bayfield trail stairs. Credits and archive notices are visible. No AI place images.

## Refresh official source reachability

~~~bash
python3 scripts/refresh-winter-desk-sources.py --self-test
python3 scripts/refresh-winter-desk-sources.py
python3 scripts/audit-great-lakes-winter-desk.py --check
~~~

The refresh worker uses only official listed URLs. Request failures produce \`UNAVAILABLE\`, not last-known success. The generated output belongs in a reviewed build or scheduled workflow later, but **no scheduled refresh** has been activated by this PR. Do not publish a "checked just now" claim when the snapshot has expired.

## Run tests

~~~bash
node --test tests/great-lakes-winter-desk.test.js
npm run verify:quick
npm run verify:all
~~~

The complete repository gate matters. For actual browser proof after installing Playwright + Chromium in a separate QA environment:

~~~bash
WINTER_DESK_BASE=http://127.0.0.1:8765/previews/great-lakes-winter-desk/ node scripts/winter-desk-browser-qa.cjs
~~~

The script checks 360/390/768/1440px, real image and map loads, source IDs, A to B to C to A state changes, failed maps, absent NWS weather and no-JavaScript fallback; it writes screenshots to \`/tmp/winter-desk-browser-qa/\` by default. It uses **mocked NWS responses** for repeatable browser coverage. Real-time NWS page reachability and official-current-access confirmation are separate checks.

## Architecture and next release gate

- HTML/CSS/vanilla JavaScript chosen because three named outings need no framework migration.
- Python chosen for a repeatable source and rights quality audit and official page reachability snapshots.
- Existing Leaflet map with list fallback is sufficient for three points. Dynamic MapLibre, React, Rust and Java are **not** added merely for a technology checklist. Rust becomes worthwhile when regionwide geographic ranking warrants an independent shared numerical engine.
- Experience OS v1.2.1 and Experience Foundry 0.3 requirements control distinctiveness, truthful status, original interpretive copy, keyboard behavior, photo licensing and release review.
- Penpot connector was not available in the working app; no claim an editable Penpot file was generated. Current design evidence is browser screenshots and source CSS.

**Do not merge for public launch yet.** Build date-scoped, exact-trail official operator access/closure observations, reconcile conflicts, inspect final photographic source rights, and pass the latest full CI and browser release gate. Chris controls merge. No ads or SEO surfaces have been changed.

## Exact-route access evidence, not an inferred park status

\`route-access-evidence.json\` provides a separate record for each named winter outing. It contains a human-reviewed, permanent route-policy statement and an intentionally empty array of **date-scoped operating observations**. It is not a green "open now" display. The current browser shows named-route winter guidance and a clear unknown access state for the selected date.

A future dated operator notice can be entered only when a reviewer has checked the official NPS/DNR page for that exact route. The observation fields are \`routeId\`, \`scope: exact-route\`, \`reviewMethod: human-official-notice\`, \`routeExplicit: true\`, \`sourceUrl\`, \`sourceStatement\`, \`checkedAt\`, \`publishedAt\`, \`validFrom\`, \`validThrough\`, and \`status\` (\`closed\`, \`restricted\` or \`open\`). Use an actual short operator statement, not invented free text. The reviewer must confirm that a park-wide notice actually applies to the named outing. Do **not** copy a notice about adjacent Munising Falls onto the separate snowshoe trail.

The date and scope logic is implemented in \`core.js\`. It treats ambiguous or stale notices as unknown, blocks an exact-route closure or conflict, and never allows a weather report, generic park page reachability, or unrelated closure to establish a positive verdict. An "open" observation also needs a single named calendar day and a source checked within the last 12 hours. A report without an explicit operating date cannot be used to claim the route is open tomorrow.

Before authorizing any new observation, run:

~~~bash
python3 scripts/audit-winter-desk-route-access.py --self-test
node --test tests/great-lakes-winter-desk.test.js
~~~

The new Python check verifies source identity, exact route scope, evidence timestamps, date windows and record shape. It is not automated authentication of the land manager. The author must actually verify the source and keep the notice updated. **Never add simulated test notices to the production data file.**
