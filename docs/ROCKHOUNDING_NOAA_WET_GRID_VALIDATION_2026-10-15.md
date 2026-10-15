# Grand Marais NOAA Great Lakes wet-cell verification — October 15, 2026

**Milestone result:** Real NOAA GRIB2 source files were downloaded and decoded with ecCodes on an isolated GitHub Actions runner. The Great Lakes **2.5 km** and **500 m** grids are confirmed. **No current nearshore visitor-safety or agate-exposure forecast has been validated.**

## Correct NOAA files and provenance

- 2.5 km regional: `glwu.grlc_2p5km_sr.t18z.grib2`.
- 500 m Great Lakes: `glwu.grlr_500m.t18z.grib2`.
- Cycle: October 15, 2026, 18:00 UTC; NOAA NOMADS `/glwu.20261015` with four fields `HTSGW`, `WVDIR`, `WVHGT`, `WVPER`.
- Do **not** use `glwu.grlr_500m_lc`: the `_lc` suffix is **Lake Champlain**, not the Great Lakes. This error in the original exploration has been corrected in the downloader, CLI tests and documentation.
- Fully decoded response sizes: **78,739 bytes (2.5 km)** and **1,335,838 bytes (500 m)**. Each carried 49 GRIB messages for each of the four requested wave fields.
- Validation sources: [NOAA model products](https://www.nco.ncep.noaa.gov/pmb/products/wave/), [NOMADS filter](https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu), and [GRIB2 wave parameter table](https://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc/grib2_table4-2-10-0.shtml).
- Live execution and raw masked-cell/wet-cell logs: [GitHub Actions run #38808981322](https://github.com/izworskic/chrisizworski-com/actions/runs/38808981322). Research data snapshot: `data/rockhounding/grand-marais-noaa-grid-snapshot-2026-10-15.json`.

## Actual model-cell results

| Analysis | Agate Beach research point | Bayshore Park research point | What it means |
| --- | --- | --- | --- |
| 2.5 km geographically nearest valid four-variable cell | 1.094 km to 46.667276,-85.978659 | 0.651 km to **same** 46.667276,-85.978659 | A naïve nearest-cell sampler assigns both beaches the same cell south of the Agate Beach's open-lake shoreline; this is **not a valid Agate exposure estimate** |
| 2.5 km model height at that cell, first HTSGW message | 0.03 m | 0.03 m | Only the grid cell's modeled height; neither beach's surf is established |
| 2.5 km **north-of-Agate** potential open-water sample | 46.688341,-85.976613 at 1.524 km, HTSGW 0.16 m | Not directly applicable to harbor | Shows why physical shoreline side is more important than raw distance |
| 500 m four nearest masked shoreline points | All missing (`9999`) | All missing (`9999`) | Invalid data is **not calm weather**, and complete four-field records cannot be taken at the initial land-adjacent points |
| 500 m closest available **HTSGW-only wet** cell within 7 km | 46.680000,-85.984978 at 0.445 km, modeled 0.12 m | 46.673000,-85.974978 at 0.692 km, modeled 0.00 m | Distinct candidate cells are available in the fine grid, but their shoreline connection, bathymetric representativeness and directional completeness remain **unverified** |

Additional model mask evidence: the 500 m field has 510 finite significant-wave-height grid points within 7 km of the Agate research point and 466 within 7 km of the harbor research point. The initial four nearest land-adjacent points were masked. The 500 m Grand Marais wave file is *not* blank. A number like **0.00 m at the nearest valid candidate** must not be presented as harbor-wave calmness or shoreline safety.

**Key product-engine finding:** nearest valid cell is not enough. A shore-oriented sampler needs (1) beach-side water-body/land mask checks, (2) complete wave variables at the *same* candidate wet cell and valid UTC time, (3) shoreline normal validated against geometry and (4) harbor breakwater/bathymetric protection treatment. A model can have a separate 500 m wet cell without representing the pocket harbor correctly.

## Why this does not yet establish past model performance

- The previously documented NOAA NDBC 45004 events (2026-09-13, 2026-09-20 and 2026-10-10) are **real measured offshore wave heights**, not modeled 500 m wave fields or documented rock exposure.
- The just-decoded NOAA GLWU October 15 operational run does **not** contain archived model analyses for those September/October 10 episodes. A model forecast generated October 15 cannot be compared with a September 13 measured storm as if the dates matched.
- Therefore: matched model-vs-buoy backtest sample size **zero**, shoreline agate success labels **zero**, false-alarm calibration **not possible yet**. Do not show an opportunity score.
- Distinct source type: model-wave height (`HTSGW`) vs offshore buoy observation (`wave_height`) vs local GRMM4 wind (no wave heights) vs NWS warning inputs. These must never be merged into invented local surf.

## Implementation and validation safety

- The standalone two-grid runner is `scripts/rockhounding/validate-glwu-wet-cells.py`; it downloads **one bounded regional subset per grid** and honors the 10-second minimum gap between scripted NOAA GRIB queries.
- Raw field diagnostics include all four field-message counts, four nearest candidate values and nearby **HTSGW-only** genuinely valid wet-cell neighbors.
- `tests/rockhounding-noaa-grid-validation.test.js` protects the Lake Champlain naming correction, land mask handling, shared coarse cell, distinct nearby HTSGW candidates and inability to claim beach or historical predictions.
- Research snapshot is deliberately static, cited to a single dated model cycle, and **not a live widget or safe-conditions advisory**.
- No API keys, email requests or onsite visits required. No public production page, ad placements, canonical or robots index state modified.

**Next single action:** implement shoreline-side candidate water-body screening and verify all four wave variables at the selected north-side Agate model cell across valid forecast times; keep Bayshore Park explicitly unresolved pending protected-harbor representation. Then start accumulating dated analyses for a matching offshore-observation backtest. No unsafe rock-availability claims.
