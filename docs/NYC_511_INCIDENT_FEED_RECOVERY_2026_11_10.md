# NYC Crossing 511NY incident-feed recovery — November 10, 2026

## Observed production issue

The public `/api/nyc-511` endpoint has repeatedly reported `events.updatedAt: null` while `signs.updatedAt` continued to advance. That confirms **partial ingestion** but does not, by itself, prove whether the event feed failed because of timeout, paging, authorization, source response format, or private cache writes. The browser fix in PR #1600 already removed repeated "Incident feed awaiting first update" messages and preserves uncertainty when no incident source is verified.

## Source-contract investigation

The existing adapter requested `/carsapi_v1/api/events?limit=100&offset=0` across the entire state before filtering any record to the eleven NYC crossings. CARS' current Events API documentation describes `routeDesignator`, `limit`, `offset`, and a `Link: rel=next` header, and documents `details` as an **array** of Detail objects with nested locations.

Reference documentation examined November 10, 2026:
- https://mn.carsprogram.org/carsapi_v1/console/ (CARS vendor implementation and filtering documentation; representative host, not evidence that New York credentials work).
- https://prod-ny.ibi511.com/developers/resources (511NY developer access requires approval; never replace credentials with a guessed key).
- https://511ny.org/faq (incident reports update as agency reports arrive, not at a guaranteed fixed cadence).

The official historical dataset at https://data.ny.gov/d/ah74-pg4w is **not** a current incident substitute. No new vendor, paywall, storage service, secret, or unlicensed scraping was introduced.

## Implementation

- Request the authoritative NY CARS Events endpoint using documented `routeDesignator` filters for eight relevant roadway numbers, batching no more than three concurrent routes. Per-route paging remains complete and bounded; duplicates across intersecting roads are deduplicated by official event ID.
- Normalize nested TMDD Detail.locations, top-level legacy locations, and point geometry; use published updates and report text where available. Ignore incidents outside crossing-proximate geographies and ended/future-effective events.
- Treat a route-page cap, missing pagination metadata on a full page, cross-host or cross-route next link, unauthorized upstream, unexpected response schema, and failed cache write as **partial/unavailable**, never a verified empty feed.
- Persist only bounded per-feed diagnostic categories and record counts in private tool state. Public `/api/nyc-511` exposes `pollHealth` without usernames, passwords, credentials, host URLs or unrestricted events. Public NYC crossing requests continue to use just their pre-existing two cached reads.
- Preserve the independent highway-sign feed, five-minute shared flight-watch cron, existing browser disclosure and source freshness checks.

## Production acceptance after merge

1. Wait for a successful scheduled cron, then inspect `https://chrisizworski.com/api/nyc-511` for `pollHealth.eventsStatus`, `pollHealth.signsStatus` and source-specific `events.updatedAt`.
2. If `eventsStatus=UPDATED`, verify `events.updatedAt` advances and actual matched incident text (if any) is geographically/date qualified; zero matched incidents is **not** an all-clear.
3. If `UPSTREAM_HTTP_401` or `403`, current configured credential entitlement is insufficient; stop. Do not transmit keys in requests/logs or invent a developer API key.
4. If `TIMEOUT` / `REQUEST_FAILED`, diagnose upstream connectivity from authorized server logs. If `PAGINATION_*`, keep the events unavailable and inspect the CARS server paging contract before relaxing limits.
5. Check live NYC Crossing page and source-qualified traffic measurements. The independent Mapbox traffic smoke can report DEGRADED without reclassifying 511NY as healthy.

**Release status at authoring:** code implemented on feature branch; live event-feed recovery not yet independently verified. **No incident-clear claims.** If credentials or upstream service remain invalid, code cannot manufacture a recovery. 
