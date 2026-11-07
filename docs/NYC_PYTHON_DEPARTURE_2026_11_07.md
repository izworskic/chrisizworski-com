# NYC Crossing — Python Historical Segment Intelligence
**Design / science record:** 2026-11-07  
**Owner:** izworskic/chrisizworski-com  
**Canonical:** https://chrisizworski.com/nyc-crossing/

## Visitor decision and differentiated experience
The problem is not another live ETA box. A visitor asks: "What do NYC DOT's independent historical observations say about this exact approach/bridge segment around this hour, one hour later and two hours later?" Current live times and toll comparisons remain available separately. The six segment links have distinct physical scopes. Do not claim they form a comparable door-to-door route network or rank one crossing against another.

The visitor selects an audited traffic segment in the existing calculator and reads three explicit New York local-hour panels, source date, historical daily-hourly spread, independent holdout MAE and a modest "historically lighter" observation when the difference is large enough. No animation, new map, selected-user geolocation, new canonical or new ad surface. The answer is truthful in the HTML/without JS: if no approved data, only the live toll/traffic calculator and source guidance remain.

## Architecture evaluation
| Architecture | Outcome | Score |
| --- | --- | --- |
| Keep existing JS live comparison + 8-week NYC DOT current-hour average | No future hour comparison, fragile historical freshness/quality coverage | 69/100 |
| **Python nightly batch → versioned audited JSON → existing Node API + JS panel** | Separate scientific validation from fast visitor path; no extra runtime services; fails closed | **89/100** |
| Python invoked for every visitor/API request | Extra network latency, city dataset load and Vercel runtime cost without demonstrated benefit | 52/100 |

Score categories (0–5) for the chosen approach: visitor decision 5, scientific reliability 4, distinct interface 4, cost/maintenance 5, search discovery 4. Weighted by Python OS (30/25/15/15/15): 89/100. This score is not validation evidence; all hard gates still apply. No redesign of the main crossing product.

## Source and rights register
| Source | Rights | Time/scope | Limitation |
| --- | --- | --- | --- |
| NYC DOT Traffic Speeds, https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds/i4gi-tjb9 | NYC Open Data reuse permitted under portal terms; attribute NYC DOT | Per-link observations, floating timestamp interpreted in NYC wall time. Six exact IDs audited in lib/nyc-crossing/traffic.js | No end-to-end journey, no guarantee of complete archive or access/closure confirmation. Data may be revised. |
| NYC DOT official feed overview https://www.nyc.gov/html/dot/html/about/datafeeds.shtml | Public official resource | Live speeds: separate from archival statistics | NYC DOT's disclaimer and posted-sign supremacy retained |
| MTA rates https://www.mta.info/fares-tolls/tolls/vehicle-types | Official reference | Standard passenger-car rates effective Jan. 4, 2026 | Dates and payment profiles may change |
| PANYNJ rates https://www.panynj.gov/bridges-tunnels/en/tolls.html | Official reference | Standard car rates / NY-bound effective July 2026 | Direction, account, peak and vehicle plans matter |
| Congestion zone https://www.mta.info/fares-tolls/tolls/congestion-relief-zone/about | Official reference | 2026 passenger car charge/credit | Distinct from crossing tolls |

At research time Nov. 7, the public NYC Open Data catalog listed **October 28, 2026** as last data update: do not treat that as today's observations. The initial checked-in artifact is UNAVAILABLE by design. No user-visible historical results or departures are fabricated. Source age limit: 72h.

## Versioned model contract
Python job: scripts/nyc_departure_intelligence.py. Tested scientific worker uses only stdlib and official public Socrata aggregated queries, no Redis/Supabase/new API credentials. Inputs: up to 93 calendar days of official daily-hourly counts + mean travel seconds for exact link IDs, filtered status=0 and nonphysical travel time. Output: lib/nyc-crossing/departure-intelligence.json (schemaVersion nyc-departure-evidence-v1).

Training: 70 calendar days. Last 14 calendar days: independently held out and **never** used for fitting. Daily-hourly means count as one independent date-hour; sensor-poll count is only a data-quality gate. Pattern: weekday/weekend by New York hour, median plus empirical 10th–90th percentile of training date-hours. Baseline comparator: same link's all-hour training median. Only emit a segment with >=100 independent holdout date-hours, >=30 qualified hour slots, >=8 train and >=3 holdout independent days per emitted slot, at least 5% relative MAE improvement and >=55% holdout interval coverage. Read-time schema, exact link/scope, age, source-age and all three time-slot gates apply again in Node. This is **historical descriptive evidence, not a real-time departure forecast**. Holiday/incident/weather variation can exceed the historical interval.

Published JS API states: AVAILABLE (one segment's complete three-hour comparison); PARTIAL (one or more required slots absent); STALE (model/source expired); NOT_COVERED (different/unqualified crossing); UNAVAILABLE (no publication, failure, invalid model). Missing values never become zero travel time.

## Monitoring and failure matrix
1. Valid, independent same-segment holdout: show qualified historical comparisons, interval, n and benchmark.
2. Dataset updated more than 72h ago: Python refuses to replace existing artifact; Node expires prior artifact. No dated "live" claim.
3. No complete 0/+1/+2 hour slots: PARTIAL, not a nearest-neighbor guess.
4. Link ID or scope changed: UNAVAILABLE until re-audited.
5. Future date, malformed/NaN, duplicate conflicts: reject records.
6. No JavaScript: crawlable official 2026 toll table and official links still available.
7. Provider 429/timeout: scheduled refresh fails visibly, no fabricated model and no effect on live tolls.
8. Python holdout underperforms naive baseline: no model publication for that segment.

## Evergreen refresh and operational cost
.github/workflows/nyc-python-departure.yml schedules daily NYC DOT requests. The job checks the independent 2026 rate fixture, trains only on official aggregates, executes Python/JS and full repository gates, and opens/updates a **reviewable PR** for the JSON artifact. The job intentionally cannot silently replace main. A passing GitHub Action is not equivalent to a model PR merged into production. If GitHub Actions cannot open PRs with its token, adjust repository permissions after confirming the policy; do not bypass branch protection. Source may be stale, unavailable or rate rules may change; the schedule does not promise forecasts daily. A future verified source change requires reviewing the fixture and validation gates.

**Toll audit:** scripts/nyc_departure_intelligence.py audit-tolls reads an independently dated official 2026 car-price case fixture; it detects drift in Node engine, not unannounced agency fare revisions. Recheck official rate publications on an appropriate annual timetable.

**Rollback:** revert the UI/API additions and nightly workflow, leave existing toll/traffic engine and static table untouched. The Python artifact is additive. No additional dependencies, storage accounts, keys, or new indexable URLs.

## Acceptance and release
- Python tests: synthetic numerical fixture only, explicitly **not** actual NYC observations; cover training/held-out independence, duplicate conflict, future/malformed values, flat/no-skill result and stale archive.
- Node tests: model source age, exact link ID/scope, three-slot completeness, holdout, A→B→A source selection logic, canonical and no-JS source.
- Full CI: npm run verify:all (contains verify:nyc-python). Preserve existing canonical/Person/ads and no new pages.
- QA: 390px and desktop, keyboard native select, no JS/failure fallback, production page checks. Screenshot/browser verification must be recorded as distinct from static tests.
- SEO baseline: Nov. 5 rolling-28-day GSC /nyc-crossing/: **118 impressions, 1 click, average position 14.34**. Effect not measured; no CTR or revenue gain claimed.
- Production acceptance: exact merge SHA deployed READY + independent canonical/API check. No new source records until approved refresh is merged.

**Next action after initial deployment:** run the first fresh-data workflow, examine actual NYC DOT source ages and out-of-time backtest; merge a model PR only if the original scientific thresholds and release tests pass.
