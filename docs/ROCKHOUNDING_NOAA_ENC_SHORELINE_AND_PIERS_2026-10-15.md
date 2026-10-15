# Michigan rockhounding: NOAA charted Agate shoreline and Grand Marais piers

**Date: October 15, 2026. Scientific outcome: historic NOAA chart orientation corroborated by independent GLAHF land/water mapping. This does not validate 2026 beach surf or harbor shelter.**

## Primary-source geometry

NOAA Office of Coast Survey [ENC Direct to GIS](https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer), Harbor-scale dataset `US5MI77M.000`, source `Chart 14962`.

| NOAA ENC S-57 GIS feature | Layer / OBJECTID | Charted source date | Independent finding |
| --- | --- | --- | --- |
| Agate-front Lake Superior `COALNE` coastline | Harbor.Coastline_line / 1938304 (layer 84) | January 2014 `201401` | Historical shoreline for lakeward tangent |
| Harbor entrance `SLCONS` class **pier** | Harbor.Shoreline_Construction_line / 2496904 (layer 85) | February 2004 `200402` | Charted pier extending N–S approximately 496 m |
| Harbor entrance `SLCONS` class **pier** | Layer 85 / 2496908 | January 2014 `201401` | Charted pier extending N–S approximately 830 m |

**These lengths are north–south extents of charted pier outlines, NOT surveyed pier centerline lengths.** Two charted piers support the presence of harbor infrastructure, but **do not quantify wave attenuation or confirm 2026 structural integrity**.

Supplemental more recent [USACE Grand Marais Harbor fact sheet (October 2025)](https://lre-ops.usace.army.mil/OandM/factsheets/GrandMaraisHarborMI.pdf) describes approximately 5,400 feet of piers, a ruined pile dike, and ongoing maintenance needs. This is a **harbor-level aggregate**, not lengths for the individual two GIS features. It independently supports that the harbor contains substantial structural works and that treating all structures as pristine is invalid.

## Measured geographic computation

The NOAA charted coastline is **85.5 m** from our approximate Agate Beach research point (46.6760, -85.9853). Using a 200 m centered tangent along the mapped shoreline yields two candidate perpendicular azimuths **156.74° / 336.74°** (clockwise from true north).

The independent historic [GLAHF NHD-derived mapped Great Lakes water polygon](https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/Great_Lakes_MAP_ALL__5/FeatureServer/0) was queried at three distances on each side:

| Probe from the NOAA charted shoreline | 120 m | 200 m | 350 m |
| --- | --- | --- | --- |
| NOAA shoreline azimuth ~337° (northwest) | WATER | WATER | WATER |
| Opposite ~157° (southeast) | LAND | LAND | LAND |

Three NOAA centered-tangent smoothing spans gave **336.73°, 336.74°, 335.08°**. This is a *computed smoothing-window range on an old chart*, **NOT ±0.8° uncertainty or survey precision**. Real current shoreline shifts, beach extent, lake levels and spatial errors have not been measured.

Therefore:

- **~337° NNW is a plausible, NOAA-chart-derived historical *study orientation* for Agate Beach**, not a surveyed contemporary waterline normal.
- It may be used for a **research-only directional *comparison*** with NOAA `WVDIR` (wave-from direction), but not to assert local breaking-wave height, danger, settling, exposed stones, or best arrival time.
- `data/rockhounding/grand-marais-wave-pilot.json` still has `shore.outwardBearingDeg = null` and `reviewStatus = UNVERIFIED_WATERLINE` deliberately. The existing `poststorm-engine.cjs` does not silently unlock a public wave-based opportunity verdict.
- Bayshore Park's harbor-side water model points remain excluded from any generic Agate facing calculation. Both piers are **charted**; wave transformation through the harbor mouth, shelter, bathymetry, entrances and wave heights inside the bay remain **UNVERIFIED**.

## Reproducible implementation

- `scripts/rockhounding/verify-noaa-enc-shoreline.py`: downloads specific original NOAA ENC coastline/pier features via a small public ArcGIS REST query, checks feature IDs, `CATSLC=pier`, ENC dataset, source dates and coordinate bounds, builds coastline tangent in local geographic metres, and selects the waterward normal through **six independent GLAHF water/land point queries**. Fails closed if sides conflict.
- `data/rockhounding/grand-marais-noaa-enc-geometry-2026-10-15.json`: frozen 337° research bearing, all six independent geographic water/land samples, three tangent spans and both NOAA pier envelopes; explicit 2004/2014 source age and no-safety gates.
- `lib/rockhounding/noaa-enc-geometry.cjs`: validates that source evidence and provides a **research-only** relative NOAA wave-direction alignment, with `canPublishSiteWaves=false`, `canPredictStones=false`. The harbor case returns `HARBOR_WAVE_ATTENUATION_UNMODELED`, not a guessed refuge factor.
- `tests/test_rockhounding_noaa_enc.py`, `tests/rockhounding-noaa-enc-geometry.test.js` and updated `tests/rockhounding-lab-visual.test.js`: ensure geometry sources and physical safety/permission boundaries cannot be upgraded silently.
- `public/rockhounding-lab/index.html`: a discreet, documented, **noindex** geographic evidence panel showing the NOAA orientation and two charted piers beside the existing simulated storm display; no ads or map keys added.
- `.github/workflows/rockhounding-enc-shoreline-research.yml`: on-demand/branch-run research remote fetch, syntax gate, focused Node and Python tests and a reproducible 30-day artifact. **No recurring NOAA ENC per-visitor traffic**.

Live reproducibility: [NOAA + GLAHF chart-normal source run #38820785757](https://github.com/izworskic/chrisizworski-com/actions/runs/38820785757) passed. The output was **85.5m** approximate study coordinate to NOAA charted coastline, **336.74°** research bearing, and two NOAA piers with geographic north-south spans of **496 m / 830 m**.

## Next single meaningful task

A **bounded sheltered-harbor transmission research screen**: use NOAA ENC pier and depth-contour geometry plus the entrance opening to classify Bayshore Park as a **structurally sheltered candidate** relative to the open Agate beach, but leave numeric wave attenuation/surf and visitor hazard levels blank without independent harbor wave observations or a calibrated high-resolution nearshore model. Continue accumulating actual offshore storm episodes before training any agate-exposure probability.

**No onsite work, town email or paid source required.**
