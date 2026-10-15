# Grand Marais rockhounding — NOAA chart-depth evidence and harbor shelter gate

**Verified October 15, 2026.** Research-only coastal science, not navigation, live water depths, beach safety or predictions of new rocks.

## Source and geographic coverage

NOAA Office of Coast Survey [ENC Direct to GIS](https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer), dataset **US5MI77M.000** (Grand Marais, Chart 14962), provides:

- **Harbor.Sounding_point**, layer **76**, property **Z** with individual sounding source dates `SORDAT`, including 2004–2020 in our region.
- **Harbor.Depth_Contour_line**, layer **104**, property **VALDCO**. The 26 individual study-intersection contour records (across overlapping zones) **do not carry individual `SORDAT` dates**. They cannot be rebranded as new measured 2026 bathymetry.
- Other historic physical evidence: the two independently verified [NOAA charted entrance piers](ROCKHOUNDING_NOAA_ENC_SHORELINE_AND_PIERS_2026-10-15.md), source features 2496904 and 2496908, and the separate open-Lake-Superior Agate Beach historic northwest-facing coast (~337°).

**Four overlapping geographic query envelopes (not additive):**

| Area | Charted sounding records | Depth contour records | Individual sounding source dates |
| --- | ---: | ---: | --- |
| Inner southwest harbor near Bayshore study area | **17** | **6** | 2004, 2016 |
| Harbor center | **41** | **12** | 2004, 2016, 2018 |
| Northern entrance piers | **38** | **12** | 2016, 2018, 2019, 2020 |
| Open-lake approach | **42** | **2** | 2016, 2018, 2019, 2020 |

The depth contours display charted values around zero through **7.3** across these envelopes; soundings range from **0.3 to 16** across the sampled areas. These are **raw historic chart values** and are **not** independently reconciled to a chart datum, current lake level, recent dredging, or navigable water depth. Critically, **zero on a contour does not mean zero wave height**. Never derive safe swimming/boat clearance or a wave-shelter percentage from these numbers.

### Why dated soundings are not current harbor bathymetry

The U.S. Army Corps DQM five-year dredging schedule includes planned Grand Marais maintenance, with dates extending into 2027, but planning entries do **not** prove work is complete. The NOAA chart's underlying sounding source dates cannot establish 2026 depth changes due to shoaling, storm sediment movement, dredging, or harbor construction.

Independent source: https://dqm.usace.army.mil/reports/five-year-schedule ; project source https://lre-ops.usace.army.mil/OandM/factsheets/GrandMaraisHarborMI.pdf .

## Implemented fail-closed research engine

- `scripts/rockhounding/verify-harbor-bathymetry.py` makes **eight small public NOAA REST requests**, retrieving actual soundings/contour metadata in four bounded envelopes. It validates NOAA chart dataset, finite depth attributes, source dates, unique feature IDs, size bounds and no truncation. `--expect` fails if live counts, values, study boxes or survey-source dates drift from reviewed research.
- `data/rockhounding/grand-marais-noaa-enc-harbor-depth-2026-10-15.json` freezes the verified original-source record counts, individual sounding source dates, and the explicit missing current harbor-depth/surf-calibration gates.
- `lib/rockhounding/harbor-bathymetry.cjs` verifies historic GLAHF land/water isolation, NOAA ENC charted pier identities and the new source snapshot before returning a **qualitative research classification**, `HARBOR_STRUCTURE_AND_DEPTH_CHART_COVERAGE_VERIFIED_TRANSMISSION_UNRESOLVED`. Nothing returns a harbor surf height, safe-water claim, wave transmission factor or visit-window signal. The separate Agate Beach site does not inherit the harbor depths.
- `public/rockhounding-lab/index.html` (noindex) now includes a compact collapsible NOAA depth-coverage table, explaining that geographic envelopes overlap and the sounding dates are historic.
- `tests/rockhounding-harbor-bathymetry.test.js`, `tests/test_rockhounding_harbor_bathymetry.py`, and a visual regression prevent missing source data or changing a shoreline research status into a public surf/safety claim.
- `.github/workflows/rockhounding-harbor-bathymetry.yml` runs all focused science tests and the real NOAA source comparison with a reproducible research artifact. The workflow is **not scheduled**, and NOAA chart services are **not queried per site visitor**.

Live NOAA verification: [Research run #38822906325](https://github.com/izworskic/chrisizworski-com/actions/runs/38822906325) passed with **148 Node tests**, **28 Python tests**, and all **eight** NOAA source queries matching the reviewed evidence. No API keys, credits, town contact or onsite visit.

## What is unblocked and blocked

**Unblocked:** historical *geographic evidence* of charted pier structures and bathymetric feature coverage in each section of Grand Marais harbor. The engine can state that Bayshore is a **structurally distinct harbor research setting**, not the same open-water wave point as Agate Beach.

**Still blocked:** a current navigable depth estimate, entrance opening width, 2026 structural condition, a numerical shelter/transmission coefficient, harbor wave-height and hazard predictions, fresh stone exposure or a claimed best time to collect rocks. None of these can be established by counting old depth samples.

**Next single priority:** look for independent, contemporary USACE harbor survey and wave-related observations; establish whether there is a *measured local harbor conditions feed*. If unavailable, hold the harbor as a qualitative shelter context and focus useful post-storm timing on exposed shoreline with the separate buoy-calibrated offshore source.
