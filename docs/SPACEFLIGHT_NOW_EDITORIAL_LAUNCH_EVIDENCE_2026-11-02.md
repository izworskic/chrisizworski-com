# Spaceflight Now as a source for Rocket Launch Live
November 2, 2026

## Why this source was missing
The previous rocket engine focused on structured Launch Library scheduling, official range weather, NWS visitor visibility, source-confirmed closures and mission video. It incorporated Spaceflight Now's general Launch Pad Live camera in the Florida media desk, but **did not ingest its reporting or surface the editorial launch schedule alongside the selected mission**. That was an omission: Spaceflight Now reports changes, delays, launch readiness, and operator decisions that a schedule field alone cannot explain.

## Research and source capabilities
- https://spaceflightnow.com/launch-schedule/ — editorial worldwide orbital launch schedule, time-zone selection, mission descriptions, weather at launch location, trajectory context and links to live coverage. This is independent journalism, **not launch control**; weather shown there is not verified launch-vehicle flight approval.
- https://spaceflightnow.com/live/ — live editorial coverage and Launch Pad Live camera, which the existing Florida media desk already exposed as a separate generic camera.
- https://spaceflightnow.com/mission-reports/ — program-specific editorial coverage.
- https://spaceflightnow.com/feed/ — public WordPress RSS with dated article titles, original article links and descriptions.

The web schedule contains rich mission-specific information, but it is not documented as a licensed API. To avoid fragile undocumented scraping, site load, copying third-party copyrighted editorial content, or silently conflicting calendar timestamps, this release uses the publicly syndicated RSS for **attributed links to recent stories**, not full article bodies or a second asserted launch schedule.

## Implementation
- `lib/spaceflight-now-editorial.js` downloads only the allowlisted HTTPS RSS URL; 6.5-second deadline, 180 KB response limit, up to 40 entries, 20-minute warm-worker memo and normal 15/30-minute CDN caches on existing launch APIs. On failure it returns an unavailable source state without breaking LL2 schedules, NWS, 45WS, NPS or maps.
- Strict article URL acceptance is limited to the source's own date-based article paths. Only headline, publication date, and source link are rendered; RSS excerpt is used locally for matching, never reproduced to the visitor. No photos, snippets or articles are rehosted.
- Mission matching is exact when a distinctive mission designator appears in both the LL2 mission and the source headline/excerpt: USSF, Starlink group, Crew, CRS, NROL, Cygnus NG, Starship flight, Transporter, Bandwagon, Amazon Leo LV/LE. This prevents a generic Falcon 9 story from being attached to an unrelated Falcon 9 mission.
- Where no exact designator exists, a limited *related provider and payload context* association is allowed only for certain unambiguous rocket + payload pairs and only if a single candidate mission occurs within the bounded schedule window. This is explicitly labeled contextual, not a confirmed match. A date difference or two similar launches invalidates the association.
- National US coast and Florida specialist launch APIs now expose `independentReporting` for the selected mission. Both show dated original links and direct routes to SFN's schedule, live coverage and mission report index. Changing the selected mission automatically changes matched reporting. A missing feed yields an explicit source limitation, never a missing-launch claim.
- LL2 remains the structured public launch-target calendar; official operators/range remain the flight decision authority; official weather PDFs, NASA-reported weather, NWS spectator forecasts and permitted viewing sites retain their separate provenance.

## What this does not claim
- No independent confirmation that Spaceflight Now's current schedule and LL2 agree on a launch time; source feeds may share upstream data.
- No real-time webcast health from Spaceflight Now, automatic playback or permission to rehost live video.
- No live weather clearance based on the external calendar's MET Norway weather graphic.
- No invented Spaceflight Now article links or inflated source coverage when a matching article is absent.
- No reliable editorial story for every scheduled mission: the RSS is a bounded recent feed, and older mission archives can contain relevant coverage outside it.

## Verification
`node --test tests/spaceflight-now-editorial.test.js`

`node --test tests/rocket-launch-usa.test.js tests/space-coast-live.test.js tests/space-coast-media.test.js tests/space-coast-launch-day.test.js tests/space-coast-official-weather.test.js`

The dedicated GitHub Actions PR gate runs the above. The full repository verification gate and Vercel preview also run before release.

## Next further investment, if warranted
Review the official Spaceflight Now reuse/API terms and whether the publisher offers a licensed machine-readable mission schedule. With a legitimate agreement, a more ambitious cross-source reconciliation service could independently compare exact mission timestamps, distinguish syndicated feed differences from real operator changes, and cite any disagreement explicitly. Do not silently scrape the HTML calendar as a substitute for a supported public API.
