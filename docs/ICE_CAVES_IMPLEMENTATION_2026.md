# Michigan ice-viewing tracker: implementation and release handoff

October 19, 2026. Scope: the existing Michigan Ice system, on `feature/michigan-ice-caves-2026`. The research and interaction documents remain the source of the GO decisions. HTML carries the guide; JavaScript provides the planner. No Java server or additional weather provider was introduced.

## Routes and deliberate limits

The hub is `/michigan-ice-caves/`. Detail routes are `eben/`, `sand-point/`, `grand-island/`, `wagner-falls/`, and `tahquamenon-falls/`. Each has its own self-referencing canonical, source-linked access facts, viewing scope, safety, query-first title, Person identity, visible linked creator credit and winter sitemap entry dated October 19.

Sand Point is the added land-based curtain experience. Grand Island is distant viewing from the Sand Point mainland only; its forecast coordinates and road destination are on that mainland. Eben directions stop at the town because private approach/parking permission is unverified. Wagner is a winter-waterfall stop. Tahquamenon is ice-framed flowing water, with no full-freeze prediction. Munising Falls is deferred while its official trail closure persists. Alger is deferred pending verified permission and legal winter arrival. No pages for those two deferred sites were created.

There is no calibrated formation threshold, predicted curtain thickness, lake-crossing route, safe-ice verdict, fabricated drive duration, or automatic best destination based on cold. The supported fallback is report-led formation evidence plus separately labeled weather. The empty report/access ledgers are intentional: no current condition was invented to fill a status card.

## Existing data paths consumed

| Module or endpoint | Role |
| --- | --- |
| `api/ice.js`, existing endpoint | Adds `GET /api/ice?view=caves`; the default six-region response remains available. October requests no longer ask ACIS for future November dates. |
| `lib/michigan-ice/thermal.mjs` | Extracts the existing ACIS `StnData` POST and legacy thaw-adjusted AFDD calculation. All-missing observations return null. |
| `lib/nws-grid.cjs` | Extracts the ski point/grid discovery and allowlisted JSON fetch. `api/michigan-ski.js` also consumes this helper. |
| `lib/michigan-ice/caves.mjs` | Builds dated station histories, separate cumulative FDD/thaw exposure, duration-weighted NWS outlooks and report/access eligibility. |
| `lib/michigan-ice/sites.mjs` | Reviewed destination facts, station assignments, the curated evidence ledgers and deferred-site explanations. |

ACIS and NWS requests run concurrently, with one grid job per distinct point. Point discovery is cached for 24 hours; the cave response has a 15-minute process cache and shared in-flight work. Responses use five-minute HTTP caching with ten-minute stale-while-revalidate. The explicit 30-second `api/ice.js` hosting limit precedes the generic ten-second API rule; point discovery plus grid retrieval can exceed that generic rule. There is no new cron, database, upstream provider or browser-side weather request. No absent GLERL seasonal file is replaced with zero or used to infer a crossing.

The accounting season begins November 1. Before then the current total is null, accompanied by an explicit pre-season explanation. A real, explicitly selected prior-winter reference is available when ACIS returns it. Daily missing values remain missing; exact cumulative totals stop at the first gap and are withheld for an incomplete season. Valid observations and thaw bars remain inspectable. NWS intervals are integrated by their duration and grouped by Michigan local date. Stale forecasts are omitted, including in an old browser tab.

## Maintaining official evidence

Update the two arrays in `lib/michigan-ice/sites.mjs` only after reading the actual dated official source. Commit the evidence through review. Do not scrape social posts or convert a weather observation into a site report. Example record shapes, with illustrative dates only (these are not seeded observations):

```js
// REPORTS
{
  siteId: 'eben',
  state: 'formed', // not-forming | forming | formed | degrading
  observedOn: '2027-01-15',
  publishedOn: '2027-01-15',
  source: 'https://www.fs.usda.gov/...actual-dated-report...',
  authority: SITES[0].manager,
  viewingScope: SITES[0].scope,
  prime: false // true only if the official report supports prime viewing
}
// ACCESS_REVIEWS
{
  siteId: 'eben', state: 'open', reviewedAt: '2027-01-15T14:00:00Z',
  source: 'https://www.fs.usda.gov/...actual-access-evidence...',
  authority: SITES[0].manager, viewingScope: SITES[0].scope
}
```

The server requires exact site, manager and viewing scope, valid dates and an HTTPS source on the site's official host. Publication cannot precede observation or be in the future. Date-only formation reports expire conservatively 72 hours after the start of their observation date in UTC. An open access review expires after 24 hours; an explicit closure persists until a later supported review. These are conservative editorial expiry rules, not scientific ice lifetimes.

“Formed — Prime Viewing” additionally requires the report's explicit prime flag, reviewed-open access, a complete current station history, at least 24 forecast hours, no forecast thaw or observed post-report thaw/gap, and unexpired report/access/forecast evidence. It remains a viewing recommendation, never an ice-safety assessment. The browser removes expired prime labels while a tab stays open. The ordinary “Formed” label retains its official report basis and observation/publication dates; weather cannot generate that label.

At season rollover, review the title year, accounting policy, access facts, deferred sites and station coverage together. Do not retain a stale year's heading while publishing a different season as current.

## Interactions and discovery

The planner supports destination/origin/date choices, next Saturday, up to three comparisons, separate observed cold/thaw tracks, date inspection with buttons or a date input, the dated observation table, a three-step explanatory SVG, share/reset and Back/Forward. Detail selectors navigate to the other destination's real route so static facts never describe a different selected site. Query strings are allowlisted choices and cannot set formation/access evidence.

All six routes have useful initial HTML and safety text without JavaScript. With failed sources the weather/history module is omitted or explains its missing evidence; no failure is relabeled as zero or pre-season. The real NPS reference photo is locally served as `curtains.jpg` (1200 × 733), sourced from `https://www.nps.gov/piro/planyourvisit/images/P1049311_1.jpg?maxwidth=1200&autorotate=false` via the official winter-activities page. Its visible caption identifies Pictured Rocks, NPS, 2024 and explicitly says it is not current conditions. It is not presented as an Eben or Grand Island current photo.

Inbound links are in the Michigan Ice hub's generator, Eastern U.P. snowmobile generator (the region covering Munising), Munising and Paradise/Whitefish Point aurora pages, and Tools directory. Outbound links connect Michigan Ice, snow totals, Eastern U.P. snowmobile, XC and relevant aurora context. There is no existing Munising-region Michigan Ice detail route to invent. The registry owns the new ice-viewing intent separately from lake-ice conditions. Visible FAQs match FAQPage schema; the hub's five tracked destinations match ItemList schema. Each eligible page includes the existing ads loader; its presence does not prove ad delivery.

## Verification and remaining release gate

Focused model tests cover cold versus thaw, missing data, local season boundaries, forecast duration/expiry, forged/future/wrong-scope reports, insufficient forecast coverage, access closures, thaw vetoes and shore-only Grand Island behavior. Existing ice and ski tests are also exercised by the full repository gate. Date fixtures were updated because the existing hub and aurora pages gained real editorial handoffs; the ice generator base-path test now explicitly allows the requested ice-caves sibling handoff.

Browser smoke script: `scripts/ice-caves-browser-smoke.cjs`, with the actual existing handler served by `scripts/ice-caves-smoke-server.mjs`. It covers six routes at 320/390/1280 pixels, reference image loading, no horizontal page overflow, history inspection, schematic controls, road origin, shared state, Back, copy/reset, keyboard input, 200% layout zoom, late responses, JavaScript-disabled safety, and HTTP-failure fallback. Local testing uses Playwright installed outside the repository, with `ICE_PLAYWRIGHT_MODULE` pointing to that installation. `ICE_BASE_URL` can target a deployed preview or production URL. Prior-winter chart checks are specifically the October pre-season acceptance scenario; adapt that selection after the season starts.

The complete production build was exercised successfully, including emitted ads/entity audits. The final repository gate passed all 53 steps. Expanded browser checks passed all 18 route/viewport flows plus the failure, keyboard, zoom, late-response and share/reset scenarios. Exact revision and deployed-preview results are recorded in the PR. Do not call the feature production-verified before owner merge, a READY production deployment for the merged SHA, and a smoke pass against the real canonical URLs and `/api/ice?view=caves`.

After deployment, verify all six HTTP responses/canonicals, live NWS issue dates or an honest omitted module, labeled pre-season history, the real historical archive when selected, the winter sitemap and inbound links, and the persistent Eben/Grand Island safety text. The forecast and station dates must be inspected separately from the response generation time. No sibling winter build should start before that production verification.

Release evidence: [PR #1076](https://github.com/izworskic/chrisizworski-com/pull/1076), implementation `cbfc182a5cbf5472514cc9ff8dfea388f9265f2c`; [Node 22 verification/build/public audit](https://github.com/izworskic/chrisizworski-com/actions/runs/39238447518) passed. Vercel deployment `dpl_EA8XTZqoffLoUZfp8DUxE3jurZm1` is READY for that revision. Protected deployed-page testing remains blocked by Vercel connection authorization (403); local CLI is logged out. All 18 local actual-handler browser flows passed. No deployed-data or production smoke success is claimed.
