# Great Lakes Winter Field Desk: implementation and experience review

Checked: 2026-11-17. Owner: izworskic/chrisizworski-com. Issue #1751. Draft PR #1752.

## Current stage

**Implemented in a noindex source preview, not merged or publicly deployed.** The prototype is `previews/great-lakes-winter-desk/index.html` with `core.js`, `app.js` and `desk.css`. Its review-only sources and tests are in the same branch. It is intentionally not on the Tools page, sitemap or an indexable canonical; public visitors do not see it.

Visitor decision: Select a documented winter outing by interest and effort, see what makes the place distinctive, read what must be checked before leaving, inspect NWS forecast hours, view a real map and photo, then open the authoritative park information. Not a claim of current safe or open access.

Three independent journeys:
- Gooseberry Falls Upper Falls, Minnesota: winter walking approach maintained by Minnesota DNR, not the whole waterfall network
- Pictured Rocks ski-trail-area snowshoe loop, Michigan: 2.65-mile NPS snowshoe route, not the separately closed Munising Falls Trail
- Apostle Islands Lakeshore Trail, Wisconsin: overland Meyers Beach sandstone hike, not walking across lake ice toward the caves

The source research and two-concept comparison are in `docs/experience-briefs/great-lakes-winter-adventure-lake-superior-pilot-2026-11-17.md`.

## Distinctive experience compared with existing site

The closest products, Michigan Winter Activities and Michigan Winter Weekends, show numerous outdoor experiences and two-day base-town itineraries. This prototype instead puts **one specific field assignment** in focus, with a short answer beside the headline and an activity/effort selector that changes the outing, source, image, place and forecast together. The separate, clickable hour lens describes official forecasts without claiming trail access. The regional map supports the selected assignment rather than dominating the page.

Rejected map-first atlas because it would look and function too much like the existing Adventure Finder and let geography masquerade as suitability. A 390px screenshot showed the initial implementation buried the answer beneath all controls; that design was revised. The refreshed 390px screenshot visibly places an immediately useful, source-linked recommendation before the activity choices. No cloned 12-card grid.

## Technology decisions

| Capability | Choice | Engineering reason |
| --- | --- | --- |
| Primary visitor document | Semantic HTML and scoped CSS | Initial Gooseberry answer plus NPS/DNR source links work without JavaScript |
| Interactive selection, forecast and chart | Dependency-free JavaScript | Stable selected place controls answer/photo/sources/map/hourly forecast; cheap enough without a framework |
| Source weather | NWS /points to official hourly forecast endpoint | Source-issued time, six-hour maximum age, missing/stale failure states, ten forecast periods |
| Spatial view | Existing Leaflet and real map tiles with source-backed points | Scroll-safe, keyboard/button selection, visible list when tiles fail |
| Evidence QA | Offline Python source/rights/freshness auditor | Independent checks of official-domain allowlist, roles, three place identities, photo references and location coverage |
| Rust | Not introduced | Three candidate lookups and ten forecast hours have no profiled computational bottleneck requiring Rust |
| Penpot | Direct connector not available | Source design and browser screenshots are the current visual-review artifacts; do not claim an editable Penpot file |
| Experience OS / Foundry | Standards and research review applied | Distinctiveness veto, source truth, mobile/no-JS/map/photo failures, original interpretation and release proof |

No additional Vercel function, paid data feed, Redis, database, tracking or AI-generated destination imagery.

## Evidence and verification

- Node domain/interface tests: **14 passed, 0 failed** on 2026-11-17, including selected route effort, closed-park precedence, unknown/stale NWS issue time, calendar-local forecast filtering, Google Maps place-search role, first-screen answer and chart/map fallback contracts.
- Independent Python offline evidence audit: **PASS** on 2026-11-17. The first run failed because its longitude bounds accidentally excluded Bayfield and Minnesota; this was corrected and rechecked. This auditor validates source records and provenance; it cannot prove current park access or that photos are live.
- Vercel QA sandbox served preview HTTP 200. Real Playwright Chromium rendered 360, 390, 768 and 1440px with zero JavaScript page errors, no horizontal overflow, Leaflet basemap tiles (at least six), Gooseberry image loaded and ten forecast periods in an isolated NWS response fixture.
- Browser interactions: falls -> snowshoe -> sandstone -> falls selected headings agreed, including selected marker behavior and source link updates. All three destination image bytes loaded; an interrupted NWS response retained a truthful "forecast not available" UI. With JavaScript disabled, Gooseberry official source remained clickable.
- Separate Chromium failure test blocked all map tiles. The visible list fallback appeared. Tapping a different forecast-hour control changed detailed forecast, pressed state and source-safe language. The first-screen assignment and official link updated when choosing sandstone coast.
- Visual inspection: 390px first screen inspected from actual screenshot. It initially hid the recommendation below the fold; after revision the recommendation is on the first screen ahead of the options, with readable typography and clear hierarchy. Desktop and remaining width screenshots were captured by Playwright and layout overflow checked; full independent deep-scroll human visual QA remains outstanding.
- Real NWS point endpoint returned HTTP 200 with GeoJSON from QA sandbox. The interactive forecast tests above used deterministic mocked NWS response fixture, **not** a claim that live production weather data was verified from every park.
- Repository `npm run verify:quick`: **PASS** with one expressly skipped git-history freshness check on the shallow sandbox. No claim that the full `npm run verify:all` release gate has passed unless it subsequently runs green on complete history.

## Sources and photographs

Gooseberry winter waterfall route: https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html

Pictured Rocks snowshoe route: https://www.nps.gov/thingstodo/snowshoeing-at-pictured-rocks.htm

Pictured Rocks current conditions: https://www.nps.gov/piro/planyourvisit/conditions.htm

Apostle Islands overland Lakeshore Trail: https://www.nps.gov/apis/planyourvisit/hiking.htm

Apostle Islands current conditions: https://www.nps.gov/apis/planyourvisit/conditions.htm

Gooseberry image: Chris Light, `Winter_falls_468.jpg`, Wikimedia Commons CC BY-SA 4.0, archival photo. Munising and Meyers image files are on nps.gov and identified as NPS source images, with archival season labeling. Image load success does not independently certify every underlying photography-rights assertion; inspect the specific original NPS captions before publication.

Google Maps actions are **place searches only**. No turn-by-turn directions or claims of verified plowed entrances are made. A park's general permanent trail description is not a same-day access report.

## Gaps that prevent publication

- Automated official park access/closure source reconciliation and dated individual trail verification, with source conflicts blocking recommendations, are not yet connected. The `recommend` core supports injected verified closure records, but the preview currently keeps every unknown as a source-check candidate.
- Road/parking arrival points, public winter permissions and provenance for destination-specific place directions need park manager review before offering directions. No invented travel times.
- Inspect all final desktop/deep-scroll screenshots and browser interactions with real NWS, not only fixtures. Verify source origin/license and editorial photo match for each.
- Full owning-repo CI, main freshness sync and public production smoke remain incomplete. No new indexable canonical, release deployment or GSC outcome should be asserted.

## Quality decision

Pre-publication: **HOLD**. A working, distinct prototype exists, with domain, audit, browser and first-screen evidence. Experience OS score is **NOT MEASURED as a complete release**, not an invented 90 or 100. Its separate distinctiveness veto has credible design and browser evidence, but final source and launch gates are not complete.

Exactly one next action: **Wire dated official land-manager access observations into the existing closure-precedence model, with conflict/stale/no-data fixtures for all three outings, before approving a public release.**
