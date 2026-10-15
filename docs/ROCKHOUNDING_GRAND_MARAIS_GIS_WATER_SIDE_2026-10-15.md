# Grand Marais shoreline water-side research gate — October 15, 2026

## Decision: reject the wrong coarse NOAA cell; keep harbor separate

This milestone uses **14 individual, real point-in-waterbody queries** against the University of Michigan-led **Great Lakes Aquatic Habitat Framework (GLAHF)** open-water polygon from the high-resolution National Hydrography Dataset (NHD; source vintage approximately **2013–2014**). The official research GIS service classifies water (inside the polygon) versus mapped land (outside). Data coverage is **not a surveyed current shoreline**, nor a hydrodynamic open-water fetch computation.

GLAHF GIS: https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/Great_Lakes_MAP_ALL__5/FeatureServer

The polygon traces Lake Superior and harbor water. The source derives from 1:24,000 NHD hydrography and enforced EPA bays; it is independent of the NOAA GLWU wave model grid and OpenStreetMap's beach footprints. The source's circa-2013 geometry may not match erosion, accretion, dredging or changed harbor works in 2026.

Other independent place descriptions:
- Burt Township Agate Beach: https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/
- Burt Township Bayshore public swimming: https://burttownshipacmi.gov/recreation/bayshore-park-public-swimming-areas/
- Grand Marais Chamber: https://grandmaraismichigan.com/visit-us/attractions/beaches/ describes Agate Beach rockhounding and the other beach as a **protected swimming beach**.
- Exact OSM beach footprint geometry still documented, unreviewed, in `data/rockhounding/grand-marais-research-footprints.geojson`.

## GIS point findings

| Target | Source GIS water or land | Physical inference permitted |
| --- | --- | --- |
| Agate north at 46.6800, -85.9853 | **Water** | Historical mapping supports **north** as the lakeward *research sector* |
| Agate north 46.6841, -85.9853 | **Water** | Second corroborating study point |
| Agate south at 46.67285 and 46.67015 | **Land, land** | South is landward in historical GIS |
| Exact Agate 500m GLWU candidate at **46.680000,-85.984978** | **Water** | Model cell may be used for uncalibrated **model-wave input research** only, **not** as validated surf |
| Alternate Agate 2.5km northern cell at 46.688341,-85.976613 | **Water** | North-oriented alternative |
| **Rejected** 2.5km geographically closest GLWU cell at **46.667276,-85.978659** | **LAND in GLAHF** | Real **GIS/model mask disagreement**: this model grid cell had a numeric wave value while the historic GIS says land. It is explicitly excluded from Agate-exposure sampling, regardless of model's wet mask. These sources do not agree on physical water/land membership; no claim that either is surveyed current truth |
| Bayshore east at 46.6719,-85.9741 and -85.9695 | **Water, water** | Supports separate eastward harbor water-side *study direction* |
| Bayshore west at 46.6719,-85.9904 and -85.9950 | **Land, land** | Supports westward land-side |
| Nearby Bayshore 500m model cell at **46.673000,-85.974978** | **Water** | It is mapped water, but **cannot be used** to claim sheltered-harbor surf or zero waves |
| Bayshore north 46.6764,-85.9839 and south 46.6674,-85.9839 | **Land, land** | Prevents arbitrary "north = harbor water" geometry shortcut |

**Interpretation:** Agate's north and Bayshore's east study sectors differ. Being on water in a polygon does **not** quantify wave transformation, water depth, wave direction, breakwater shelter or sediment movement. GLAHF topology within this broad water polygon is insufficient to compute actual sheltered-harbor response.

The original real-GIS query run is https://github.com/izworskic/chrisizworski-com/actions/runs/38818672200; every GIS query returned, but the initial study failed its validation gate **correctly** because the GLAHF polygon disagreed with two unverified assumptions. Those assumptions have now been corrected; the current workflow repeats all 14 live source checks and its tests. This is a scientific correction, not an environment failure.

## Code

- `scripts/rockhounding/validate-grand-marais-water-side.py`: no-key, bounded ArcGIS REST source-point intersections; explicit model-cell comparisons; retry/fail closed. Saves source-stamped response JSON as a GitHub Actions artifact.
- `data/rockhounding/grand-marais-glahf-water-side-2026-10-15.json`: 14 real GIS point classifications and source/vintage provenance; no surveyed normals or site permissions.
- `lib/rockhounding/shoreline-water-side.cjs`: strict source identity + point/coordinate verification. Allows only north-of-Agate **research** cells, rejects south coarse GIS/model discrepancy, and rejects sheltered-harbor cells for open-lake wave inputs even when their GIS water classification is valid. Outputs **no** public wave verdict, safety clearance, legal collection assertion, stone exposure probability or exact numeric shoreline bearing.
- `tests/rockhounding-shoreline-water-side.test.js`: source falsification, changed coordinate, missing water/land point, two-site isolation, coastal normal null, wrong coarse cell and harbor exclusion.
- `.github/workflows/rockhounding-water-side-gis.yml`: isolated one-time research GIS verification with source artifact + the full focused Node/Python science test suite. **It is not a per-visitor API.**

## Remaining blockers and following priority

1. **A real shoreline normal:** the research anchor is not a surveyed waterline point. The GIS confirms broad north/east shore sides but does not warrant inserting an outward-bearing degree into `grand-marais-wave-pilot.json`. That field stays null.
2. **Harbor geometry:** independently represent breakwater entrance and fetch through bathymetry/coastal chart sources, or continue to suppress wave-height claims at Bayshore.
3. **Stone/safety evidence:** actual before/after beach material exposure is unobserved. External visitors may use official destination information, but the engine must not promise stones or water safety.
4. **Historical forecast skill:** already separately verified offshore at NDBC buoy 45004; cannot be applied to Grand Marais nearshore without independent shoreline measurements.

**Next development priority:** obtain a second independent *current shoreline or harbor structural* data layer (for example NGS shoreline vectors, NOAA chart breakwaters, and/or coastal LIDAR), compute bounded **waterward tangent/normal uncertainty** per beach segment and explicitly model possible harbor shelter, without inventing precise surf heights. No onsite visit or email is needed.
