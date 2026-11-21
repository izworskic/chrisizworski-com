# ShoreFeel Canada: Ontario Great Lakes shoreline interpretation

**Build date:** 2026-11-21. **Canonical:** `/great-lakes-beaches/canada/`. **Owner:** main site repository. **Status:** new source-backed feature pending browser and CI release acceptance, not a claim of live production weather.

## Why this form

Question: "What will the lakeshore air feel like when I reach a Canadian provincial park beach, and where do I verify that swimming is allowed?"

Concept A, rejected: append Ontario beaches to the U.S. data and NWS safety feed. This would misattribute weather and swim monitoring, place Canada beaches into a U.S. directory, and make the U.S. onshore-weather assumption appear cross-border valid.

Concept B, selected: an **Ontario Parks chaptered shoreline field guide**. The first phone screen leads with the four Canadian Great Lakes; choosing a lake changes a curated set of real public parks, the selected interpretive note, source-labeled city forecast and map. It directs the visitor to Ontario Parks beach samples and current park alerts, not a fake safety score. Its first screen is distinct from the U.S. shoreline field desk (four regional chapters and Canada-first °C) and the Michigan Beach Report (summer hazard ranking). The map stays subordinate to park decision/guide and collapses to the linked park inventory if map tiles fail.

## Verified scope

The first 16 Ontario provincial parks are in `data/shorefeel-canada.json`: Superior 4 (Pancake Bay, Batchawana Bay, Agawa Bay, Neys), Huron 4 (Pinery, Inverhuron, Awenda, Wasaga Beach / Georgian Bay), Erie 4 (Port Burwell, Long Point, Turkey Point, Rondeau) and Ontario 4 (Sandbanks, Presqu'ile, Darlington, North Beach).

This is **not** all Canadian Great Lakes beaches. Additional public/municipal swimming beaches require verified local health-unit sampling and local operating authorities. **Lake Michigan has no Canadian coastline**. Georgian Bay is part of Lake Huron.

For all sixteen locations, the programmatic map pin references published official Ontario Parks gatehouse/park coordinates (Agawa Bay uses the park's Agawa Bay campground reference). This is **not the exact monitored swimming area, parking stall, trailhead, or a buoy location**. The UI links to each official park page and a named Google Maps search rather than inventing turn-by-turn access. Links and geometry sources are in the catalog.

## Weather source and scientific limits

**ECCC/MSC GeoMet:** https://api.weather.gc.ca/collections/citypageweather-realtime?f=json . The *City Page Weather [experimental]* collection exposes GeoJSON point features with `properties.lastUpdated`, `name.en`, `hourlyForecastGroup.hourlyForecasts`, `temperature.value.en` in Celsius and `wind.speed.value.en` in km/h. The engineering agent inspected an **actual live response** for the Prince Edward (Picton) city item near Sandbanks, at `[-77.26,44.02]`, updated `2026-11-21T14:50:18Z`. No fabricated nearshore air thermometer was involved.

The new `/api/shorefeel-canada` endpoint only accepts a reviewed park slug. It obtains bounded current city features near the park reference and chooses the nearest valid city within **60 km**, with issue age no more than **12 hours**, a qualifying forecast hour within 70 minutes behind or 150 minutes ahead of now, valid Celsius units and numeric-range checks. It explicitly exposes distance from park and forecast valid time. The number is an **ECCC city-area air forecast**; not a beach thermometer, measured shore-air temperature, published marine forecast, wind chill, humidex, or physically calibrated microclimate offset. We report Celsius first and derived Fahrenheit as context; winds in km/h. On stale, missing, far, nonmetric or garbled input, display **Not available**. Do not infer that a beach is warmer/colder by some number from this regional model alone.

Attribution: **Data Source: Environment and Climate Change Canada.** ECCC data server end-use licence and usage policy govern the data; no endorsement implied. Sources: https://eccc-msc.github.io/open-data/msc-data/citypage-weather/readme_citypageweather_en/ , https://eccc-msc.github.io/open-data/readme_en/ .

## Bathing safety, access and attribution

**Ontario Parks official province-wide swimming beach sampling:** https://www.ontarioparks.ca/beachresults . This public site lists dates of actual results. In November 2026, many shown samples were from August/September 2026. **A historical "no posting" result is never a current all-clear.** Our page links to the live official site but does not parse/synthesize its posted status. Use each park's own `/alerts` page for access/operating notices. Ontario provincial park source https://www.ontarioparks.ca/alerts . Health unit results for municipal non-park beaches are outside this initial rollout. No American National Weather Service swim risk, Michigan EGLE BeachGuard, American red/green flag or US inferred water quality is shown for Ontario.

## Technology Fit Review

- HTML and scoped CSS: selected for a fast, accessible, crawlable park inventory and original four-chapter interpretive composition. The no-JS list includes direct Ontario Parks links and a reliable explanation.
- Plain browser JavaScript: selected for lake/park selection, active map marker, cancellable forecast request, rendering only through `textContent`, and fallback. No framework or extra map token.
- Existing Node/Vercel: selected for one allowlisted official ECCC adapter with a strict timeout, ten-minute success cache and no-store on missing data. No API key, cron, new paid provider, user location, Redis or new domain.
- Python: reserve for offline, independently instrumented air-temperature model evaluation, not needed at request time.
- Rust/WASM and Java: rejected without a measurable throughput or accuracy problem.
- Existing Leaflet/OpenStreetMap: reused for a sourced park reference map; list remains authoritative if tiles are unavailable.

## Tests and release safeguards

`tests/shorefeel-canada.test.js`: 16 unique locations and four lakes; source URL and official links; official ECCC schema; closest city selection; unit conversion; no false field measurement; stale/missing/far/no-metric inputs; API noindex/400. `scripts/verify-shorefeel-canada-browser.cjs`: 360/390/768/1280/1440 pixels, Superior→Ontario→Huron→Superior reversibility, map tiles blocked, mock ECCC request failure, no-JS links, no horizontal overflow and screenshots. The mocked browser weather demonstrates UI behavior but cannot establish source uptime or true beach microclimate.

Standard repository `npm run verify:all`, source/freshness, AdSense guardrails, canonical/Person schema, production build and Vercel preview must pass before merge. Existing Michigan and U.S. destination pages, APIs, safety status and SEO are unchanged beyond accurate cross-links and new sitemap entry. No claims of increased CTR or independent field accuracy.

**Rollback:** revert this Canada-only PR; it creates no permanent job, new paid source, keys or database migration.
