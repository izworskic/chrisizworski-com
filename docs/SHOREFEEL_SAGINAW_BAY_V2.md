# ShoreFeel 2.0 — Saginaw Bay pilot

**Created:** 2026-11-07
**Route:** /lake-huron-water-temperature/saginaw-bay/
**Status:** Source-first regional pilot; no modeled beach-water forecast.

## Visitor question

"What will the water off Bay City feel like, and what does the temperature actually represent?"

The headline uses a recent NOAA GLSEA ACSPO surface-analysis pixel near the Bay City State Park shoreline. An independent western-bay pixel provides comparative context. NOAA NDBC station 45163 is offshore evidence, never Bay City beach water. The Lake Huron average is lakewide context only.

## Independently checked NOAA water cells

On November 7, 2026, the NOAA GLSEA_ACSPO_GCS grid returned valid water samples dated November 6, 2026 at 12:00 UTC:

| Requested reference | Verified NOAA water grid pixel (latitude, longitude) | Temperature |
| --- | --- | --- |
| Inner Bay City reference (43.702, -83.858) | 43.6963251553103, -83.8564696472691 | 13.43°C (56.17°F) |
| Western bay reference (43.799, -83.861) | 43.7944337766011, -83.8564696472691 | 13.53°C (56.35°F) |

Verified source: https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.graph

These are **dated independent validation points, not live fallbacks**. The production page displays only its current API response, preserving original analysis dates. NOAA's satellite analysis may use older cloud-free observations and smoothing, so the analysis date is not a measurement time at the shoreline. Land-masked values, future readings, malformed values and observations older than 72 hours are rejected.

The NOAA/GLERL NDBC [station 45163](https://www.ndbc.noaa.gov/station_page.php?station=45163), at 43.983°N, 83.600°W, was recovered September 29, 2026. It is not considered current unless a new water-temperature record is less than six hours old; it is too far from the Bay City State Park beach to qualify as its primary temperature source.

Official evidence and land management:
- NOAA lake-temperature methods: https://coastwatch.glerl.noaa.gov/satellite-data-products/lake-surface-temperature/
- NOAA buoy: https://www.ndbc.noaa.gov/station_page.php?station=45163
- Bay City State Park: https://www.michigan.gov/recsearch/parks/baycity
- EPA park beach monitoring coordinates: https://www.waterqualitydata.us/provider/STORET/21MICH_WQX/21MICH_WQX-090271/
- Nayanquing Point DNR: https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa

## Evidence ladder and failure states

1. Use only a recent water reference close to the requested Bay City State Park coastline.
2. A station farther than 10 km from the shoreline cannot substitute for a missing local pixel. A different bay sector cannot silently become the beach reading.
3. Missing primary source means "Not verified". Never substitute a whole-lake average, stale snapshot or other region.
4. Saginaw Bay's two NOAA sample boxes are fetched separately and in parallel, so one area may succeed when the other fails. API calls use bounded deadlines and existing CDN cache settings.
5. NWS air and wind are forecasts for Bay City State Park only, not the outer-bay buoy or Nayanquing Point.
6. No Saginaw Bay 48-hour water forecast is published: existing Lake Michigan forecast results have not been validated here.
7. Temperature bands describe thermal exposure only. Water quality, currents, waves and advisories remain separate.

## Scientific follow-up gates

Independent nearshore measurements across seasons are necessary before Saginaw Bay water forecasting. Score against persistence at 24 and 48 hours, uncertainty coverage, cold-event precision and recall, and sample size by month. Track source latency, stale samples and uptime. Never create a swimming-safety score from temperature alone.

## Release gates

Require the full npm run verify:all suite, ShoreFeel Chrome checks at 320/375/390/768/1024/1280/1440, source provenance, mobile overflow, keyboard navigation, canonical/sitemap metadata, and an actual preview API source check before merging. A passing Vercel build alone does not prove live NOAA water availability.

## 2026-11-20 Experience Investment, IMPLEMENT recovery

**Visitor job:** A Bay City State Park visitor must determine whether a recent nearby surface-temperature estimate exists, compare it to the outer-bay buoy, and understand the shoreline forecast without mistaking any reading for safe swimming.

**Observed baseline:** The source recovery was absent on current `main`. The older #1551 branch included a source-led three-reference map and activity interpretation but hid actionable navigation below the hero, showed indefinite "Checking" text without JavaScript, and hardcoded a buoy recovery date. Actual browser screenshots were **NOT CAPTURED** in this connector-only recovery environment. Official NOAA station #45163 publicly states that it was recovered for the winter on September 29, 2026, verified November 20, 2026. NOAA GLSEA documentation describes satellite-derived daily surface analysis. Sources: https://www.ndbc.noaa.gov/station_page.php?station=45163 and https://coastwatch.glerl.noaa.gov/satellite-data-products/great-lakes-surface-environmental-analysis-glsea/.

**Concept A, selected, evidence transect:** On a 390px phone, a cautious dated local answer and three plain-language paths precede a map of the inner-bay satellite sample, Nayanquing reference and far-offshore buoy. A source button changes selected evidence; when NOAA fails, it says not verified. Desktop keeps a compact map with adjacent location dossier. This is a provenance-first geographic explorer, not a generic weather dashboard.

**Concept B, rejected, shoreline activity planner:** Put swim/paddle/family activities first, show an interpretive forecast with a small sourced map underneath. While appealing, without a directly measured beach value this falsely suggests an activity safety verdict, obscures uncertainty, and risks cloning the existing ShoreFeel Lake Michigan cards.

**Comparable tools:** Existing Grand Haven ShoreFeel is one beach's water/weather advisory. Great Lakes Buoys compares instruments regionally. This page differs in its primary question, strict multi-sector source policy, three-point geographic evidence selection, and the explicit rule that an outer-bay buoy never becomes a Bay City State Park temperature.

**Technology fit:** Keep semantic HTML/scoped CSS for first answer and offline source explanations, browser JavaScript/Leaflet for three synchronized source selections and source timestamps, existing Node ShoreFeel API/NOAA parser for data and caching behavior. Python is useful for *offline* independent GIS/source validation but adds no visitor runtime value; reject introducing Python service, Rust/WASM, Java, React, Redis, and new build tooling without benchmarked need.

**Protected:** Canonical https://chrisizworski.com/lake-huron-water-temperature/saginaw-bay/; identity and existing site ads; authoritative NOAA/NWS inputs and timestamps; NDBC station status; missing-grid and stale-data failures; no implied measured swimming water, verified public water access or live safety score. A Google Maps link is to Bay City State Park, never to water pixel or offshore buoy coordinates.

**Code changes:** Restored source-safe per-cell NOAA queries and strict buoy distance policy; restored page, evidence map, activity selectors and existing test; added explicit first-screen source/visit paths, readable unverified no-JavaScript values, current official source link, and mobile contrast/focus treatment.

**Release:** Source changes are not browser evidence. Run `node --test tests/shorefeel-saginaw.test.js`, `npm run verify:all`, actual 360/390/768/1280/1440px responsive browser QA, source-stale/A-B-A selections, Vercel preview and NOAA failure injection. Do not merge without green full CI, measured browser result and public API integration checks. GSC, GA4, AdSense impact NOT MEASURED. Exactly one next action: verify the fresh PR head in CI and preview and correct any regressions before merging.
