# Grand Marais open-lake directional wave verification — October 15, 2026

**Gate outcome: research data-layer milestone PASSED for northern Agate Beach model-wave inputs, NOT for shoreline-safe rockhounding or the protected harbor.**

This stage implements a fixed-coordinate same-time NOAA GLWU four-field extractor, rather than choosing a fresh geographically closest point separately for each field. It filters masked cells and considers only approximate cells **north of the Agate Beach study point**, so it doesn't automatically substitute the harbor-side water cell. The north-of-beach half-plane is a **geographic study proxy**, not independently verified shoreline connectivity or a surveyed outward normal. None of the selected cells is yet certified as measuring or predicting breaking surf.

## What the live GRIB2 run proved

NOAA operational GLWU cycle **2026-10-15 18Z**, decoded with ecCodes in [Actions run #38810842690](https://github.com/izworskic/chrisizworski-com/actions/runs/38810842690):

| Product | Valid research open-north cell | Distance from approximate Agate study point | Complete same-cell, same-valid-time HTSGW/WVHGT/WVPER/WVDIR |
| --- | --- | ---: | ---: |
| Great Lakes 2.5 km `glwu.grlc_2p5km_sr.t18z.grib2` | 46.688341, -85.976613 | 1.524 km | **49 / 49** UTC timestamps |
| Great Lakes 500 m `glwu.grlr_500m.t18z.grib2` | 46.680000, -85.984978 | 0.445 km | **48 / 49** UTC timestamps |
| Great Lakes 500 m less-proximal alternative | 46.683500, -85.994978 | 1.114 km | **49 / 49** UTC timestamps |

The initial four closest cells *at the beach coordinate* were masked with NOAA missing value 9999; searching valid cells north of the beach recovered actual directional wave model fields without interpreting 9999 as calm. All four wave variables are joined at the **same stable cell** and **same valid UTC timestamp**. No interpolation over a missing hour. The chosen 500 m cell is the closer 0.445 km candidate with 48/49 complete coverage, rather than the farther 1.114 km cell with 49/49. Selection tolerates up to 10% fewer complete forecast timestamps before choosing a more distant research point; this is a *model input integrity heuristic*, not a physical hazard threshold.

Example **2.5 km** first-cycle model field at the north-side candidate: significant wave height **0.16 m**, wind-wave height **0.10 m**, wind-wave period **1.44 seconds**, wave-from direction **143.52°**. These are *model values* in the lake, not wave observations at Agate Beach. Wave-from cannot be substituted from the GRMM4 meteorological `WDIR`.

## What is still unknown

1. **Physical open-water connectivity** of the selected north-sector cells and independent shoreline normal — no reliable refraction or fetch calibration, no proven beach wave heights. The research half-plane can avoid obviously southern cells but is not a GIS proof of connected water or wave exposure.
2. **Bayshore Park:** sheltered Grand Marais harbor requires separate breakwater, fetch and bathymetry consideration. Do not use the Agate cell as a harbor surf estimate; an HTSGW reading of 0 m in a nearby gridded cell is not a guarantee of calm or public safety.
3. **Historical skill:** the 2026-10-15 GLWU cycle provides one cycle-zero model field and future forecasts, not a 14-day retained record of 6-hourly model initial fields. It cannot be directly compared as historical validation against the earlier September 13/20 or October 10 NDBC 45004 offshore observations without time-matched archived GLWU output.
4. **Finding stones:** no labeled before/after shoreline stone exposure, measured detection precision, or verified search-window success. No public opportunity score or safety recommendation.

The 72-hour post-storm research engine now accepts an **actual six-hour model-analysis cadence** (minimum 10 samples with a maximum gap of 7 hours), rather than an impossible floor of 15 analyses across 72 hours when model cycles occur every 6 hours. A deterministic regression test covers the cadence and retains `canPublishSearchWindow=false`.

## Implemented source artifacts

- `scripts/rockhounding/wave-cell-research.py` — chooses northern wet study candidates and requires four valid wave fields at the same stable model coordinate and UTC valid time. Maintains a strict research-only boundary, refuses all masked fields, and distinguishes model zero-lead from forecast.
- `scripts/rockhounding/validate-glwu-wet-cells.py` — incorporates this directional fixed-cell report alongside original masked nearshore and wet height diagnostics.
- `tests/test_rockhounding_wave_cell.py` — pure Python tests including direction-sector logic, 360° longitude normalization, missing values, near-cell preference when 48/49 is available, and geographic exclusion of the harbor-side 2.5km cell.
- `tests/rockhounding-open-lake-directional.test.js` — regression on actual NOAA research evidence plus the explicit harbor and visitor-safety gates.
- `data/rockhounding/grand-marais-directional-wave-2026-10-15.json` — single-cycle, dated and source-linked model evidence; deliberately **not** a live visitor data file.
- `.github/workflows/rockhounding-grid-validation.yml` and `.github/workflows/rockhounding-focused-verification.yml` — reproducible free NOAA downloads, decoder and isolated Node/Python test suites on the research branch.

**Next engineering priority:** store consecutive model-cycle-zero + full-forecast snapshots, match forecast valid timestamps to later observations (for model skill), and validate the open-north cells against independently sourced Lake Superior shoreline/coastline orientation. Only after that could the engine produce a responsibly worded *wave disturbance/settling context* signal, never an unverified rock-finding probability. No park contact or onsite visit is required to keep building.
