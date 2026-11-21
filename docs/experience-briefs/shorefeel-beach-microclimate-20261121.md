# ShoreFeel: put the beach microclimate first

## Visitor job
A Michigan beach visitor wants to know what the air will feel like standing at Bay City State Park, not simply whether offshore water is warm. A bay breeze can make the shore cooler than an inland forecast, even over a short distance. The National Weather Service confirms this in its lake-breeze primer: https://www.weather.gov/apx/lake_breeze

## Diagnosis
The original Saginaw pilot correctly separated satellite water pixels, seasonal buoys, air and wind, but led with water temperature and buried the weather interpretation below a water-evidence map. NWS wind-from direction was omitted, so no visitor could evaluate whether the bay breeze could be influencing conditions.

## Two candidate experiences
1. Offshore observatory: retain a large water number and move a forecast card above the map. Rejected: it still leaves the visitor to infer the lake-breeze effect.
2. Beach microclimate verdict: lead with NWS area air/apparent temperature plus an independently stated lake-breeze possibility based on wind direction and water-air contrast. A compact air/wind/water evidence strip precedes the original map. Selected: materially changes the actual visitor question and next action.

Closest existing tools: all-five-lakes water temperature hub and Grand Haven water/shoreline tool. This page is differentiated by its specific beach-air question and directional shoreline winds.

## Evidence and no-false-precision rules
- NWS hourly forecast at Bay City State Park coordinates for air, wind from-direction and humidity. It is an area forecast, not a sensor on the sand.
- NOAA GLSEA valid recent nearby open-water satellite pixel for shoreline water context, not a beach thermometer or an inland air observation.
- Wind direction is FROM a named compass bearing. The bearing toward the nearby inner-bay reference from the park is northeast. Wind from NE indicates onshore flow, wind from SW offshore; this is not proof that a mesoscale lake-breeze front exists.
- Use NWS wind chill formula only for cold/windy conditions, NWS heat index for hot/humid conditions, otherwise the unadjusted NWS area air temperature.
- A numerical beach-air correction from nearby water temperature alone is scientifically unsupported. Show the lake-breeze tendency separately, never an invented precise number, offset, interval, forecast probability or field-validated badge.
- Missing forecast or stale forecast: no numeric beach feel. Missing nearby water: area forecast may remain, but avoid lake-water contrast claims.
- Independent beach hazards, currents, bacteria and swimming safety are not inferred from air/water comfort.

Sources: https://www.weather.gov/apx/lake_breeze ; https://www.weather.gov/safety/cold-wind-chill-chart ; https://www.weather.gov/safety/heat-index ; https://coastwatch.glerl.noaa.gov/satellite-data-products/great-lakes-surface-environmental-analysis-glsea/

## Technology fit
Keep semantic HTML and scoped CSS for first-screen answer, caveat and source links. Keep browser JavaScript/Leaflet for source/map interaction. Keep the existing Node ShoreFeel API; it already collects the needed weather and NOAA data. Reject a new paid API, Python runtime, Rust service or Java process: no validated coastal-air calibration data or complicated numerical workload justifies one. Python might later support offline statistical validation after paired field measurements are collected.

## Protected release boundaries
Retain the current URL/canonical, author and Person identity, AdSense, NDBC buoy caveat, NOAA sample map, historical evidence, non-JS links and honest error states. Validate source tests, full repository gate, public HTML audit, and phone/desktop browser interaction before merge. There is no measured SEO/CTR uplift or field accuracy claim.

## Next scientific investment
Deploy or partner for paired time-stamped air thermometers at the Bay City State Park beach and a nearby inland location, capture lake/land wind shifts, cloud and humidity across seasons, and validate a local correction on independent observation days. Only after backtesting that dataset should ShoreFeel publish a calibrated numeric beach-specific temperature adjustment.
