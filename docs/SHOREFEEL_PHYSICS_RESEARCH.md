# ShoreFeel physical lake-air estimator: research-stage engineering model

Status: **implemented as a deterministic research-only API and visible numerical scenario range, not a locally calibrated beach-temperature forecast**. It must not replace NWS beach-area air forecast or imply certainty, actual beach measurements, swimming safety, human wet-skin risk or verified air temperature within a quarter mile of shore.

## Visitor need and two concepts

The visitor wants to know whether the beach will feel ten degrees cooler than inland. Previous ShoreFeel led with NWS beach-area apparent temperature and qualitative lake-breeze reasoning.

- Concept A: *Forecast comparison.* Compare two NWS hourly point forecasts on shore and about 16 km inland and show the difference. Advantage: source-backed, inexpensive and interpretable; limitation: forecast grids can be the same coarse cell or both coastally influenced.
- Concept B: *Coastal thermal-transfer sensitivity desk*. Combine independent inland NWS area forecast, NWS wind-from direction, recent inner-bay NOAA GLSEA pixel and an idealized air-over-water exchange model. Show an ensemble of numerical scenarios, not a point forecast; refuse missing/stale/non-onshore data. Advantage: mathematically explores how large cooling could be, with explicit unknown parameters. Limitation: cannot yet forecast the actual temperature on Bay City State Park's sand. Both are delivered, kept separate.

Closest tools: the existing all-five-lakes ShoreFeel water hub and Grand Haven water/comfort page. The Saginaw pilot instead explicitly compares a *shore-air and inland-air* pair and mathematically investigates water-to-air heat transfer.

## NOAA and NWS input sources

1. **NWS hourly forecast for Bay City State Park** from the existing NOAA /points -> gridpoint forecastHourly contract. Air (F), relative humidity (%), wind speed (mph) and wind-from cardinal direction. A point forecast is not a thermometer.
2. **NWS hourly forecast for an independently requested location 43.6714, -84.1000**, west Bay County. About 16 km west of the park, chosen to probe inland contrast. It may still be lake influenced and its grid may not resolve a small coastal microclimate. The two forecast period timestamps must align within one hour. Differences are forecast-to-forecast, never measured-to-measured. Both coordinates are checked against NOAA/NWS `/points` metadata (`gridId`, `gridX`, `gridY`). If both resolve to one NWS 2.5 km grid cell, or if grid identity is missing, the visitor sees **no independent shore/inland difference and no thermal-transfer scenarios**. Distinct grid cells are forecasts, not independent thermometers or proof of quarter-mile temperature gradients.
3. **NOAA GLSEA ACSPO grid surface temperature** from inner Saginaw Bay, with a valid sample no older than 36 hours. The existing API uses a satellite-derived open-water grid pixel several kilometers east/northeast of the park, not shallows or a shoreline thermometer. No whole-lake mean substitution.
4. **NOAA NDBC 45163 air temperature (ATMP)** parsed from the same already requested buoy realtime feed (Celsius to Fahrenheit). Freshness at most 6 hours. This instrument is in **outer Saginaw Bay, far offshore**. It is retained only as a physically independent observation and not used as an exact local beach air reading, a calibration target or a warming correction. Station is seasonal and will often be unavailable.
5. **NOAA NDBC SBLM4 Saginaw Bay Light #1**: optional, year-round fixed C-MAN lighthouse observation stream when `ATMP` is actually present. Official NDBC location approximately 43.810 N, 83.720 W, in mid Saginaw Bay roughly 20 km from Bay City State Park. The source has sometimes published missing ATMP values; an observation must pass validity and the 6-hour age gate. Prefer this nearer fixed marine platform over seasonal 45163 when both report. **Neither sensor is an on-sand thermometer or a calibrated beach response.**
6. **Later**: NOAA/NCEP HRRR hourly 3 km 2 m temperature, U/V wind components and boundary-layer height, plus NOAA RTMA 2.5 km hourly surface analysis for hindcast verification. Neither is yet fetched by the live engine. GRIB ingestion in Vercel would be large and unnecessary without a batch extraction/validation design.

## Equations checked with Wolfram Language

The standard neutral bulk aerodynamic sensible heat flux is

    Q_H = rho_air * Cp_air * C_H * U * (T_water - T_air)

where Q is watts per square meter, rho is kg/m3, Cp is J/(kg K), CH is dimensionless and U is m/s. The sign is negative for heat transfer from warmer air into colder water under the selected convention.

For a constant idealized horizontal airflow over the lake and a constant vertically well-mixed layer of depth h, steady advection balances lake surface flux:

    rho*Cp*U*h*dT/dx = rho*Cp*C_H*U*(T_water - T)

Cancel rho*Cp*U for strictly positive U and constant effective parameters:

    dT/dx = (C_H/h)*(T_water - T)

Analytic solution, verified with Wolfram DSolveValue:

    T(F) = T_water + (T_initial - T_water)*exp(-C_H*F/h)

This is a **single-layer neutral bulk transfer thought experiment**, not a complete lake-breeze circulation model. It omits vertical entrainment, pressure gradients, advection direction changes, stability-dependent CH, time-varying insolation, humidity flux, cloud cover, land-surface sensible heat flux, coastal fronts and spatially varying temperature. It is not suitable for predicting lake-breeze onset, penetration or actual beach thermometers.

Wolfram independently returned, with T_initial=86F, T_water=60F, CH=.0012, h=60m:

    F=2 km: 84.98052541796041 F
    F=10 km: 81.28699958002753 F

For a 27-parameter scenario sweep using assumed F=[2,5,10] km, h=[20,60,150] m and CH=[.0008,.0012,.002], Wolfram returned approx. [69.5649,85.7241] F, median 83.5258 F. Unit tests use the same analytical values.

**None of the parameters in that sweep is a measurement of actual water fetch, mixing depth or local heat exchange on a particular forecast day.** The pixel distance from the beach is explicitly not the fetch. The sweep range is **not an error bar, confidence interval, climatological range or validated location-specific forecast**. Do not market the median as the predicted temperature. It only bounds what *these specified physics assumptions* produce.

The derivation does not directly put wind speed in the exponent because U cancels for a steady, neutral, constant-CH/h advective parcel. Wind speed/direction still determine whether the idealization is applicable, while wind-dependent turbulence, transport, stability and lake-breeze dynamics can cause much larger errors. If wind is not onshore, or is missing/light, don't apply the scenario.

## Additional meteorology used in existing ShoreFeel

NWS cold-wind wind chill (T <= 50F, v > 3 mph):

    WCT = 35.74 + 0.6215T - 35.75v^0.16 + 0.4275Tv^0.16

NWS Rothfusz heat index applies for appropriately hot/humid conditions; use the NWS simple preliminary value and adjustments before selecting the regression. Both describe thermal comfort **from area atmospheric values**, not cooling of actual air by Great Lakes water. The index excludes detailed solar radiation, wet-skin evaporation and shade exposure.

The Biggs/Graves lake-breeze index and subsequent Laird/Kristovich studies show that the *cross-shore component* of the background wind, not merely scalar wind speed, matters for lake-breeze formation. Full mesoscale lake-breeze onset modeling is an additional problem. The currently implemented wind-from sector uses bearing from the park to its nearby offshore NOAA water reference, an approximation to the coastline normal. This is not event confirmation.

## Source and research links

- https://www.weather.gov/apx/lake_breeze : NWS Great Lakes lake-breeze explanation and practical forcing
- https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2003RG000124 : Miller et al. sea breeze review, occurrence indices and cross-shore wind
- https://journals.ametsoc.org/view/journals/apme/40/3/1520-0450_2001_040_0409_lmlbcl_2.0.co_2.xml : Laird and Kristovich 2001 Lake Michigan climatology
- https://repository.library.noaa.gov/view/noaa/20802/noaa_20802_DS1.pdf : NOAA/Great Lakes modeled heat fluxes and bulk transfer considerations
- https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/rtma.php : hourly 2.5 km NOAA RTMA and delayed URMA validation
- https://rapidrefresh.noaa.gov/hrrr/ : NOAA HRRR hourly 3 km model
- https://www.ndbc.noaa.gov/faq/measdes.shtml : NDBC ATMP in deg C, observation headers and absent-value sentinels
- https://www.ndbc.noaa.gov/station_page.php?station=45163 : Saginaw Bay seasonal offshore station
- https://www.ndbc.noaa.gov/station_page.php?station=SBLM4 : Saginaw Bay Light #1 fixed station
- https://github.com/weather-gov/api/blob/master/gridpoints.md : official NWS 2.5 km grid and /points provenance; two nearby points can share one cell
- https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml : NWS heat-index equation
- https://www.weather.gov/safety/cold-faqs : NWS wind-chill equation and domain

## Model verification and gates

- Node tests cover the Wolfram analytical values, 27 scenarios and bounds, missing/stale satellite data, onshore/offshore/wrong wind, time-aligned inland/shore forecasts, winter warm-water cases, NDBC ATMP units/placeholder/staleness, and the original ShoreFeel API contract.
- The independent forecast pair and the experimental sweep are visible only when their own source gates pass. On missing NOAA water or an offshore wind, there is no experimental numeric range.
- Browser tests at phone and desktop, no-JS source text, NWS outages and full repository CI must pass before review.
- Never change the actual first-screen NWS temperature based on this research-stage sweep.

## Correcting a source classification error uncovered during live NWS checks

On November 21, 2026, NOAA's live `/points` responses showed that the original ShoreFeel waterfront coordinate `43.6714,-83.9068` was classified as **marine**, forecast zone `LHZ422`, NWS `DTX/32,93`. That is not a suitable source contract for a visitor's land-side air-feel estimate at Bay City State Park.

A new forecast-only reference `43.6714,-83.9120`, about 0.42 km (roughly one quarter mile) west of the waterfront coordinate, is NWS-classified as **land**, zone `MIZ048`, grid `DTX/31,93`. The background inland reference `43.6714,-84.1000` is also land, grid `DTX/25,93`. These are actual NWS `/points` responses, not inferred grid cells.

- Waterfront coordinate stays unchanged for geographic bearing, interpretation and beach water proximity.
- Land-side point is used **only for NWS air/wind/humidity**. The API rejects unexpected non-land classifications rather than silently showing marine air as sand-side air.
- This point is still roughly a quarter mile inland and represents a 2.5 km *forecast cell*, not the beach itself. It cannot resolve quarter-mile shoreline temperature gradients.
- The authoritative live source records can be rechecked at:
  - https://api.weather.gov/points/43.6714,-83.9068
  - https://api.weather.gov/points/43.6714,-83.9120
  - https://api.weather.gov/points/43.6714,-84.1000
- Land and marine metadata are re-checked on request, with source status and cache constraints intact.

## Current extension: actual NWS grid identity and independent NOAA offshore air

The live API now retains the NWS `gridId/gridX/gridY` for both locations, blocks a numeric "shore minus inland" difference when the points resolve to one 2.5 km cell, and refuses to run the 27 physics scenarios if either location's grid identity is unverified. This is stronger than merely comparing different URL coordinates. Distinct cell differences are still **two forecasts**, not two thermometers.

The extra NOAA request is a bounded 2.6-second read of `https://www.ndbc.noaa.gov/data/realtime2/SBLM4.txt`, an official fixed lighthouse station in Saginaw Bay. Its measured air temperature is preferred over seasonal buoy 45163 when a valid recent `ATMP` report is present. Both are displayed only as **offshore** supporting observations. A missing or sentinel `ATMP` produces no reading. The existing park-area forecast and water-evidence map remain independent of both sources.

## Field measurement validation harness (offline only)

The `lib/shorefeel/field-validation.js` and `scripts/shorefeel-validate-field.cjs` additions provide an internal, deterministic scientific evaluation workflow. They are **not deployed as an API** and do not supply a public beach-air correction. Use:

```bash
node scripts/shorefeel-validate-field.cjs /path/to/measured-beach-airs.json
```

Input JSON contract:

```json
{
  "units": "F",
  "station": {
    "type": "measured-beach-air",
    "id": "YOUR-INDEPENDENT-SHORE-STATION-ID",
    "lat": 43.6714,
    "lon": -83.9068,
    "sensorHeightM": 2,
    "distanceFromShoreM": 80,
    "radiationShielded": true
  },
  "modelVersion": "version-locked-before-the-holdout",
  "modelLockedAt": "2027-06-01T00:00:00Z",
  "holdoutStartsAt": "2027-07-01T00:00:00Z",
  "observations": [
    {
      "observedAt": "2027-07-01T15:00:00Z",
      "beachAirF": 72.5,
      "nwsShoreF": 77.0,
      "modelBeachF": 73.0,
      "nwsIssuedAt": "2027-07-01T11:00:00Z",
      "modelIssuedAt": "2027-07-01T11:00:00Z",
      "windSector": "onshore",
      "eventId": "lake-breeze-event-001"
    }
  ]
}
```

**Example structure only: none of the numbers above represents a real measurement. Do not import it into the deployed tool.**

The evaluator requires independent, radiation-shielded near-water air instrumentation with a documented sensor height, not offshore buoy data or gridded analyses. It checks future/invalid readings, stale or post-issued forecasts, duplicate/conflicting timestamps, missing fields, explicit wind regime, and a locked model before the holdout. It computes paired MAE/RMSE/bias for the unchanged NWS baseline and candidate on precisely the same held-out observations, including separate onshore, offshore and alongshore regime scores. A single weather event ID appearing in both pre-holdout training and held-out records blocks the reviewable status as temporal event leakage. Event IDs must be nonempty strings supplied from genuine meteorological event identification; automatically assigning an event per row would defeat the test. These scores remain descriptive research output, not a calibrated public forecast or statistical confidence interval. At least 100 records over 14 days and 10 distinct events plus a held-out set of 40 records over 7 days and 5 events with both onshore and offshore cases are minimum **review gates only**, not evidence of scientific validity. No automatic model fitting, output publication, or performance certification is allowed, even if these counts are reached.

Only the user-provided file is analyzed; no repository data archive, personal coordinates, new paid API, Redis, database or serverless endpoint is created. Real-world field permission, instrument calibration, sensor shading and model provenance still need independent inspection.

## Next research investment to achieve useful accuracy

A practical real-beach forecast requires pairing **hourly in-situ 2-m beach-air thermometer readings** with at least one inland station, NWS/RTMA or HRRR hindcasts, NOAA inner-bay temperature, near-shore wind speed/direction, humidity, solar irradiance, and actual over-water fetch from shoreline geometry. Separate daylight lake-breeze onset from preexisting synoptic onshore wind. Use season-blocked or event-blocked training/validation to avoid leakage, compare bias/MAE/RMSE and empirical prediction interval coverage against the plain NWS beach-grid baseline. Only publish a calibrated central estimate, skill score or error bound if held-out beach observations substantiate it. Until then, prefer verified forecast contrasts and explicitly labeled physical scenarios.

## Technology fit

Keep existing serverless Node for one additional NWS /points request in parallel and pure JS deterministic numerical sensitivity; HTML/CSS for legible evidence/source display; browser JS for already existing reactivity. Python can be justified later for offline NOAA GRIB extraction, hindcast validation and regression. Rust/WASM and Java add overhead without demonstrated advantage for 27 exponentials, and were rejected. No Redis, cron, paid endpoint or new Vercel function is necessary.
