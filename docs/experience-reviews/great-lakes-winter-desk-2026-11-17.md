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

## Current-source second pass and additional browser proof

New build head reviewed November 17, 2026. The previous first-pass findings are preserved above as history, and these newer checks supersede any older targeted-test count or not-run statement.

- **Official source checker:** \`scripts/refresh-winter-desk-sources.py\` now fetches the three corresponding NPS and Minnesota DNR conditions URLs, records HTTP reachability, UTC retrieval time, final official URL allowlist, content-prefix hash and unknown operator access. All three returned HTTP 200 at 2026-11-17T21:04:50Z. That fact **never** determines whether a particular route is open, whether parking is plowed, or whether walking on lake ice is permitted. \`source-checks.json\` expires its reached indication after 24 hours; the program leaves access unverified.
- **Source-state evidence:** New pure JavaScript validation rejects unknown schema, future/stale source checks, mismatched outing and condition URL, and any claim that a reachability snapshot establishes operator access. Weather and photo selection stale-state races now clear rather than inherit the previous outing's text.
- **Calendar correctness:** Forecast selection now advances a calendar day in each place's local timezone, not 24 elapsed hours. Two tests cover spring and autumn DST boundaries.
- **Current targeted tests:** 17 Node tests passed, no failures. Python source worker offline fixtures and Python evidence audit both passed.
- **Independent full site gate:** \`npm run verify:all\` passed 60/60 stages on reconciled source baseline b88b2b5 (238 seconds) and again on source integration stage 7641472b (224 seconds). Current latest head includes DST and QA harness commits beyond that second full run, so this is not a claim of exact-head full CI.
- **Reproducible browser harness:** \`scripts/winter-desk-browser-qa.cjs\` passed in Chromium on 360, 390, 768, 1440 pixels. Real image bytes and map tiles loaded, ten forecast hours displayed on the chosen forecast day, no horizontal overflow or JavaScript errors, location A/B/C/A selection stayed coherent, a simulated map failure showed the list fallback, NWS failure left official access links, and no-JavaScript HTML remained usable.
- **Repo controls:** No public indexable route, canonicals, sitemap, ad configuration, Tool Registry entry or existing specialist tool changed. A source-check is not a release, and the user-facing tool is not live.
- **Release state:** HOLD for actual operator-access observation integration, final photo rights audit, release scoring and production smoke. No CTR, ranking, task-completion or revenue uplift data is claimed.
- **Exactly one next engineering action:** Add date-scoped operator-confirmed access/closure observations for each exact trail identity, with source conflicts unable to produce a positive "open" status. Keep a missing report as unknown.


## Exact-route access phase, November 17, 2026

After the initial source-reachability work, the visitor decision now has a separate **selected-day, exact-trail access evidence lane**. The first-screen source answer and official route evidence change together when the visitor chooses a new location or forecast day.

### Source-grounded, named winter route policies
- **Gooseberry Upper Falls:** Minnesota DNR explicitly identifies the Upper Falls approach as its only maintained winter walking trail. The longer waterfall circuits are not maintained winter walks. Source: https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html
- **Pictured Rocks marked snowshoe loop:** NPS documents 2.65 miles, blue posts, ski-trail parking near East City Limits Road, and prohibition on using adjacent groomed ski tracks for snowshoeing. Source: https://www.nps.gov/thingstodo/snowshoeing-at-pictured-rocks.htm . The separately closed **Munising Falls Trail** must not be interpreted as a closure of this snowshoe loop: https://www.nps.gov/places/munising-falls.htm
- **Apostle Islands Lakeshore Trail:** NPS describes a rugged overland route from Meyers Beach, with potentially icy/snow-packed winter surfaces and steep, narrow sections. Ice-cave access via Lake Superior ice is separate and NPS controlled. Sources: https://www.nps.gov/apis/planyourvisit/hiking.htm and https://www.nps.gov/apis/planyourvisit/conditions.htm

### Data contract and visitor safety
- \`route-access-evidence.json\` contains three exact route identities, official URLs, sourced winter route guidance, and **zero claimed current openings or closures**. Empty observations are intentional, not a missing synthetic default.
- \`core.js\` now resolves operator observations for a selected site and local calendar day. Status can be \`unknown\`, \`closed\`, \`restricted\`, \`reported-open\`, or \`conflict\` only when a human-reviewed exact-route and date-scoped official notice passes identity, timestamp, validity and source gates.
- A closure or conflict blocks the candidate; unknown never becomes "open". Positive access cannot be inferred from the route guide, HTTP source reachability, park-wide statements, NWS weather, or a multi-day notice. A reported-open observation must specify exactly one day and be checked within 12 hours. Direct official recheck is still required before travel.
- The UI has a separate route-evidence area with selected day, named policy, explanation and official route link. Blocked candidates use access-specific warning wording instead of saying the visitor chose the wrong outing length.
- Weather failure cannot overwrite a valid access warning. A synthetic closure is injected only into a browser test, never the checked-in route data.
- \`scripts/audit-winter-desk-route-access.py\` performs a separate Python provenance audit and rejects incorrect route identity, unsupported source domains, future/invalid date windows, and invented positive access records missing an exact scoped official notice. It does **not** verify the truth of any future quotation. A reviewer must inspect the official source.
- Operator updates are **not yet continuously ingested**. The status for the three published routes remains unknown for an individual visit day unless a reviewed, dated official report is added. No live access verdict or automated authority granted to the system.

### Verification
- Node.js exact-route and date-selection tests: **21 pass**, zero failures.
- Python route-access audit with negative fixtures: **PASS**, three routes, zero current operator observations and no open claims.
- The existing source/provenance audit remains **PASS**.
- Independent full site gate: all **60** stages passed on the pre-final access implementation head, with a subsequent exact-head run still required at the release gate.
- Chromium test passed at **360, 390, 768, 1440px** with real image/map loads, first-screen recommendation, same-session destination selection, no overflow or console errors, NWS failure, map-tile failure, no-JS fallback, and a **browser-only synthetic exact-route closure that could not be erased by an NWS failure**.
- No production pages, ads, canonicals, tool registry, or sitemap modified. Draft PR #1752 remains unmerged.
- **Next action:** Secure and review an authoritative date-specific operator access observation for each exact route before enabling any visitor-facing current "open" badge. In the absence of that evidence the visitor verdict must remain unknown.


## Third engineering pass: official operator statements and winter parking, 2026-11-17

Three distinct practical arrival decisions are now documented and tied to the selected field assignment:

1. **Gooseberry Upper Falls, MN:** Minnesota DNR 2025 winter map gives visitor-center/DOT Wayside parking and short accessible winter Upper Falls approach. The park's address is 3206 Highway 61 East, Two Harbors, MN 55616. Vehicle permits are not required at the visitor center/DOT Wayside lot. Source: https://files.dnr.state.mn.us/maps/state_parks/spk00172_winter.pdf . Parking designation is source-backed, but no daily parking availability or plowing claim is made.
2. **Pictured Rocks marked snowshoe loop, MI:** NPS states that the ski trail lot near the end of East City Limits Road is the official snowshoe staging lot and is plowed during winter. This is separate from unplowed park roads and the washed-out Munising Falls Trail. Source: https://www.nps.gov/places/snowshoe-trail-piro.htm . This is a seasonal plowing policy, not a same-day road status.
3. **Apostle Islands overland Lakeshore Trail, WI:** NPS gives the named parking area and its address, 90500 Meyers Beach Road, Bayfield, WI 54814, plus a 45-foot maximum vehicle length and a day-use parking fee. Winter plowing is not confirmed and severe-cold closures may affect Meyers Beach. Sources: https://www.nps.gov/apis/planyourvisit/directions.htm and https://www.nps.gov/apis/planyourvisit/conditions.htm . Google Maps navigation uses the official street address, not a beach or an ice-cave point, with current access caveat.

The new \`arrival-evidence.json\` is a reviewed, intentionally conservative data contract. \`scripts/audit-winter-desk-arrival.py\` rejects wrong sources, unsupported directions, invented current opening, or false claim of Meyers Beach plowing. The new visitor panel names the actual parking destination, fee/permit difference, relevant seasonal policy, and exact Google Maps role. A useful Gooseberry static HTML answer also remains when JavaScript is disabled.

**Actual published operator statement reconciliation** now uses \`scripts/refresh-winter-desk-operator-notices.py\`, not an inferred status from HTTP 200. The worker retrieves specified official pages, normalizes only visible text (no hidden scripts/styles), and checks for one identified statement per route area:
- Gooseberry Falls DNR: Upper Falls is the one maintained winter walking approach
- Pictured Rocks NPS: adjacent Munising Falls Trail closed until further notice, explicitly **not** the marked snowshoe loop
- Apostle Islands NPS: during a qualifying parkwide cold-weather closure, Meyers Beach area closes, **not** a current closure announcement

All three exact statement anchors were matched to official pages at 2026-11-17T22:03:30Z. Versioned \`operator-notice-monitor.json\` contains checked time, scope, source and hashes, with an explicit \`NOT_DETERMINED\` operator access field. Browser output expires matched wording after 24 hours; failed or changed pages show a direct official-source check, never a fabricated reopening. No date-specific route openings are present in \`route-access-evidence.json\`.

**Proof:** 27/27 targeted JavaScript tests, parking Python negative fixtures, official notice Python source/no-inferred-access fixtures, 60/60 site repository verification steps on the initial integration branch, and Chromium Playwright at 360/390/768/1440 with real photos and map tiles all passed. Browser acceptance exercised A to B to C to A choices, destination parking, notice language, missing NWS, missing basemap and a synthetic closure that remained blocked even when NWS failed. The current final reconciled commit is subject to final CI after syncing with main.

**Launch boundary:** This remains a noindex draft. The monitor has repeatable refresh commands, but no unattended schedule, connected API or day-specific land-manager openings. Without a confirmed refresh workflow the statement snapshot becomes stale after 24 hours. Do not publish any open-now badge or imply that a designated parking area is necessarily accessible on the visitor's date. No ads, Tool Registry, canonicals, sitemap or production URLs changed; no GSC or revenue results claimed.

**One next action:** Establish the approved low-cost source refresh and publication lifecycle for these monitored park pages, then complete authoritative exact-trail day-specific closure/open notices and winter arrival verification before the public release.
