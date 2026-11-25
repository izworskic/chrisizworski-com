# ShoreFeel: one air/wind/water interpretation across the Great Lakes
Date: 24 November 2026. Stage: PR, pending owning-repository and browser gates.

## Diagnosis
- **50 Michigan Beach Report pages:** already calculate Open-Meteo area apparent air and a qualitative NOAA buoy/air-water contrast through \`lib/shorefeel/beach-network.js\`. Offshore buoy readings are not measurements at the sand.
- **16 non-Michigan U.S. detail pages and the U.S. explorer:** already use the same NWS wind chill/heat index helper as Saginaw Bay, but used to stop at the area comfort calculation. No local water-vs-air evidence or wind exposure was surfaced.
- **30 Ontario detail pages and Ontario explorer:** use ECCC city hourly forecast and Canadian wind chill, but no water-vs-air analysis and no summer humidex display even when source provides humidex.
- **Saginaw Bay:** already has an explicitly research-stage physics scenario, a forecast-grid comparison, and NOAA satellite evidence. Its **experimental numerical scenario is not a validated beach thermometer** and cannot be copied as a fabricated point estimate to the other 95 pages.

## Experience Investment alternatives
- **A. Show the existing area apparent temperature everywhere and simply relabel it "beach real feel."** Rejected: materially misleading and fails the visitor question.
- **B. Share the verified air/wind interpretation engine and add a dated, optional nearest NOAA GLSEA water pixel for the 46 U.S./Ontario sites, with strict freshness and no numeric shoreline correction.** Selected: makes lake influence useful where NOAA provides defensible context and preserves real no-data states.
A new animated regional thermal map was also rejected: water pixels do not show a moving lake-breeze front or predict on-sand air. The pages retain their distinct editorial and geographic experiences, not a cloned Saginaw hero.

## Inputs and provenance
- NWS U.S. **land-area hourly** forecasts via existing two-request \`/points -> forecastHourly\` path. Source timestamp at most 18h; valid hour current. Air F; wind mph; humidity %, NWS wind-chill / heat index formulas.
- ECCC Canada **city-area hourly** GeoMet forecast via existing public City Page Weather collection. Within 55 km; issue and forecast timestamps gated. Temperature C; wind km/h and cardinal direction. Published hourly humidex when actually present and temp >= 20 C; otherwise existing Canadian wind-chill computation when eligible, or air temperature.
- NOAA GLERL **GLSEA_ACSPO_GCS daily satellite-derived surface-temperature grid** via the existing NOAA ERDDAP dataset \`sst\`. The new optional per-location bounded box requests four days of pixels, at most 3 seconds per call; the existing \`parseGLSEAGridCsv\` enforces NOAA's physical/temporal field contract. Only a valid sampled offshore pixel **within 4 km**, with analysis time **within 36h**, is accepted. No arbitrary visitor-supplied URL, no lakewide mean, no NDBC station substitution, and no imputation when NOAA times out or has clouds/invalid pixels.
- \`lib/shorefeel/shoreline-real-feel.js\` invokes the established \`beachFeel\` wind-bearing/sector logic. The bearing from the beach reference point to a nearby NOAA water pixel is **an approximation, not a surveyed shoreline normal**, especially near harbors, islands and complex bays. NWS and ECCC wind direction are forecasts, not observed local shoreline wind.

The output \`shorelineRealFeel\` is a versioned contract:
\`status,version,temperatureF,method,water,windExposure,waterAirContrastF,lakeEffect,calibratedOnSand,beachAirCorrectionF,limitation\`.
\`temperatureF\` copies the provider apparent-temperature method without adding NOAA temperature. \`beachAirCorrectionF\` is **always null**. \`lakeEffect.status\` is \`contextual\` only if a source-gated NOAA pixel exists; otherwise \`unverified\`. The contrast is **area forecast minus a distinct offshore water analysis**, never on-sand minus town-air.

## Pages and experience
- The 46 generated regional detail pages gain one concise, plain-language \`feel-lake-effect\` explanation immediately after the prominent area-apparent temperature and wind. Edit their generator, never commit generated children.
- Both regional explorer selections show the same evidence directly in the existing report. An old request is still aborted on selection changes; no new dropdown, extra map, blank photo or redundant card.
- The 50 Michigan beaches retain their already-integrated NOAA buoy context and modeled area apparent temperature, so no water API flood is added to the 50-beach aggregate endpoint. The Saginaw Bay research panel remains a separate, clearly labeled scientific pilot.

## Safety, sources and restrictions
- NOAA source: https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.graph
- NOAA GLSEA explanation: https://coastwatch.glerl.noaa.gov/satellite-data-products/great-lakes-surface-environmental-analysis-glsea/
- NWS wind chill: https://www.weather.gov/safety/cold-faqs
- NWS heat index: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
- ECCC humidex/wind chill: https://www.weather.gc.ca/windchill/wind_chill_e.html
- ECCC Data Server End-use Licence: https://eccc-msc.github.io/open-data/licence/readme_en/

Never imply a 4-km grid pixel is shore water, a 55-km city forecast is an exact beach forecast, a cold-water value is a swim-safety verdict, or a wind sector proves lake-breeze front arrival. Always preserve local park and public health source links. Source absent means **unknown**.

## Technology fit and rollback
Keep HTML/CSS, existing browser JS, Node API and pure source parsers. No Rust/WASM (no CPU bottleneck), Java (no runtime need), Python (offline calibration reserved for scientific phase #1810), paid API, Redis, database, new function, cron or client geolocation. If NOAA is unavailable, preserve valid air comfort and label the lake influence unverified. Revert this PR to roll back the additive evidence layer. NOAA request volume and latency remain an operational metric to observe, not assumed free of load.

## Verification required before any merge
\`node --test tests/shorefeel-unified-real-feel.test.js tests/shorefeel-us-coast.test.js tests/shorefeel-canada.test.js tests/shorefeel-physics.test.js\`, generated-detail audits, \`npm run verify:all\`, release and source pins; browser for 390px and 1280px U.S., Ontario and at least one Michigan page, including NOAA missing, late ECCC/NWS source, wind-sector changes and select A->B->A. Preserve canonical and Person schema, existing Auto ads, sitemap and contrast. Record PR run URLs and independent public verification separately. No claim of calibrated beach-temperature skill or SEO benefit.
