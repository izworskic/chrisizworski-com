# Four-winter Michigan hiking snow history — October 25, 2026

## Product outcome

Add a measured-history inspector to each of the **50 existing named routes**, in the same noindex winter-hiking research preview, without inventing snow estimates or asserting winter parking clearance.

The UI compares actual **NOAA NCEI GHCN-Daily snow depth station reports (`SNWD`)** across the same seven-day interval in four completed winters, then offers one-click **NASA GIBS MODIS** date changes on the existing CARTO map for visual regional context.

The chart is **station measurement**, not NOHRSC modeled snow depth or a direct trail observation. Historic images are a separate NASA source. The weather predictor remains NOAA NOHRSC modeled snow + NWS forecast. These three evidence types must never be combined into a fabricated single sensor metric.

## Data contracts and citations

1. NOAA [NCEI Access Data Service documentation](https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation) defines HTTPS `/access/services/data/v1`, `dataset=daily-summaries`, `dataTypes=SNWD`, `bbox=N,W,S,E`, `units=standard`, `format=json`, `includeStationName=true`, `includeStationLocation=true`, and quality attributes. Each real upstream request is **centered on server-curated trail-area reference coordinates**, never user-supplied lat/lon.
2. NOAA [NCEI Past Weather Tool](https://www.drought.gov/data-maps-tools/ncei-past-weather-tool) describes original station daily snow-depth observations and the need for quality control and gaps.
3. NOAA [NOHRSC archive](https://www.nohrsc.noaa.gov/archived_data/) offers historic 1-km **modeled** gridded SNODAS products; it does **not** supply our chart's station snow depths. No SNODAS historical point series has been extracted or displayed here.
4. NASA [GIBS historical imagery](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/) visually portrays MODIS Terra imagery at 250 m browse / ~500 m snow-cover scale. It is neither a source of numeric NCEI depth observations nor evidence a parking lot has been plowed.

## UX flow

A person chooses a named trail and reads its official access cautions, then chooses Jan 15, Feb 15, or Mar 15 and presses **Compare 4 winters**. The tool fetches **four small seven-day windows** around the same calendar dates and presents one row per year with explicit numeric station-observed depth where a report exists. Missing days are a dash, real 0-inch reports are labeled **0 in**; a source timeout gets its own unavailable state.

The viewer selects **one NOAA reporting station** represented across the windows (prefer years of coverage and short distance), reporting that station's name and distance **from the trail-area reference point**, never claiming the sensor is on the walking route. It does not mix four stations and pretend the readings form one comparison.

Each winter row has an explicit **View YYYY-MM-DD in NASA imagery** control. This changes NASA imagery to that exact date, centers the same CARTO map on the route-area reference and retains the official route overlays. Missing NASA tiles remain unknown rather than being interpreted as snow-free. No calls to park managers, no new auth keys, no paid API, no new indexable page.

## Server protection and cache

- Read-only `mode=history&route=<known-id>&anchor=01-15|02-15|03-15`, no coordinate input and no other date ranges.
- Four parallel HTTPS NCEI requests at most, each 7 days; 6.5-second request timeout, 1.6 MB response limit, 40-mile station search radius and strict date, station-ID, coordinates, nonnegative depth and quality-flag validation.
- Four **completed** winters only; in October 2026 those are winters ending **2026, 2025, 2024, 2023**. Incomplete/current winter not portrayed as historical results.
- Each response is public, `X-Robots-Tag: noindex,nofollow` and edge cached for 24 hours; client fetches on explicit user click and memoizes the result.
- The service returns partial data with source unavailability labels; it does not make up depths if the NCEI endpoint fails.

## Loss-based release gate

| Defect | Loss |
|---|---:|
| Missing station day filled as numeric zero | 100 |
| A satellite snow pixel declared verified plowed parking | 100 |
| NOAA modeled grid represented as measured station, or vice versa | 100 |
| Mixed station reports presented as one station's historic record | 100 |
| Incorrect report date/year or missing source details | 50 |
| Browser map reset from missing satellite tile | 50 |
| Four unnecessary upstream requests on every route-card selection | 10 |
| Extra click to view a historical year on the map | 1 |

To approve: all 100-loss violations **zero**; NOAA API contract and failure cases covered by automated tests; new JS parses; preview HTML, noindex, and official route-map baseline gates pass. Real NOAA HTTP success and NASA imagery tile rendering still require **live-browser/connected-network verification**; synthetic CI tests do not prove the upstream services work at deployment time. No trail or winter lot is certified cleared, and direction links remain disabled.

## Follow-up for a true week-of-year snow-depth climate profile

A robust snowshoe-season-onset chart would require a separate ingestion job that extracts several completed winters of **NOHRSC/SNODAS 1-km modeled raster cells** or longer-duration NCEI station measurements with consistent spatial provenance, more than a single comparable week. Do **not** infer annual snow-onset dates or snowshoe-day probabilities from the 4 × 7-day samples added here. Validate bias (station elevation vs forest route) and coverage before publishing.
