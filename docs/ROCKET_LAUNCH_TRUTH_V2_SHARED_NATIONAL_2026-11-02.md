# Launch Truth v2 — One National Schedule, Every Returned Mission
Release specification and limits — November 2, 2026

## Mission
Replace duplicative Launch Library 2 (LL2) live pulls with one national scheduled schedule observation, and preserve changes for every valid launch returned across the configured six U.S. coastal regions. The visitor must know whether a launch is newly observed, changed, stale, unverified, or absent from a bounded sample. Never suggest two matching calendars prove an official GO.

## Architecture
- Source: Launch Library 2 v2.3 upcoming launches, grouped by location IDs 11, 12, 27 and 1, 21, 25, 143. Each source request has a maximum 100-result limit, is bounded to the next 120 days using LL2's documented `net__lte` filter, and is bound by response size and timeout. On November 2 the unbounded primary response reported 256 records versus 73 within 120 days, so the shorter range meaningfully eliminates first-page truncation without adding API calls.
- Signed collector: existing GitHub Actions /api/space-coast-ksc-watch; nominal 15-minute invocation, shared national LL2 source collection at most every 28 minutes (approximately 4–6 requests per clock hour depending on scheduling jitter). Other API consumers are required to share this observation.
- Storage: existing private Postgres-backed ToolState (key rocket:national-schedule:v2) and compare-and-delete lease. TTL 14 days. No Redis, Supabase, new credentials, user-level tracking, or visitor-triggered LL2 calls.
- Processing: each valid returned upcoming coastal mission is normalized once and observed as an independent mission record. Provider response count, accepted results, truncation, last checked, stale groups and failed groups are retained. If either group fails, previous mission records are carried with sourceStale rather than asserted to be current or absent.
- History: bounded per-mission timeline of net target time, precision, LL2 status, window bounds and launch pad first detected by our collector. Preserve history across reruns and older missions for a limited duration; a missing record is not a scrub or success. Missing from a truncated provider result is explicitly NOT classified as disappearance.
- Florida KSC history consumes the same national observation. The nominal 15-minute KSC collector never turns a previously observed national snapshot into a new source-check timestamp.
- Both public tools now read only the shared national snapshot, replacing national direct LL2 calls and Florida's fallback LL2 request. On unavailable source, do not hide or invent missions. The Florida and national renderers report the actual source check timestamp, stale state and source coverage.
- Launch Truth reader overlays v2 national history for every mission while retaining bounded hourly provider-update and SNAPI enrichment. It pulls RocketLaunch.Live next-five only within that scheduled enrichment; comparisons are suspended if the national snapshot is newer than the compared source sample.
- The existing national launch dashboard and Florida-specific KSC/NPS/45WS/NWS viewing and weather systems remain separate source authorities.

## Anonymous LL2 budget
Provider documentation: 15 unauthenticated calls/hour. A nominal 30-minute two-group collector uses ~4 calls/hour when runs arrive exactly every half-hour. A 28-minute minimum prevents every 15-minute GitHub invocation from generating new requests, but job delays and scheduling jitter can produce up to ~6 requests in some rolling windows.

The separate detailed contributor updates are capped to four missions per 55-minute enrichment cycle; the national schedule is no longer re-fetched for that job, eliminating two previously duplicated calls/hour. Weather and other independent LL2 source reads elsewhere in the repository must be audited and preferably migrated before promising that the *whole site* fits under 15 calls/hour. The shared module does not guarantee every outside workload's total requests.

## Scope and honesty
Coverage target is 100% of the **valid returned upcoming launches within the next 120 days** from the configured source groups. The horizon moves with each successful check. This is NOT every launch in the country. A group exceeding 100 results is explicitly truncated, and short-notice sounding rockets and military range tests may be absent from LL2 entirely. A group that returns all records but has an unexpected provider error remains incomplete.

Detailed mission-specific contributor updates and news remain prioritized on up to four representative launches per hourly enrichment interval; other missions have complete *calendar change history*, but may not yet have a fresh editorial story. The public API labels non-enriched missions as `not-prioritized` instead of implying no news exists.

The pages' countdowns remain published LL2 target time, not telemetry. No inferred scrub, hold, launch completion, official flight-weather clearance or legal viewing access.

## Benchmarks
- Two national LL2 source pulls per eligible collection cycle; zero third-party LL2 pulls from visitors.
- Every accepted mission (not four arbitrarily sampled) appears in the persisted national ledger and read-only public calendar.
- Source count and truncation surfaced; no phantom zero when provider group fails.
- Changed target time has exact *first observed by this monitor* time; unchanged reload does not duplicate events.
- KSC and Florida launch-day monitors derive observations from the same national snapshot and cannot fabricate a fresher source time.
- Stale after 75 minutes: visitors see a warning; no previous agreement claimed as current.
- Original operator, NPS access, KSC event and 45WS weather safeguards and canonical paths remain unchanged.
- Run new and previous launch regression tests, full repository/site build audit and Vercel preview before merging. Verify public APIs, static assets and signed monitor workflow after release.

## How to validate
`node --test tests/rocket-launch-national-v2.test.js`
`node --test tests/rocket-launch-truth.test.js tests/space-coast-launch-day.test.js tests/rocket-launch-usa.test.js tests/space-coast-live.test.js`

Read the public API `/api/rocket-launch-truth?launchId=<LL2-UUID>`, verifying nationalCheckedAt, monitoredMissionCount, sourceGroupComplete, comparison status and dated timeline. Read `/api/rocket-launch-usa` to confirm scheduleSource, source health, no stale timestamp substitution and all returned missions.
