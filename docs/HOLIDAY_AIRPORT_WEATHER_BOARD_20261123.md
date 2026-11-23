# Holiday airport weather board release review (2026-11-23)

## Visitor decision and data contract
An airline traveler wants to see which of the busiest U.S. holiday airports may encounter weather on each travel day, then check their own route. This remains the only canonical /holiday-travel/ page. The 30 locations are ranked from the 240-airport BTS historical holiday flight count in national.json. These counts are historical, not a current airline schedule or TSA count.

The board shows the NWS forecast issue time per airport (UTC). An alert must be an active NWS warning whose effective period overlaps the displayed local airport day. Forecast cells flag only snow, ice, freezing rain or thunderstorms, using the existing HolidayTravelEngine.forecastFor / hazards and its WX_WORDS / SEVERE logic. A missing alert feed or a day outside the available forecast horizon is unknown. A forecast is not an airline delay probability, and nothing modifies BTS model rates.

Official sources checked 2026-11-23:
- [NWS API Web Service](https://www.weather.gov/documentation/services-web-api), /points, point forecast and active alerts.
- [FAA flight information](https://www.faa.gov/air_traffic/flight_info), separate real-time airport operational delays, which this board does not claim to reproduce.

## Purpose-built experience review
Concept A, selected: 30-airport by 12/16-day matrix. The top page remains the route planner; this comparison surfaces cross-airport patterns without asking the user to open 30 cards. On a 360px phone, the airport name is pinned while days scroll horizontally. On desktop, more of the date sequence is visible. W represents a warning, WX qualifying forecast language, a dot a covered day without a qualifying signal, and ? unavailable. Flagged airports lead directly back into the same route planner.

Concept B, rejected: expandable airport forecast cards. Each airport would need a tap, slowing a national comparison and hiding the geographic concentration of forecast hazards. The no-data behavior and issue times would be more spacious but 30 repeated cards would increase page length significantly. Existing holiday travel's ranking cards already handle route-level alternatives; repeating that shape offers little new value.

HTML/CSS retains the established page and avoids touching ads, canonical or Person. Browser JS is sufficient for the matrix and links, one existing-standard Edge endpoint supports caching. Python, Rust, Java and a new frontend library offer no measurable advantage to this specific interaction; no new database, cron, project or Redis. Existing generated flight figures are not revised.

## Seasonal/cost model
Thanksgiving: fourth Thursday in November, opens the Friday six days before and closes Tuesday five days after. Christmas: December 18 through January 2, inclusive across the year boundary. Outside either period the endpoint returns an immediately computed static JSON response and makes **zero NWS requests**. In season the single CDN cache key uses s-maxage=1800 and stale-while-revalidate, nominally **48 cache-miss refresh opportunities per 24-hour day per cache/region**, depending on requests and provider behavior. One refresh uses up to three NWS calls per airport (alerts, point metadata, forecast), bounded worker concurrency and timeouts. Any individual airport can fail without failing the HTTP 200 response.

## Acceptance and outstanding evidence
- Exact BTS top-30 list, selected counts, date math, year boundary, target weather phrases, NWS partial outage, no em dash and API noindex are asserted in tests/holiday-airport-weather.test.js.
- The separate path-scoped PR workflow checks out full history, runs npm run verify:all and tests Chromium with blocked NWS at 360px and 1440px. It also checks a partial-data 30-by-16 matrix and origin-preloaded planner links.
- Browser screenshots and complete CI are **NOT VERIFIED** until that workflow reports passing and its artifacts have been inspected. No claim of deployment, AdSense uplift or actual visitor outcomes is made.
- Dependency: the static BTS best-days section and tests come from the still-open PR #1874. This change deliberately stacks on its branch; its numerical assertions are unchanged.
- The next step is to inspect PR workflow, fix any failure, review real screenshots, then review merge order. Do not merge automatically.
