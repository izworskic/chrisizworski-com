# ShoreFeel: online-source-only coastal air research

**2026-11-21 owner correction:** ShoreFeel uses **only existing public online data**. No sensors to buy or install, no physical weather logger study, no park permit, no research partners, no privately recorded station data, and no manual input required from the owner. The earlier proposed hardware field-pilot is superseded.

## What visitors actually want

The user wants the best supportable estimate of how air feels **at the beach** when the lake wind and cold water may make it very different from inland air. The site should tell that story through a strong factual, accessible shoreline narrative, paired with a temperature and context, not a technical instrument dashboard.

**Crucial distinction:** The available public sources do not necessarily resolve the 400-meter temperature difference between the sand and land a quarter-mile inland. A source-backed **shoreline-area forecast** is actionable, with a qualitative lake-effect interpretation. A forecast difference between grids 15 km apart is not the actual quarter-mile beach gradient.

## Approved online source stack

| Online provider | Actual value / spatial meaning | What we may display | What we cannot claim |
| --- | --- | --- | --- |
| NWS API `/points` + `/gridpoints/.../forecast/hourly` | Official ~2.5 km-class hourly land forecasts for reference location; temperature, humidity and wind | Source-dated shoreline-area air / feels-like estimate and NWS forecast evidence; distinct-grid cross-region comparisons when identity verified | On-sand thermometer or measured 400 m gradient |
| NOAA NCEP HRRR | ~3 km-class forecast model; multiple issue hours | Modeled air field and direction of coastal contrasts when product/grid/time and lead are verified | Independent beach truth; NWS beating a measurement |
| NOAA NCEP URMA | Retrospective ~2.5 km-class surface analysis | Descriptive historical comparison and possible model-versus-analysis diagnostics with matching valid times | Forecast produced before the analysis time, field observations, or prospective skill |
| NOAA GLERL GLSEA ACSPO | Satellite-derived surface-water pixels | Fresh, geographically specific open-water temperature with age and pixel distance; lake-air contrast context | Actual shallow-water or dry-bulb beach-air thermometer |
| NOAA NDBC SBLM4, 45163 | Offshore/fixed marine wind/air where genuinely reported | Dated marine-air and wind contrast if ATMP exists and passes quality/freshness | Local on-sand air or guaranteed air-temperature availability |
| GLOS Seagull coastal weather stations | Actual instrument air and wind observations at named, source-specified shoreline platforms | Dated local observed context and historical coverage gaps; GLOS QC codes enforced | Auto-generalization to another beach, paired on-sand/inland measurement or site-specific calibration |

Sources:
- https://www.weather.gov/documentation/services-web-api
- https://registry.opendata.aws/noaa-hrrr-pds/
- https://registry.opendata.aws/noaa-rtma/
- https://www.ndbc.noaa.gov/station_page.php?station=SBLM4
- https://www.ndbc.noaa.gov/station_page.php?station=45163
- https://seagull-erddap.glos.org/erddap/info/obs_127/index.html
- https://apps.glerl.noaa.gov/erddap/

## What the new code contributes

1. `scripts/shorefeel-glos-observations.py`: reuse a bounded official GLOS station dataset. Quality, sample time, declared units, no dangerous arbitrary URLs, no fabricated air values and no forced current status. The Petoskey station is a geographically different observed coastal context. Previous exact-source run retrieved **25 raw rows (23 air temperatures passing QC; 21 with passing air and wind)** on 2022-06-01 12:00-16:00 UTC. Do not interpret those historical figures as current weather.
2. `scripts/shorefeel-nws-forecast-capture.py`: retrieve two **official NWS land-area point forecasts** at fixed public Saginaw Bay model-grid references, preserve true receipt timestamp and model grid metadata, and keep only future-valid forecast periods. Previous exact-source run had 48 future valid hours at each distinct `DTX` grid cell. No owner data, no sensor or station hardware.
3. `scripts/shorefeel-online-coastal-contrast.py`: compare **the same valid hour** for two NWS grid forecasts only if distinct grid cells, issue times within 20 minutes, validated weather values, official source URLs and prospective receipt times. Return a **forecast-grid difference**, never a quarter-mile on-sand measured cooling value. Explicit `null` for unattainable beach air, observed difference and calibrated correction. If grids are the same, timestamps unsuitable, source metadata compromised or values absent, return no comparable hours.
4. `.github/workflows/shorefeel-online-only-evidence.yml`: exact-head repeatable scientific tests, bounded real NWS/GLOS source audit and full owning repository regression gate. Retained JSON is only official public weather data, in temporary workflow artifacts; no new runtime function, persistent service, scheduled job or Redis.

### Explicit scientific limits

The *shoreline-area temperature* remains the NWS forecast (or NWS computed feels-like when valid). Existing research physics scenarios are not field-calibrated and must remain experimental. HRRR/URMA products are models, not withheld independent thermometer measurements. A coincidental agreement between modeled grids does not establish accuracy at a beach. Real GLOS observations can establish a coastal platform's actual air conditions, but stations' siting/height and lake geometry differ across destinations.

**Useful online-only next phase:** compare multiple archived HRRR issue hours to corresponding URMA analyses across representative seasons and wind regimes with equal-valid-time joins. Label results `model-versus-analysis`, measure model grid discrepancies and coverage, and use this to determine whether model-based coastline temperature scenarios are stable enough for **a clearly caveated beach-area estimate range**. This can assess grid agreement, *not* true on-sand skill. Never delay the useful live NWS answer behind unavailable calibration.

## Governance and QA

This work replaces the hardware assumptions in PRs #1828, #1829 and #1830 with an online-only implementation on a clean `main` branch. Close those stacked PRs as superseded before a new online-only merge. Do not merge them or claim any need for instrument permission or sensor access.

Use Python only for reproducible offline research and source auditing. Keep the existing lightweight runtime JavaScript/API and accessible park-interpreter language. No changes to AdSense auto ads, JS layouts, the beaches catalog, SEO/canonical, identity, map tiles, agency endorsements or billing.

A successful CI audit proves only that the source route and parser work on the sampled windows, not that the site estimate is calibrated. Run all `test_shorefeel_*.py` plus `npm run verify:all`; check exact workflow results. No production verification is claimed unless the page actually changes.
