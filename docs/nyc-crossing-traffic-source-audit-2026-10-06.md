# NYC Crossing Live Traffic Source Audit — 2026-10-06

## Product rule

The NYC Crossing Decision Engine may show an official live travel time only when the measured segment, direction, freshness and source are known. It must not rank unlike bridge/tunnel segments as a door-to-door fastest route.

## Audited crossing matrix

| Crossing | Live source | Identifier / segment | Scope | Delay baseline | Status |
| --- | --- | --- | --- | --- | --- |
| George Washington Bridge | Port Authority | crossingDisplayName = George Washington Bridge, ToNY | crossing + approach | Port Authority historical travel time and speed | connected |
| Lincoln Tunnel | Port Authority | crossingDisplayName = Lincoln Tunnel, ToNY | crossing + approach | Port Authority historical travel time and speed | connected |
| Holland Tunnel | Port Authority | crossingDisplayName = Holland Tunnel, ToNY | crossing + approach | Port Authority historical travel time and speed | connected |
| Queens–Midtown Tunnel | NYC DOT TMC | link 4456510, QMT W Toll Plaza - Manhattan Side | crossing | 8-week same-weekday/hour average from NYC Open Data, cached in Redis when enough valid samples exist | connected |
| Hugh L. Carey Tunnel | NYC DOT TMC | link 4456501, BBT W Toll Plaza - Manhattan Portal | crossing | 8-week same-weekday/hour average from NYC Open Data, cached in Redis when enough valid samples exist | connected |
| Brooklyn Bridge | NYC DOT TMC | link 4616339, BQE N Atlantic Ave - BKN Bridge Manhattan Side | approach corridor + crossing | 8-week same-weekday/hour average from NYC Open Data, cached in Redis when enough valid samples exist | connected |
| Manhattan Bridge | NYC DOT TMC | link 4616340, BQE N Atlantic Ave - MAN Bridge Manhattan Side | approach corridor + crossing | 8-week same-weekday/hour average from NYC Open Data, cached in Redis when enough valid samples exist | connected |
| Williamsburg Bridge | TRANSCOM | inbound Manhattan corridor confirmed in MTA TRANSCOM analysis | crossing corridor | TRANSCOM registration/feed mapping required | pending registered feed access |
| Ed Koch Queensboro Bridge | TRANSCOM | inbound Manhattan corridor confirmed in MTA TRANSCOM analysis | crossing corridor | TRANSCOM registration/feed mapping required | pending registered feed access |
| RFK Bridge | NYC DOT TMC | link 4456452, TBB W - FDR S MANHATTAN TRUSS - E116TH STREET | Manhattan-side approach segment | 8-week same-weekday/hour average from NYC Open Data, cached in Redis when enough valid samples exist | connected with limited scope |
| Verrazzano–Narrows Bridge | NYC DOT TMC | link 4763652, VNB E SI GANTRY UPPER LEVEL - BROOKLYN GANTRY UPPER LEVEL | bridge crossing | 8-week same-weekday/hour average from NYC Open Data, cached in Redis when enough valid samples exist | connected |

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

## Historical delay baseline

For audited NYC DOT links, the live adapter now requests a bounded aggregate from NYC Open Data only when a cached day-of-week/hour baseline is missing. The query covers the previous 56 days, requires status 0 and positive travel time, groups by audited link ID, and uses only the same weekday and hour as the current live reading. A link needs at least 24 valid observations before a comparison is shown. Results are cached in Upstash Redis for six days, with an in-memory fallback cache, so normal page traffic does not repeatedly scan the historical dataset.

Port Authority historical values remain authoritative for GWB, Lincoln and Holland. The NYC Open Data comparison is labeled separately as an 8-week average rather than implying it is an authority-provided historical value.

The baseline deliberately uses the public SODA 2.1 resource endpoint. Socrata permits limited unauthenticated queries there, while application tokens raise throttling limits. Because results are cached for six days and baseline failure is non-fatal, throttling can remove the comparison but cannot remove the live authority reading.

## Production verification

The public release has a production smoke contract at `scripts/smoke-nyc-crossing-production.mjs`. It verifies the live page and API, all 11 crossing identities, traffic-source provenance, historical-baseline sample gates, and the invariant that mixed-scope crossing measurements cannot be promoted into a door-to-door fastest-route claim. A temporary upstream traffic outage may reduce live readings but does not by itself fail the smoke check.

### Mapbox reliability correction — 2026-10-07

Queensboro and Williamsburg use the existing fixed three-waypoint Mapbox driving-traffic probes where official readings are absent. Their coordinates, bridge-pinning middle waypoint, duration/typical-duration limits, corridor-distance limits, waypoint snap check, authority precedence, and incomparable-segment semantics remain unchanged.

Each probe allows 8 seconds for the request and body, with one immediate retry only for a timeout or HTTP 5xx. The two probes run concurrently: routing is bounded to 16 seconds plus the 750 ms Redis read. HTTP 4xx, invalid JSON, NoRoute/NoSegment, and normalization/sanity rejections never retry. Diagnostics include the bridge, failure category or HTTP status/message, elapsed milliseconds, and attempt; token values are redacted.

Only complete `LIVE` Mapbox results receive the existing 60-second memory / 90-second Redis cache. `PARTIAL`, `UNAVAILABLE`, and `NOT_CONFIGURED` never populate either cache; old failure documents are ignored when read. API responses with incomplete Mapbox coverage use `no-store` so the CDN cannot hold a transient failure after the provider recovers. Fully live results retain the existing public cache policy.

The production smoke prints `mapboxReason` and both bridges' individual state/source. Authorization and request errors fail immediately. Genuine temporary third-party outages are explicitly labeled `DEGRADED`, never `PASS`; invalid routes and contradictory live coverage fail. Every smoke attempt uses a fresh URL. Release acceptance additionally requires repeated production calls over several minutes, spanning provider-cache refreshes, with both probes live and finite ETA/typical baseline plus valid bridge-specific distances.

## Sources

- Port Authority crossing conditions: https://www.panynj.gov/bridges-tunnels/en/index.html
- NYC DOT traffic data feeds: https://www.nyc.gov/html/dot/html/about/datafeeds.shtml
- NYC DOT live link feed: https://linkdata.nyctmc.org/data/LinkSpeedQuery.txt
- NYC Open Data DOT Traffic Speeds: https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds/i4gi-tjb9
- TRANSCOM Data Exchange: https://data1.xcmdata.org/DEWeb/Pages/links
- 511NY developer resources: https://www.511ny.org/developers/resources
- MTA congestion-relief traffic analysis using TRANSCOM crossing corridors: https://www.mta.info/document/162396
