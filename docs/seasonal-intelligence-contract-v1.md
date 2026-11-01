# Michigan seasonal intelligence contract v1

**Owner:** `izworskic/phenology-michigan` (source, science and refresh)
**Consumer endpoint on chrisizworski.com:** `/api/garden-seasonal-heat?zip=48706`
**Source provider endpoint:** `https://phenology.chrisizworski.com/api/seasonal-heat?lat=43.6038&lon=-83.9554`
**First consumers:** `/leafcutter-bees/`, `/michigan-gardening/`. Other tools may join without duplicating the science or source calls.

## Reasons and data contract

1. A five-digit Michigan ZIP is looked up in the official 2020 Census ZIP Code Tabulation Area using `lib/leafcutter-zip.cjs`. The result is an approximate ZCTA interior point, **not a user's address**. A named reference city is a distinct, explicitly selected fallback; never silently substitute a city when a ZIP lookup fails.
2. The shared endpoint requests fixed USA National Phenology Network WMS layers, `gdd:agdd_50f` and `gdd:agdd_anomaly_50f`, for the last completed local calendar day (Jan 1 season start). An independent prior-seven-day AGDD sample is optional. The source point is a gridded weather approximation (~4km), not an observation at the user's property.
3. `totalGdd50F` is base-50°F growing degree days since Jan 1, `comparison.anomalyGdd50F` is the **official** source-computed anomaly against the source's 1991–2020 reference. Never substitute an unrelated long-term-average raster to manufacture a baseline: during source validation, the separate 30-year mean layer did not match the anomaly's implied reference exactly.
4. The generic calculation for normalized comparison is `max(0, (dailyHighF + dailyLowF)/2 - 50)`. The leafcutter NWS 7-day forecast uses that same *method*, applying it to an hourly-derived complete local day; the two totals have **different meteorological sources and dates** and may not be added without explicit forecast-bridge provenance.
5. **Northern/coastal grid coverage:** the official accumulated heat raster and the 1991–2020 anomaly raster do not always cover the same pixels. For Houghton ZIP 49931, on 2026-10-31, the USA-NPN base-50°F AGDD map supplies 1874.3693, but the anomaly map supplies -9999 (missing). The shared provider returns `status:PARTIAL`, the verified GDD50 total and optional week change, `comparison:null`, and explicit no-average messaging. Consumer tools must show that available evidence while NEVER treating -9999 as an actual anomaly or manufacturing an average. If the main accumulated heat is absent, the entire heat result remains unavailable.
6. Source freshness is limited by the time dimension requested from NPN; GeoServer's response timestamp is the query timestamp and **not** verified raster publication time. The consumer rejects stale and mismatched data, errors or missing exact properties; it never creates zero data where source evidence is missing.
6. `bloomStatus` and `speciesEmergenceStatus` are `UNVERIFIED`, by design. The USA-NPN spring leaf/bloom models represent early-season indicator plants and do not establish the presence of summer nectar forage. Gardener-confirmed blooms and nest suitability remain decision gates for purchased bees.
7. The engine is **shared evidence**, not a shared biological model. Maple sap depends on freezing nights/thaw days; morels require soil and moisture; trillium has its own calibrated thermal window; birds have distinct observation pipelines. Each may consume regional thermal background but must preserve its own domain-specific model, source age and actionable verdict.
8. The free Open-Meteo API expressly does not permit advertising-supported commercial sites. This shared module uses official USA-NPN sources instead, with no new Open-Meteo calls. The older site and phenology Open-Meteo uses merit a separate licensing review before scaling.
9. No new API keys, Redis, cron, persistent ZIP storage, or GPS permissions. Cached results at the public API edge for six hours per ZIP/city and phenology point. Both page experiences are mobile-first, accessible, and don't modify existing indexed content's canonical or basic tool architecture.

## How future tools consume it

Call the **same-origin** endpoint server-side or from an explicit visitor interaction; don't fetch provider source WMS directly from browser and don't copy its formulas into new repositories. Expect a source-qualified document with `schema: seasonal-heat-v1`, `status`, `asOfDate`, `totalGdd50F`, `comparison.anomalyGdd50F`, optional `weekChangeGdd50F`, `sourceUrls`, `site`, `method`, `modelNotObservation`. For no or stale data, show `UNKNOWN` rather than fallback to another location, climatology or unverified biological event.

**Quality gate:** ZIP 48706 live matching, alternate ZIP city verification, missing-ZCTA fail closed, mobile 390px, low-confidence unavailable messaging, January 1 rollover, NWS weather source still independent of NPN source. Production providers and consumers must both pass CI, and the provider must be deployed before the consumer is merged.

Source: [USA-NPN accumulated degree days](https://www.usanpn.org/data/maps/AGDD) and [NPN geospatial layers](https://usa-npn.github.io/rnpn/articles/VI_geospatial.html).
