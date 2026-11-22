# Michigan Winter Trails Weather Evidence Lens

2026-11-22 | Owner: izworskic/chrisizworski-com | Canonical: https://chrisizworski.com/michigan-winter-trails/

**Dependency:** Built on the unmerged layout-repair PR #1839. This investment is a stacked PR and should not be released independently of that review.

## Visitor job

A winter visitor chooses one of the 15 already documented trail areas and a near-term outing date, then checks the regional NOAA snow model and local NWS daytime weather alongside original official trail rules. Snow, forecasts and weather warnings do not establish trail opening, groomed surfaces, safe ice, or plowed parking.

The baseline has 15 interpretive dossiers, 50 named loops, credited photographs and a regional map, but selecting a specific place did not produce location-specific dated weather evidence. The existing winter-hike research adapter already implements source freshness, independent NOAA/NWS parsing and bounded caching; the winter access evidence remains deliberately research-only.

## Three opportunities, two distinct design choices

1. **Weather evidence at the selected place (selected).** After choosing a map pin or a named trail dossier, offer modeled grid snow, next-seven-day NWS daytime forecast, active warnings, source timestamps and original land-manager source. No network work until requested.
2. **Source-matched official trail line geometry (deferred).** DNR route fragments and conflicting identifier/name matches are not complete, routable trail loops. Need manager-verified name, line identity, full extent, seasonal closures and correct arrival point first.
3. **Grooming and plowed parking status (deferred).** No uniformly sourced, current trail-and-lot coverage for all 15 systems. Weather cannot fill that gap.

**Concept A, selected:** A narrow, closed-by-default weather disclosure in the existing map panel. Once requested, one compact area/date inspector provides two different source readings, NWS alerts and direct authoritative links. Map popup and trail card buttons open the same inspector without leaving two popups open. Stale/missing data is visibly unknown.

**Concept B, rejected:** A statewide color-coded trail readiness map, with NOAA snow turned into green/yellow/red destinations. This would wrongly imply snow-depth equals grooming, access or safety. It is also too similar to the separate Snow Depth tool and would recreate the large above-fold blocks the owner rejected.

This differs from the existing Snow Depth regional map and XC Ski tool because the selected entity is one of the 15 editorial winter trail dossiers, the date changes the actual evidence, and the manager access decision remains separate from both sources.

## Technology fit

- HTML/CSS: native collapsed details, crawlable links and no-JS explanation; no new hero.
- JavaScript ESM: on-demand source fetch, controlled date and route selection, single result and abortable state; existing local Leaflet and map events preserved.
- Existing Node/Vercel: add one field-weather mode to the existing winter-hike-lab API. Only known trail IDs and static Michigan coordinates accepted. Reuse lib/winter-hike-live.cjs including its timeouts and bounded short-lived cache.
- Python: no new statistical model or GIS source reconciliation justified for weather display. Revisit only when an offline calibration or verified GIS matching task requires it.
- Rust/WASM: no measured CPU hotspot. Rejected.
- Java: no JVM or integration requirement. Rejected.
- New Vercel functions, paid calls, Redis, storage, geolocation and external tracking: none.

## Source integrity

Official NWS API: https://www.weather.gov/documentation/services-web-api

Official NOAA analysis: https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer

NOAA's 1-km modeled snow is regional context, not a named trail surface reading. NWS 10 AM–4 PM weather is a forecast, not an observation on the trail. Active alerts at query time cannot exclude warnings issued later. Never show a numeric trip-quality/safety confidence score.

Existing validated adapter source limits: NOAA calendar date within 72 h, NWS hourly issuance within 12 h and checked active alerts within 30 min at presentation, independently fail closed. Zero modeled snow remains zero. The HTML coordinate allowlist must match all 15 area reference points exactly in tests; the points do not establish winter parking or precise trailhead directions. Only explicit GET mode, ID and date are accepted. No arbitrary URL or latitude/longitude inputs. Original manager URLs remain attached to matching dossiers.

## Preserved safeguards and test plan

No changes to canonical URL, Person schema, AdSense Auto ads, image provenance, search-facing trail descriptions, map provider fallback, route inventory, sitemap, additional indexable pages or sitewide navigation. The 1839 compact warning placement remains intact.

Deterministic tests cover exact coordinate parity, unknown IDs and prototype keys, out-of-window dates, good/stale/future/missing source results, client response-to-area matching, zero snow, positive NWS alert, source isolation and hidden-by-default UI. Existing repo QA remains mandatory.

Required before release: full npm run verify:all, emitted HTML/canonical build audit, preview browser visual check at 360/390/768/1280/1440, click map or dossier then switch dates/areas, keyboard checks, NWS failure, NOAA missing/stale, warning failures, map fallback, source links, ad stacking and photo loading. A real browser screenshot, Foundry replay, production data and search lift are NOT VERIFIED by source tests alone. Stacked PR must be reviewed and must not be automatically merged.
