# Rockhounding post-storm: three observed offshore events + historical UI — October 15, 2026

## What was verified remotely

Official NOAA **NDBC 45004 East Superior** station historical significant-wave-height observations were retrieved from the public THREDDS OPeNDAP 2026 near-real-time archive (`45004h9999.nc`). No paid weather API, local beach visit or municipal email was used.

**Actual source:** https://dods.ndbc.noaa.gov/thredds/dodsC/data/stdmet/45004/45004h9999.nc.html

The sampled source record was fetched in two bounded ranges using `wave_height` with a stride of 18 source rows (roughly 3-hour sampling, not guaranteed exactly because the underlying station's records are not uniformly spaced). Out of **552** sampled raw rows, **179** contained usable wave-height data; the remainder contained NOAA's `99.0` fill value. This is an intentionally **decimated, incomplete historical subsample**, not a full 2026 marine wave time series.

Coordinates: buoy 45004 at 47.583°N, 86.586°W (East Superior); approximately 111 km from Grand Marais. Observations are independent offshore measurements, **NOT Agate Beach surf and NOT local harbor wave levels**.

| NOAA observation date/time UTC | Observed buoy peak | Later observed reading within +72h | Sample count before/after peak (±72h) |
|---|---:|---:|---:|
| 2026-10-10 14:50Z | 2.3 m | 0.9 m | 8 / 10 |
| 2026-09-13 22:20Z | 1.5 m | 0.3 m | 14 / 8 |
| 2026-09-20 17:40Z | 1.4 m | 0.5 m | 7 / 6 |

These are **three distinct observed offshore wave events**, spaced by more than 72 hours. The later readings establish that offshore significant wave heights decreased sometime afterward. Because there are missing observations and no beach reports, they do **not** establish a continuously safe settling interval, a Grand Marais nearshore wave prediction, or newly uncovered stones. The sampled dataset does not include the mean wave direction. No stone-exposure outcome labels exist yet; calibration/skill assessment against actual finds remains impossible.

## What changed in source code

- `data/rockhounding/ndbc-45004-offshore-events-2026.json`: station provenance, bounded source query URLs, fill value, 179 actual timestamps/heights, three independently selected peaks and data coverage details.
- `lib/rockhounding/observed-storm-studies.cjs`: validates each selected peak against an actual sample and measures post-peak change and completeness. Explicitly returns `validForDirectionalExposureBacktest=false`, `validForStoneExposureValidation=false`, and `validForBeachSafetyAssessment=false`. No artificial observations.
- `tests/rockhounding-real-storms.test.js`: verifies provenance, independent event spacing, observed peak/height equality and no unwarranted local beach/stone interpretation.
- `public/rockhounding-lab/ndbc-45004-2026.json`: read-only public historical research dataset, separate from example scenario simulation.
- `public/rockhounding-lab/index.html`: historical NOAA case selector and sampled observed wave-height chart with visible gaps, unit labels, and independent source disclosure. Simulation view remains explicitly simulated. Page remains **noindex**; no public production deployment, ad placement, canonical, or tools-directory link added.
- `tests/rockhounding-lab-visual.test.js`: tests the evidence panel, source link, fail-closed data fetch and missing interval handling.

## Higher-resolution wave model finding

NOAA's official Great Lakes wave distribution also offers the **500 m coastal short-range research product** `glwu.grlr_500m_lc.tCCz.grib2`, alongside `glwu.grlc_2p5km_sr.tCCz.grib2`. The NOMADS filter returned GRIB2 content (the `GRIB` magic header) for a small subset of both model products on October 15, 2026, but the remote tool truncated the large binary response, so **no numeric 500 m grid-cell sample has been decoded or verified**.

Official sources:
- https://www.weather.gov/media/notification/pdfs/scn17-75glwu.pdf
- https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu
- https://www.nco.ncep.noaa.gov/pmb/products/wave/glwu.grlc_2p5km_sr.t00z.grib2.shtml
- https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_table4-2-10-0.shtml

The existing no-key sampler `scripts/rockhounding/glwu-extract.py` now supports `--grid 2p5km` (default) or `--grid 500m-coastal` (explicit research mode). Both use `HTSGW`, `WVHGT`, `WVPER`, `WVDIR` and produce a sampled cell ID that identifies its grid resolution. It is **not known whether 500 m actually resolves the protected Grand Marais harbor**; even if it does, nearby water depth, breakwaters, bathymetric refraction, land mask and setup remain unvalidated.

Examples (run only from a network-permitted machine, at low request frequency):

```bash
python3 scripts/rockhounding/glwu-extract.py --date 20261015 --cycle 12 --grid 500m-coastal --print-url
python3 -m pip install -r scripts/rockhounding/requirements.txt
python3 scripts/rockhounding/glwu-extract.py --date 20261015 --cycle 12 --grid 500m-coastal --download --output /tmp/grand-marais-500m-research.json
```

Do not poll NOAA per visitor. Download a bounded subset on a schedule and cache for all site users, honoring NOAA's grib-filter fair-use guidance.


## Local Grand Marais wind source (not wave height)

NOAA/NDBC publishes **GRMM4** at 46.684 N, 85.972 W, owned and maintained by NWS Marquette. Its standard meteorological feed provides actual local wind direction, speed and gusts, generally much closer to the shoreline than open-water buoy 45004. **Its WVHT (wave height) field is unavailable, so this station must never become a local beach wave-height observation.**

- Source: https://www.ndbc.noaa.gov/station_realtime.php?station=GRMM4
- Raw source: https://www.ndbc.noaa.gov/data/realtime2/GRMM4.txt
- Implementation: `lib/rockhounding/grand-marais-local-wind.cjs` parses this source and returns `OBSERVED_LOCAL_WIND_NOT_WAVES` only when recent data is sufficiently present. Missing, sparse or stale data do not produce an all-clear. `WDIR` means **wind from**; never substitute it for GLWU `WVDIR` (**wave from**).
- `tests/rockhounding-local-wind.test.js` covers fresh, sparse, stale, unavailable and wind-vs-wave errors. This is currently an independent backend adapter and not a live visitor verdict.


## Release and research gates

1. **Before any site-specific post-storm verdict:** decode both GLWU grids and measure valid wet cells, direction, timestamps and proximity to *each* target; inspect shoreline exposure and harbor sheltering independently.
2. Accumulate **actual model analyses** across 72h + baseline (past forecast values do not count as retrospective analyses), and evaluate at least three dated wave events against buoy context with coverage and model-error disclosures.
3. Add real shoreline stone-exposure labels if available (visitor/photo evidence with date and geolocation), no required person/site visit from the user. Without those outcomes report only wave-disturbance context, never agate-finding probability.
4. Apply active NWS hazards, ice, access and current shore state vetoes; do not use a calm model value to certify safety.

**Next single priority:** execute remote GRIB2 extraction and inspect 500 m versus 2.5 km wet-cell coverage near Agate Beach and Bayshore Park before lifting their model-geometry gates. All research remains a noindex draft pilot.
