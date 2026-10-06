# NYC Crossing Live Traffic Source Audit — 2026-10-06

## Product rule

The NYC Crossing Decision Engine may show an official live travel time only when the measured segment, direction, freshness and source are known. It must not rank unlike bridge/tunnel segments as a door-to-door fastest route.

## Audited crossing matrix

| Crossing | Live source | Identifier / segment | Scope | Delay baseline | Status |
| --- | --- | --- | --- | --- | --- |
| George Washington Bridge | Port Authority | crossingDisplayName = George Washington Bridge, ToNY | crossing + approach | Port Authority historical travel time and speed | connected |
| Lincoln Tunnel | Port Authority | crossingDisplayName = Lincoln Tunnel, ToNY | crossing + approach | Port Authority historical travel time and speed | connected |
| Holland Tunnel | Port Authority | crossingDisplayName = Holland Tunnel, ToNY | crossing + approach | Port Authority historical travel time and speed | connected |
| Queens–Midtown Tunnel | NYC DOT TMC | link 4456510, QMT W Toll Plaza - Manhattan Side | crossing | historical baseline not yet materialized | connected |
| Hugh L. Carey Tunnel | NYC DOT TMC | link 4456501, BBT W Toll Plaza - Manhattan Portal | crossing | historical baseline not yet materialized | connected |
| Brooklyn Bridge | NYC DOT TMC | link 4616339, BQE N Atlantic Ave - BKN Bridge Manhattan Side | approach corridor + crossing | historical baseline not yet materialized | connected |
| Manhattan Bridge | NYC DOT TMC | link 4616340, BQE N Atlantic Ave - MAN Bridge Manhattan Side | approach corridor + crossing | historical baseline not yet materialized | connected |
| Williamsburg Bridge | TRANSCOM | inbound Manhattan corridor confirmed in MTA TRANSCOM analysis | crossing corridor | TRANSCOM registration/feed mapping required | pending registered feed access |
| Ed Koch Queensboro Bridge | TRANSCOM | inbound Manhattan corridor confirmed in MTA TRANSCOM analysis | crossing corridor | TRANSCOM registration/feed mapping required | pending registered feed access |
| RFK Bridge | NYC DOT TMC | link 4456452, TBB W - FDR S MANHATTAN TRUSS - E116TH STREET | Manhattan-side approach segment | historical baseline not yet materialized | connected with limited scope |
| Verrazzano–Narrows Bridge | NYC DOT TMC | link 4763652, VNB E SI GANTRY UPPER LEVEL - BROOKLYN GANTRY UPPER LEVEL | bridge crossing | historical baseline not yet materialized | connected |

## Authority hierarchy

1. Facility authority feed when it publishes a fresh facility travel time.
2. NYC DOT Traffic Management Center link feed for audited TRANSCOM link IDs.
3. TRANSCOM regional travel-time feed where a facility/NYC DOT link is not available.
4. 511NY for incidents, closures, construction and cameras; do not invent travel times from incident labels.

## Freshness and failure rules

- Port Authority readings must be no older than 15 minutes.
- NYC DOT readings must have status 0, positive speed, positive travel time, the audited link name and a timestamp no older than 15 minutes.
- A stale or malformed source becomes unavailable; no estimate is fabricated.
- A source outage for one agency must not erase fresh readings from another agency.
- Live measurements with different scopes are informational crossing conditions, not comparable door-to-door route ETAs.

## Next data step

Build time-of-week historical baselines for the audited NYC DOT link IDs from NYC Open Data. Store precomputed medians by link ID, weekday and 15-minute interval rather than querying the full historical dataset at request time. This will allow a defensible `+N minutes vs usual` value outside the three Port Authority crossings.

## Sources

- Port Authority crossing conditions: https://www.panynj.gov/bridges-tunnels/en/index.html
- NYC DOT traffic data feeds: https://www.nyc.gov/html/dot/html/about/datafeeds.shtml
- NYC DOT live link feed: https://linkdata.nyctmc.org/data/LinkSpeedQuery.txt
- NYC Open Data DOT Traffic Speeds: https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds/i4gi-tjb9
- TRANSCOM Data Exchange: https://data1.xcmdata.org/DEWeb/Pages/links
- 511NY developer resources: https://www.511ny.org/developers/resources
- MTA congestion-relief traffic analysis using TRANSCOM crossing corridors: https://www.mta.info/document/162396
