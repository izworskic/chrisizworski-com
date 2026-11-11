# Winter Sprint 7 — Snowmobile and Ski Season Capture

November 11, 2026. Owner: `izworskic/chrisizworski-com`. Existing canonical pages retained; no new indexable route.

## What visitors can do now

- **Statewide snowmobile:** After arriving from search, see a short source-backed loading-the-sleds checklist: state trail legal window (December 1–March 31), official DNR mapped network and closures, dated local club reports, and snow/road forecasts. 2026–27 state trail permit is **$65**; verified against DNR's `/snowmobiling/permits-and-requirements` and May 11, 2026 rate-change release (checked Nov. 11). An outdated DNR FAQ search result still mentions $52; do not use that conflicting snippet.
- **Seven regional riding maps:** An up-front regional preflight points to mapped DNR trail/closure checks, the existing region-specific club-report list (with timestamps reviewed by the visitor), NWS observed snowfall, lake-effect outlook and MDOT highway guidance. This is separate from and does not change deterministic route mapping, local evidence weighting, geospatial closure logic, riding scores, map pins or weather APIs.
- **Downhill skiing:** A three-part operating-status check is added at the index and each of 18 owner-generated destination pages. Links go to the operator-owned resort/trail report and checkout; weather snowfall and dated NWS reports are explicitly not lift status. The live shortlist can no longer call November automatically 'in-season' and suppresses ranked choices if its bundled timestamp is invalid, in the future by more than one minute, or more than two hours old. When the owner publishes lift counts without an actual source update timestamp, the card says so and requires future-date verification. The preexisting rankings remain planning comparisons, not open-lift guarantees.
- **XC skiing:** The main guide now explicitly separates modeled NOAA snowpack, volunteer/operator grooming reports, and last-mile parking. The live Nordic engine at `xcski.chrisizworski.com` remains the sole condition owner. Cross-links direct trip planners to the existing Winter Weekend Field Desk instead of a new duplicate tool.

## Primary authority and conflict rules

Michigan DNR:
- https://www.michigan.gov/dnr/things-to-do/snowmobiling (season, Dec. 1–Mar. 31)
- https://www.michigan.gov/dnr/things-to-do/snowmobiling/permits-and-requirements (current permit $65)
- https://www.michigan.gov/dnr/things-to-do/snowmobiling/where (designated trail map, shared uses and closures)
- https://www.michigan.gov/dnr/things-to-do/snowmobiling/trail-reports (third-party reports; DNR does not vouch for timeliness)
- https://www.michigan.gov/dnr/things-to-do/winter/xc-skiing (independent grooming source partners)

Operational guardrails: legal trail status does not mean a track is physically rideable; a club report's date and geographic span matter; observed snowfall does not equal groomed trail base; NOAA depth does not equal compacted base; NWS forecast does not establish resort operations; MDOT roadway data does not certify plowed park lots. Resort lift status from a parsed page may lack a dated source update. An official closure always dominates favorable weather. No location/drive-time inputs or user metrics were added.

## Generated page and search release

Changes to `scripts/generate-snowmobile-region-pages.mjs` own all seven regional pages. Changes to `scripts/generate-michigan-ski-pages.mjs` own the ski index and 18 destination pages. Generated pages use the existing templates, canonical URL patterns, and person identity. Sitemap `lastmod` values change only for edited canonical paths. No ad-loader, indexability, pricing algorithm, snow data service, weather score, or new city-page rewrite.

## Validation and measurement

Run `node --test tests/winter-sprint7-readiness.test.js`, full `verify:all`, `build:site` + actual public HTML audit, and preview/production deploy gates. Inspect one generated ski resort, the statewide snowmobile page, a regional riding page, and XC guide in production.

Google Search Console release cohorts: `/snowmobile/`, seven `/snowmobile/regions/*.html`, `/michigan-ski-hills/` and 18 resort subpaths, `/michigan-cross-country-skiing/`. Dated complete seven- and 28-day comparisons should evaluate nonbranded impressions, clicks, CTR, and position; page-specific AdSense revenue stays *unavailable* unless a verified page-level source is ingested. Seasonality and snow events are confounders.
