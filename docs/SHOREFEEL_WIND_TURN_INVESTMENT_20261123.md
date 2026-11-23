# ShoreFeel Saginaw Bay — hourly wind turns and forecast-grid contrast
**23 November 2026. Stage: implementation PR; not a calibrated beach thermometer.**

## Visitor question and prior baseline

"I'm driving to Bay City State Park. Will the wind turn off the lake while I am there, and what does the nearby forecast actually say compared with inland?"

Existing ShoreFeel led with a current NWS area apparent-temperature reading and NOAA bay-water evidence. The experimental physics panel offered a 27-scenario, **not calibrated**, sensitivity envelope and one current shore/inland forecast comparison; it did not show the forecast's next few hours. This phase preserves the large first answer while exposing how the **already retrieved** NWS hourly forecast is expected to change. Public URL ownership stays at `/lake-huron-water-temperature/saginaw-bay/`.

## Experience Investment decision

Two materially different approaches were considered:

- A: Place a new full interactive weather map and speculative lake-breeze front animation atop the page. Rejected: a forecast wind vector cannot tell the front's actual position, more map controls bury the air answer and the existing water-evidence map already gives geography.
- B: Put a compact, horizontally readable **wind-turn time strip** immediately *after* the forecast-led hero, with each hour's NWS wind *from* direction, area air temperature and, only where model grids really differ, two-grid NWS temperature contrast. Selected: the time dimension solves a different question without an extra full-screen map or scores.

This experience differs from the all-five-lakes water-temperature table (whole-lake comparison) and Grand Haven's water-model outlook (marine water change): it is a **forecast-direction change desk** with a paired land-forecast temperature contrast, not another water-card grid.

No forecast wind is treated as an observed lake-breeze front, and a model shoreline-grid forecast is not renamed "temperature at the beach."

## Implementation, data path and scope

1. `lib/shorefeel/wind-turn.js` is deterministic. It classifies each **valid** NWS hourly land-forecast wind as from-bay, from-land, alongshore or unknown using the existing beach-to-inner-bay bearing and existing `breezeSector`. A "turn toward bay" requires a documented non-onshore forecast hour followed by **two contiguous hourly onshore forecast periods** at wind speeds at least 3 mph. A single blip, missing hour, conflicting duplicate, stale forecast or unverified wind direction cannot trigger a turn. This is a presentation convention, **not a statistical confidence interval or predicted physical lake-breeze onset**.
2. `lib/shorefeel/paired-hourly.js` compares hourly temperatures ONLY when NWS `/points` returns **verified different** forecast grid identities for Bay City State Park land-side `43.6714,-83.9120` and west Bay County `43.6714,-84.1000`. Each comparison uses exactly matching forecast valid hours; no 400 m gradient, independent thermometer, or degree correction is imputed.
3. NOAA satellite-derived inner-bay surface water may inform qualitative air-water contrast at the shift hour only while valid within **36 hours of that hour**. The seasonal 45163 buoy, fixed SBLM4 station and whole-lake Huron mean remain separate measurements; none substitutes a sand thermometer.
4. `api/shorefeel.js` derives `windTurn` and `hourlyAirComparison` from **existing** `weatherFor` calls and existing NOAA water. Neither creates an endpoint, additional source call, daily job or cache.
5. `public/lake-huron-water-temperature/saginaw-bay/index.html` adds a source-labeled field strip below the existing numeric hero and before water evidence. Browser JS renders forecast hours using DOM text nodes; when inputs are absent, an NWS source notice replaces any promise. The existing interactive water map, canonical, Person JSON-LD, AdSense loader and scientific research disclosure are unchanged.

Cache freshness: the browser rejects a shared API response generated more than 30 minutes ago and refuses to present a forecast valid for a previous hour as current. The numeric hero, wind strip, and activity summary fail closed independently of the broader shared CDN cache policy; an incorrect viewer clock also favors unavailable over a false current reading.

### Versioned data semantics (internal API addition)

`windTurn`: `status: available|partial|unavailable`; `phase: onshore-now|forecast-turn|none|unknown`; `at` is a forecast valid hour or null; `hours[]` has NWS valid UTC `startsAt`, `windFrom`, `windMph`, `areaAirF`, `sector`; `water` is a dated NOAA offshore satellite analysis or null; `forecastAirWaterContrastF` is **air forecast minus water analysis**, not an adjusted beach temperature. `confidence: not-calibrated` is a label, not a score.

`hourlyAirComparison`: `status: available|partial|unavailable`; `gridRelationship` from verified NWS metadata; `rows[]` with `startsAt`, `shoreF`, `inlandF`, `shoreMinusInlandF`. `publicationAuthorizedAsBeachCorrection: false` is immutable. Bad/missing/conflicting inputs are excluded, never filled with zeros.

## Primary sources and scientific boundaries

Checked 2026-11-23:

- [NWS hourly API documentation](https://www.weather.gov/documentation/services-web-api) — `/points` -> `forecastHourly`, forecast valid periods and wind. NWS **forecasts** are grid estimates, not beach-site observations.
- [NWS Great Lakes lake-breeze explanation](https://www.weather.gov/apx/lake_breeze) — physical mechanisms and wind shifts. Wind turns alone cannot establish observed front passage, and the NWS grid may not capture small-scale onset.
- [NOAA GLSEA Great Lakes surface analysis](https://coastwatch.glerl.noaa.gov/satellite-data-products/great-lakes-surface-environmental-analysis-glsea/) — offshore surface-water analysis, not a thermometer in the swim area.
- [NOAA RTMA/URMA model overview](https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/rtma.php) and [NOAA HRRR public archive](https://registry.opendata.aws/noaa-hrrr-pds/) — appropriate offline, source-dated comparison candidates for a future event hindcast, **not incorporated into this request-time feature or independently verified beach ground truth**.

### Scientific release limits

A two-grid NWS temperature difference is useful for understanding the regional forecast's interpretation, not the difference between shoreline and one-quarter mile inland. No 400 m on-sand correction is published. The numerical physical sensitivity envelope in the earlier research disclosure remains an exploratory model, not an error bar. Dedicated observed beach-air temperature skill remains blocked by independent field data; see issue #1810.

A real NWS hourly forecast **is still a prediction**. Avoid "lake breeze arrives at 3 PM" or "beach will be 8°F cooler." Instead, "NWS forecast winds turn toward the bay around 3 PM; beach-air change is not measured."

## Design and technology fit

- HTML/CSS: **keep**, semantic source-first field strip and scroll-contained hours. No universal dashboard skin and no extra ads above the forecast.
- Browser JavaScript: **keep**, time rendering from existing data; text content only; no new JS framework, heavy chart or package.
- Existing Node.js API: **keep**, deterministic small pure modules; same weather and NOAA calls, same response cache headers.
- Python: **defer**, justified later for offline HRRR/URMA archive reconciliation and true out-of-time measured-station benchmarks; not justified for lightweight run-time hourly data.
- Rust/WASM: **reject**, no measured CPU bottleneck or large geospatial computation.
- Java: **reject**, no JVM service owner or specialized library requirement.
- New map/animation: **reject**, the weather question is about a *time sequence*, not an observed moving front.

Rollback: revert this PR. No new infrastructure or data schema written to persistent storage.

## Verification and release record

Deterministic coverage: same-cell and missing-grid refusal; matching UTC hours; hour-gap, duplicate and conflict handling; winter/daylight-independent forecast logic; daylight-saving local-offset uniqueness; expired/future water; no local-value substitution; page and API integration. Test scripts: `node --test tests/shorefeel-wind-turn.test.js tests/shorefeel-paired-hourly.test.js tests/shorefeel-physics.test.js`, then `npm run verify:all` in the repository CI.

**Real browser quality gate (pending independent evidence):** inspect 360/390/768/1280/1440 widths, particularly no horizontal page overflow from the hour strip, forecast-first visual hierarchy, water map/controls, source failure/no-JS fallback, keyboard, source meaning and Google Auto ads not stacking. Compare a windy forecast → missing wind → recover state. Do not mark this stage passed based only on static tests or Vercel READY. After owner-authorized merge, inspect live public HTML and browser with source freshness; record performance/CTR only from comparable real measurements.

**Current release stages:** implementation on isolated PR branch; CI/browser/deployment status to be recorded after workflow runs. No claim of measured search, forecast or beach-temperature accuracy improvement.
