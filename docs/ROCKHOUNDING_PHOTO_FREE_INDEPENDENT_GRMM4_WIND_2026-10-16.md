# Rockhounding without photos — independently measured Grand Marais wind

2026-10-16. Actual NOAA station-level verification; no new agate find claims.

## Why another non-photo sensor matters

The lake-based GLOS Grand Marais Spotter measures offshore significant wave height and wave-from direction. Per its [original data catalog](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html), wind on Sofar Spotter platforms is **estimated using the wave field**, not directly observed anemometer wind. Therefore those estimates are not independent corroboration of shoreline weather.

Grand Marais NWS station **GRMM4** is a separate, instrumented coastal station. [NDBC original source](https://www.ndbc.noaa.gov/station_page.php?station=GRMM4) states:
- Position: **46.684° N, 85.972° W**, owned and maintained by the National Weather Service Weather Forecast Office Marquette.
- Direct anemometer speed in **m/s**, wind-from direction in **degrees true**, instrument nominally **9 m above site elevation**.
- The original NDBC text file [GRMM4 45-day observations](https://www.ndbc.noaa.gov/data/realtime2/GRMM4.txt) includes **2026-10-15** original observations. Example at **19:50 UTC**: **150° from SSE**, **7.2 m/s**, **8.8 m/s gust**. Source provides original exact UTC; **this is a dated sample, not a claim about current conditions at page load**.
- **WVHT is missing (MM) at GRMM4**: the land/harbor-station wind observations do **not** supply measured surf or even open-water wave height. Waves remain independently measured by **SPOT-1361**.

These independently measured near-Grand-Marais wind values help explain offshore wave conditions. A local wind direction unlike the offshore wave-from direction can be perfectly real during **swell, wave persistence or a changing fetch**; disagreement is not a sensor fault and does **not** imply calmer beach water.

## Delivered

- `lib/rockhounding/ndbc-grand-marais-wind.cjs` validates the real NDBC original text column header and units, rejects future times/duplicate conflicts, interprets 360° from North as 0°, respects `MM` missing wind and gust fields, requires at least 6 measured recent samples with no more than 1-hour gaps and limits accepted age to 3 hours. Computes a speed-weighted circular three-hour average **wind-from** angle; does not average angles linearly across the 360° crossover. Disparate angles to freshly measured GLOS **wave-from** are descriptive only, with explicit physical context.
- `api/rockhounding-wave-pulse.js`: **one additional independent free source pull** from the same already CDN-cached/15-minute response, not a second client request. Failures are caught as missing wind with **no change to original GLOS wave, NOAA lake stage, or NWS marine alert evidence**. No paid keys, no API credentials and no user photos.
- `public/rockhounding-lab/index.html`: clearly labeled local measured wind panel at top, with 9 m station source, original timestamp, true wind-from direction, recent peak gust, and possible separation from the buoy's separately observed wave-from direction. When incomplete/old, prints wind unavailable. Displays neither GRMM4 wave heights nor unsafe site exposure predictions.
- Tests verify genuine original NDBC source fields, wind-wave source separation, timestamp freshness, MM handling, local directional circular averaging, robust wind outages, one cached API response with **six** upstream free source calls (one GLOS; one NDBC; one NOAA CO-OPS Marquette; three NWS), and all existing rockhounding and advertising/indexing guards.

## Fundamental product distinction

This is a **measured storm-disturbance and post-storm lake-settling tool**. It can describe changing offshore waves, regional water-level movement, local winds and NWS marine hazard alerts **without any photographs**. It cannot yet establish whether a specific storm displaced pebble sediment on Agate Beach, changed the beach waterline, or uncovered agates. Nor can a calm wind or absent NWS alert certify safe collecting. The protected Bayshore Park harbor has no directly measured breaking-wave sensor, and photo-free source observations cannot be transmitted into the harbor with an invented attenuation factor.

The photo studies are **optional research** and not blockers for displaying the real, source-backed environmental signal. Do not add photo-upload collection, expensive satellite imagery, or another visual registration project as the primary development priority.

Next technical work should focus on hardening the actual live NOAA/NDBC/GLOS/NWS data freshness and site-specific usability, not on reconstructing beach changes from mismatched images.

No ad placement, canonical or indexed page changed. The noindex rockhounding research page gains a measured wind context card only.
