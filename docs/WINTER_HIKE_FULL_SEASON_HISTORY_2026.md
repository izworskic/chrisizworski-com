# Winter hiking — full-season snow persistence analysis (October 25, 2026)

Tracking: draft PR #1166, issue #1109. Extends the same 50-route Michigan hiking/snowshoe research lab; this is not a second standalone tool.

## Decision this answers
**Which calendar weeks have historically seen sustained snow on the ground at a nearby NOAA reporting station?**

The model reads four complete November–April winters of **NOAA NCEI GHCN-Daily SNWD measured daily station snow depths**. It does not use NASA MODIS snow colors as station measurements, does not invent historical NOAA NOHRSC gridded measurements, and does not verify safe trail conditions, road maintenance or plowed winter lots.

## Evidence sources
- [NOAA NCEI Access Data Service](https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation): daily-summaries SNWD; units=standard; stations parameter, date window, station metadata.
- [GHCN Daily documentation](https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt): snow-depth definitions, QA and coverage gaps.
- [NASA historical GIBS MODIS imagery](https://nasa-gibs.github.io/gibs-api-docs/): independent dated satellite regional context, approximately 250–500 m, no small-lot plowing conclusions.
- [NOAA NOHRSC historic model archive](https://www.nohrsc.noaa.gov/archived_data/): separate gridded modeled data; NOT the source of the numeric chart built here.

## Model specification and bounded costs
1. Discover one nearby reporting SNWD station from the existing four mid-February seven-day windows, using the server-curated named route reference only (no supplied coordinates or identifiers).
2. Request the same NCEI station ID for the four completed November 1–April 30 periods. Four station-restricted full-season queries and four discovery queries: at most **eight NOAA calls per explicit analysis**. A full-season query has a 6.5-second request timeout and 700 KB body cap. Edge cache completed results 24 hours; no new API keys, paid services or recurring job.
3. Reject missing, bad quality flags, incorrect station IDs/coordinates, negative or impossible depths and contradictory reports for one station/date.
4. Normalize 181 calendar days from November 1 through April 30. Deliberately omit February 29, so March weeks align to the same month/day across leap and common years.
5. Split into 26 week bins. A week in one winter counts as **evaluable** when it has at least five days with reported SNWD. That winter qualifies as sustained **≥6 inches at the station** when at least four days meet or exceed six inches.
6. Only classify a week as **historically frequent station snow** with at least three evaluable winters and three qualifying winters. When sufficient reports exist but thresholds are not met, label variable/lower. With insufficient records, label insufficient. Never turn missing reports into zero snow.
7. Show which weeks met the threshold, plus individual winter sample counts. All claims are historical observations at one station, up to 40 straight-line miles from the trail-area reference.

**Six inches** is an explicitly described illustrative station snow-cover proxy, not a guaranteed snowshoe threshold, probability, trail forecast or safety rating. Topography, elevation, canopy and lake effect can diverge substantially from a reporting station.

## User experience
Each named trail's detail contains the already-built four-week depth graphs and a **new full-season chart**: 26 accessible weekly columns from Nov–Apr. Green denotes the threshold clearing the strict multi-year gate; neutral is variable/lower; hatched gray denotes inadequate observed data. Clicking a week shows measured-day coverage and ≥6-inch daily counts for each winter and a dated NASA snow-cover image control on CARTO centered on that trail's reference area.

No phone/outreach process, parking directions, falsely verified parking status or public search-indexed page is added.

## Loss function
| False claim / defect | Cost |
|---|---:|
| Missing daily record silently displayed as zero | 100 |
| Station readings claimed as on-trail snowshoe or plowed-lot conditions | 100 |
| Different stations combined as one station's record | 100 |
| Sparse week presented as reliably snow-covered | 100 |
| Leap-year March misaligned or incomplete winter treated as complete | 100 |
| Timeout triggers fabricated depth measurements | 100 |
| NASA imagery mistaken for measured numeric station history | 100 |
| Unbounded regional all-station Nov–Apr download | 20 |
| Map reset from missing satellite imagery | 20 |
| One extra click to start history exploration | 1 |

**Release gates:** tests for station consistency, QA, leap years, missing days and NOAA outages; all repository tests, production build, HTML audit, and a real network/browser smoke test. Tests with mock NOAA responses do not certify that a live NOAA endpoint responded successfully. Source imagery is a historical map overlay, not a parking camera. The research preview remains noindex and direction-disabled.

## Follow-on
Real-browser NOAA and NASA tile inspection; optional NOHRSC or SNODAS modeled historical point-series separately labeled, with elevation/terrain bias research before cross-source integration. If reporting coverage is poor, show unavailable, never estimate an invented snowshoe success percentage.
