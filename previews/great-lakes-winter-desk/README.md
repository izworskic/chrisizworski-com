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

## Park arrival, parking and actual notice sources (2026-11-17)

The desk now has a separately audited \`arrival-evidence.json\` for each exact outing:

- **Gooseberry Upper Falls:** Minnesota DNR winter map locates the winter route at the visitor-center/DOT wayside parking area. The park address is 3206 Highway 61 East, Two Harbors, MN 55616. No vehicle permit is required at this particular lot. This is a *published winter arrival*, not a daily plow or available-space report. Source: https://files.dnr.state.mn.us/maps/state_parks/spk00172_winter.pdf
- **Pictured Rocks marked snowshoe route:** NPS identifies the ski-trail parking lot near the end of East City Limits Road as the correct snowshoe arrival point, and says those lots are plowed in winter. The park's other winter roads can be unplowed or snowmobile-only. This is a seasonal statement, not a same-day plow report. Source: https://www.nps.gov/places/snowshoe-trail-piro.htm
- **Apostle Islands Lakeshore Trail:** NPS identifies the Meyers Beach lot and exact street address, 90500 Meyers Beach Road, Bayfield, WI 54814. Its winter plowing/road opening is not established. It has parking fees and a 45-foot vehicle length limit. A Google Maps driving link may route to this operator-published lot address, not to a beach, sea cave, or moving target, and is accompanied by a strong winter access caveat. Sources: https://www.nps.gov/apis/planyourvisit/directions.htm and https://www.nps.gov/apis/planyourvisit/fees.htm

The browser never substitutes a scenic feature pin for a trailhead or suggests driving on unplowed roads. Google Maps place searches remain available for all three; turn-by-turn directions are restricted to the exact published Meyers Beach street address. No fabricated coordinates are recorded.

\`scripts/audit-winter-desk-arrival.py\` checks three route identities, official source hosts, the plowing classification, explicit unknown current access, and directions allowlisting.

**Operator notice reconciliation:** \`scripts/refresh-winter-desk-operator-notices.py\` requests three specific official NPS/DNR pages and matches exact documented statements. The corresponding JSON is \`operator-notice-monitor.json\`. The November 17, 2026 run found all three:

- DNR still describes the Upper Falls approach as the maintained winter walk
- NPS lists the **different** Munising Falls Trail closed until further notice; this cannot close the marked snowshoe loop
- NPS publishes a conditional closure policy for Meyers Beach when a park-wide severe-cold closure occurs; this is not evidence that the park is closed at this moment

These are **source statement presence checks** only. The UI hides the statement when the fetched source changes, is inaccessible, or becomes older than 24 hours. It does not turn a page match, forecast, or adjacent closure into route access. The exact selected-date open/restricted/closed decision still requires human-verified, date-scoped evidence in \`route-access-evidence.json\`. That file correctly has zero current operating observations.

Refresh and audit in the working tree before a reviewed publication build:

~~~bash
python3 scripts/refresh-winter-desk-operator-notices.py --self-test
python3 scripts/refresh-winter-desk-operator-notices.py
python3 scripts/audit-winter-desk-arrival.py --self-test
python3 scripts/audit-winter-desk-route-access.py --self-test
node --test tests/great-lakes-winter-desk.test.js
~~~

No background updater or live service has been enabled by this draft. Without an approved refresh process, the dated snapshot is short-lived by design. The user-facing page must say when the official source needs rechecking instead of suggesting that access has been verified.


## Automated official evidence watch and release gate

The workflow is **.github/workflows/winter-field-evidence-watch.yml**. Its schedule activates only after this draft PR merges to main. Until then, it runs only pull-request verification. No site deployment or production data update is implied.

**Cadence:** 05:17 and 17:17 UTC twice daily November-April, then every Tuesday at 17:17 UTC May-October. Standard-library Python checks three official conditions pages and three individually scoped park statements. The monitored statements are published policy, an adjacent-route closure, and a conditional cold-weather closure, **not** six observations that a trail is open.

The monitor produces three dated GitHub Actions artifacts (14-day retention): **source-checks.json**, **operator-notice-monitor.json**, and **monitor-report.json**. SOURCE_SIGNALS_PRESENT indicates that all official pages were reached and all expected statements appeared in visible page text. REVIEW_REQUIRED flags outages, changed wording, stale observations or mismatched sources. A single open issue titled "Winter Field Desk: official park evidence needs review" is created on drift and not duplicated every run. A recovered source does not auto-close an existing editorial-review issue.

**No automatic publishing:** The schedule uses contents: read only. It does not commit to main, overwrite checked-in snapshots, create a live public URL, authorize a route opening, trigger Vercel deployment or change ads. A reviewer must inspect official source evidence before promoting any artifact into the preview. The viewer itself continues to expire stale source statements after 24 hours and will fall back to direct official links.

Operator and publication verification can be reproduced with:

~~~bash
python3 scripts/winter-desk-evidence-watch.py --live --out-dir /tmp/winter-desk-evidence
cat /tmp/winter-desk-evidence/monitor-report.json
python3 -m unittest discover -s tests -p 'test_winter_desk_evidence_watch.py' -v
node scripts/winter-desk-release-gate.cjs --preview
node scripts/winter-desk-release-gate.cjs --release
~~~

The preview release gate checks first-answer content, named-route and parking identities, noindex, static source fallbacks, and that no weather or official-page reachability is interpreted as operator access. The stricter release gate deliberately reports HOLD without route-specific, date-scoped operating evidence and a final human check of image rights, public route, canonical, site ad integration and production smoke. A HOLD is an honest review state, not a claim that the visitor-facing prototype has failed.

Pull requests additionally run a **real Chromium browser acceptance** at 360, 390, 768 and 1440 pixels. It inspects destination selection, source and parking switching, original location photos, map tiles, failed weather and map services, synthetic closure precedence and JavaScript-off source fallbacks. This heavier browser job is *not* part of the twice-daily scheduled monitor, reducing cost.

**Exactly one next engineering step:** create a reviewer-approved operating feed with dated notices for each exact trail and winter parking arrival point before any positive visitor access status or public launch. Do not substitute generic web availability or forecast data.

## Human-reviewed source snapshot promotion

The scheduled watcher produces artifacts only, never visitor-facing data or an automatic publication. Each successful scheduled source run now also attaches a separate unsigned human-review packet containing REVIEW.md, review.json, and approval-template.json. If sources change or fail, the packet is marked HOLD for review; no approval fields are filled automatically.
To promote source HEALTH ONLY to the noindex preview, download the three files
source-checks.json, operator-notice-monitor.json and monitor-report.json from the
winter-desk-official-evidence GitHub Actions artifact into one temporary directory.

Run a dry review on a clean checkout:

    python3 scripts/winter-desk-evidence-watch.py --live --out-dir /tmp/winter-check
    python3 scripts/winter-desk-evidence-promotion.py --candidate-dir /tmp/winter-check --review-out /tmp/winter-review

The promotion auditor independently recomputes every source state and requires five distinct
official URLs across six source checks, six source hashes, complete HTML, matching report rows, approved
operator scope, no OPEN or CLOSED inference, and timestamps within three hours.
Missing or changed source phrases cause HOLD, not an invented reopening.

Review the five distinct official URLs in the generated REVIEW.md, inspect the staged JSON
against the checked-in preview, and complete approval-template.json with a real
human reviewer, current UTC review timestamp, both exact SHA-256 digests and
the explicit no-opening acknowledgement. A claimed identity in this local
receipt is NOT authenticated by the script; require ordinary human PR review.

On a named non-main review branch, after real source review only:

    python3 scripts/winter-desk-evidence-promotion.py --candidate-dir /tmp/winter-check --approval /tmp/winter-review/approval-template.json --apply
    git diff -- previews/great-lakes-winter-desk/source-checks.json previews/great-lakes-winter-desk/operator-notice-monitor.json

The --apply command can update ONLY two source-health JSON files. It never
updates route-access-evidence.json, arrival-evidence.json, public HTML, ads,
canonicals, sitemap or the tool registry. Cron runs NEVER call --apply.
An ordinary PR review and merge remain mandatory for any checked-in change.

Safety regression:

    python3 -m unittest discover -s tests -p 'test_winter_desk_evidence_promotion.py' -v
    node scripts/winter-desk-release-gate.cjs --release

The public release gate will remain HOLD until separately verified exact-date
trail access and parking, photo rights and production URL/canonical/ad checks
are approved. A fresh page-source check cannot authorize a visitor opening.
