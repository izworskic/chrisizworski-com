# Rocket Launch Live — launch-side weather intelligence (2026-11-01)

## What was built
The national Rocket Launch Live engine now adds a dedicated launch-side weather panel separate from spectator cloud/visibility and access. The Florida Space Coast API also exposes the same `launchWeatherIntelligence` object while retaining its independent `nextDecision.launchWeather` official approval status as **unknown**.

A mission must have a minute- or second-precise target inside seven days. Only then does the server resolve a representative *regional range-area* NWS point, check the official `/points` gridpoint URLs, fetch bounded gridded and hourly forecast data and evaluate the target time. Never send NWS or provider credentials to the browser.

## Weather signals

- NWS: `probabilityOfThunder`, `probabilityOfPrecipitation`, `windGust`, `windSpeed`, `skyCover` and hourly `shortForecast` when available.
- Heuristic display thresholds **are not launch flight rules**: thunder 20/40%, precipitation 35/60%, gust or wind 22/35 mph as watch/elevated surface signals. These thresholds merely organize information for public readers and require validation against user comprehension. They must never be reported as the official probability of a weather-rule violation or chance of a scrub.
- UTC forecast intervals, documented NWS units, source date validation and 18-hour maximum grid age. Invalid units, stale values, null values or missing data are not filled, extrapolated or considered clear. Missing thunder-probability data remains unknown even when other fields are known.
- T–24, T–12, T–6, target and T+2 forecast snapshots are rendered only when valid and within the current forecast horizon. They are forecast evolution around *one currently selected target*, not a time series of measured weather, and will change when mission time changes.
- Provenance clearly calls the location a **regional reference point, not the launch pad**, links the NWS grid and appropriate official range source, and keeps `officialApproval: not-verified` and `officialProbabilityOfViolation: null` at all times.

## Important distinctions

1. A public near-ground NWS forecast does **not** measure triggered lightning, electric field, thick-cloud flight criteria, upper-level winds or wind shear, booster recovery, marine conditions, collision avoidance, launch vehicle tolerance or mission-specific flight commit rules.
2. Official 45th Weather Squadron forecasts for Cape Canaveral have a separate **probability of violating weather rules (PoV)**. That value is only valid if read from a current, mission-matched *official forecast*, and it is not a generic NWS local rain/storm probability.
3. Flight rules differ by rocket/mission. Do not reverse-engineer an official GO/NO-GO or PoV from the numbers exposed here. The user must still consult the operator and range on launch day.
4. A time in the calendar is neither a weather permit nor access confirmation. The national and Florida pages keep these data layers separately scoped.

## Sources to verify / extend

- 45th Weather Squadron official weather portal: https://www.patrick.spaceforce.mil/About-Us/Weather/
- 45th launch forecast FAQ / official mission forecasts: https://45thweathersquadron.nebula.spaceforce.mil/pages/launchForecastSupport.html
- NWS API: https://www.weather.gov/documentation/services-web-api
- NWS gridded forecast semantics: https://www.weather.gov/gis/NDFD_metadata.html
- FAA flight commit requirements: https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450/subpart-D/section-450.165
- NASA Artemis II program-specific weather criteria (illustrates mission differences): https://www.nasa.gov/artemis-ii-weather-criteria/

The next extension should ingest *verified mission-matched and dated official range forecasts*, extract their explicit PoV and risk factors using robust document-source controls, and display them above (not blended with) NWS contextual signals. No unsupported official PoV is represented as live in this release.

## Acceptance gates

- API ignores ambiguous or far-out targets, rejects unknown NWS URLs, degrades on failed forecasts and excludes hidden credentials.
- Freshness and unit conversion are tested, with explicit nulls for missing fields.
- National and Florida APIs preserve existing response properties; launch-weather object is additive.
- No UI surface reports GO, NO-GO, percent chance of launch, live radar, marine conditions, or rocket visibility from NWS.
- Existing canonical/search indexing and CARTO/Osm fallback remain unchanged except for updated versioned static assets.
