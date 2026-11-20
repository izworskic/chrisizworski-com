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
