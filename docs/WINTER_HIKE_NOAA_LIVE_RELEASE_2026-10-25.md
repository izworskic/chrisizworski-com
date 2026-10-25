# NOAA historical snow service — live end-to-end release gate
Date: October 25, 2026 · Michigan Winter Hiking & Snowshoe Lab · issue #1109 · draft PR #1166

## Incident found and fixed

The previous production research code attempted to discover SNWD reporting stations from the NOAA NCEI **Data Service** with a bounding box alone. Real NOAA returned **HTTP 400**, JSON `{"errorMessage":"Bad Request","errors":[{"field":"stations","message":"A station is required."}]}`. Consequently, all four live trail queries returned an HTTP 200 research body with no matching station or real history, despite fixture-only unit tests passing.

The correction uses **two different documented NOAA APIs**:
1. **NCEI Search Service** `https://www.ncei.noaa.gov/access/services/search/v1/data` with a bounded server-curated Michigan route-area `bbox`, `dataTypes=SNWD`, and 7-day historical period. Live response returned station IDs, names, coordinates and SNWD historical coverage percentages. We filter out irrelevant, implausible, far-away and metadata-only station candidates.
2. **NCEI Data Service** `https://www.ncei.noaa.gov/access/services/data/v1`, explicitly specifying `stations=<verified NOAA station ID>` for four historical seven-day and four full-winter daily SNWD windows. The station identity remains unchanged across completed winters; missing and poor-quality days are NOT replaced with zero. A source failure is distinct from a valid search with no nearby station.

Official documentation: [NCEI Search Service](https://www.ncei.noaa.gov/access/search/documentation/search-service/), [NCEI Data Service](https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation).

## Actual real-network GitHub Actions results

Checked by the dedicated [live NOAA end-to-end workflow](https://github.com/izworskic/chrisizworski-com/actions/runs/40203580327) on the PR branch. It ran the actual serverless `api/winter-hike-lab.js?mode=season` handler, not mock data, through real NOAA Search+Data Service requests. **All four selected trails returned HTTP 200 with measured station snow-depth records, four complete reported winters, and 26 weekly history columns**.

| Trail context | Selected observed NOAA SNWD station | Station distance, straight line | Valid reported daily measurements across 2023–2026 |
|---|---|---:|---:|
| Vasa snowshoe / Traverse City | TRAVERSE CITY 4.7ESE (USC00208245) | 1.5 mi | 724 |
| Hartwick Pines / Grayling | GAYLORD 9 SSW (USC00203099) | 11.8 mi | 713 |
| Bay City / Tobico Marsh | SAGINAW MBS INTERNATIONAL AIRPORT (USW00014845) | 12.9 mi | 724 |
| Sleeping Bear / Alligator Hill | NW MICHIGAN RESEARCH FARM (USC00206012) | 17.0 mi | 705 |

Counts refer to valid source-station **reported daily SNWD**, not route measurements, parking or on-trail snow. The historical comparisons omit February 29 for identical week alignment (181 days per winter × four = maximum 724 data points).

Quality and source gates:
- Historical metadata candidate distance **≤40 miles**; local week-pattern interpretation only for observed stations **≤25 miles**. Farther stations may be displayed as distant context but cannot produce local "frequent snow" classifications.
- Prefer valid measured station coverage across at least three winters and local distance over enticing but irrelevant "100% coverage" metadata from stations returning no source-depth rows.
- NOAA Data Service **requires station parameter**, so no regional all-station year-long download is attempted.
- Fail closed for malformed JSON, HTTP errors, missing data, invalid quality flags, implausible station coordinates/depth and contradictory same-day observations.
- An HTTP 503 from station discovery is returned as source unavailable, never disguised as a zero-snow season.
- Request budget: up to one station-metadata search + five candidates × four bounded seven-day SNWD reads + four selected-station seasonal reads (25 calls worst case). Each HTTP call has a 6.5 s timeout; a **shared 22 s deadline** caps the entire serverless research request within its 30 s runtime. The read-only result is edge-cached for 24 hours and generated on explicit user action, not every page load or merge.
- NOAA's measured station history is not NOAA NOHRSC modeled snow, NASA MODIS classified snow, a live snow forecast, snowshoe-ready trail surface, public-road opening or a verified plowed parking lot.

## Automated and operational verification

- `scripts/verify-winter-hike-noaa-live.cjs` runs the actual API handler against public NOAA HTTPS, validates station IDs in station-only URL parameters, four winter series, at least three high-coverage local areas, noindex headers and cache-control. It checks that any "historically frequent" weekly classifications satisfy the explicit multi-winter coverage threshold.
- `.github/workflows/winter-hike-noaa-live.yml` is a targeted workflow; it runs on pushes touching specific NOAA logic in the **winter-hike development branch only**, plus manual dispatch, not every production merge.
- `tests/winter-hike-history.test.js` and `tests/winter-hike-season.test.js` include deterministic tests for source search metadata, candidate distance and quality, a false "100% coverage" candidate with zero actual reporting, NOAA source outages, real zero vs missing, leap-day alignment and station consistency.
- The repository `npm run verify:all`, emitted-site build, public HTML canonical audit and Name SERP protection remain required on the exact final PR head.

## What this does NOT verify

This is a **live NOAA source-to-serverless-handler smoke test**, not proof a public Vercel deployment or its browser successfully rendered the charts. Browser/UI (mobile overflow, CARTO/NASA historical tiles and field interaction) remains a separate explicit release gate. Historical measurements do not verify parking clearance, road access, or trail maintenance; existing navigation and search indexing remain disabled and the PR is kept draft.

Operational interpretation: the NOAA pipeline is now genuinely source-verified for four geographically distinct pilots. Other named routes may lack sufficiently close or complete stations; those must return limited/unavailable history, **not fabricated confident conditions**.
