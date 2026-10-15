# Rockhounding — 2026 USACE survey footprint exclusion at both Grand Marais beaches

Research checked October 15, 2026. **This is a negative geographic coverage result, not a beach safety or fresh-stone prediction.**

## Independent primary-source result

The latest actual [USACE eHydro July 30, 2026 survey-job polygon](https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0/query?where=OBJECTID%3D125722&outFields=*&returnGeometry=true&outSR=4326&f=json) is **a surveyed Grand Marais entrance-channel area**, not shoreline bathymetry along either candidate collecting beach.

The reproducible public-source [GitHub survey polygon and original ZIP audit](https://github.com/izworskic/chrisizworski-com/actions/runs/38826041981) found:

| Independent geographic input | Result |
|---|---|
| eHydro survey job | `GR_01_MAS_20260730_CS`, OBJECTID 125722 |
| Dated survey | July 30, 2026 |
| Original eHydro feature shape | 1 polygon ring, **161 vertices** |
| Survey polygon WGS84 envelope | **[-85.971734, 46.675899, -85.969027, 46.685841]** |
| Agate Beach OSM research footprint | **Outside survey envelope** |
| Bayshore Park OSM research footprint | **Outside survey envelope** |
| Inner harbor study point | Outside survey polygon |
| Entrance channel study point | Inside survey polygon |
| Public survey ZIP | 4,062,569 bytes; SHA-256 `6dce01ac993dd991219be0da4718fd90b83f3e465099c67e1b3186394081ac5c` |
| Source XYZ checked so far | 1,500 numeric source rows inspected; not a spatial depth validation |

Two different sources support the beach-exclusion result:
1. **Original USACE survey-job envelope**, not approximated from a nautical chart.
2. **Existing OSM-based beach study polygons**, explicitly marked as research geometry (not legally verified access or survey wetlines) in `data/rockhounding/grand-marais-research-footprints.geojson`.

Both OSM study polygons lie west of the survey envelope, not just the approximate center points. This is sufficient to *rule out* the 2026 channel survey as bathymetry at the two pilot beach footprints. It does **not** establish what the depth, wave energy, or stone exposure is at either beach.

## Implemented release gate

- `data/rockhounding/grand-marais-usace-survey-coverage-guard-2026-10-15.json`: source geometry bounds, provenance, original survey SHA and explicit no-publish flags.
- `lib/rockhounding/usace-survey-coverage.cjs`: compares public beach research envelopes to original survey envelope. **Disjoint = excluded**; **overlap = more exact survey polygon/source-sounding work needed**, never automatic depth coverage.
- Wired into `harborStudyGate()` for both Agate and Bayshore. The engine now makes the negative result explicit and does not substitute entrance-channel bathymetry for beach conditions.
- `tests/rockhounding-usace-survey-coverage.test.js`: fail-closed source, geometry drift, unknown sites, and positive-overlap controls.
- Updated *noindex* research lab disclosure. No ads, public conditions, sitemap, API keys, paid services, or per-visitor model calls changed.

**Next highest-value priority:** continue collecting dated actual NOAA GLWU wave cycles and independent observations relevant to the exposed Agate shoreline. The verified historic ~337° NOAA chart normal is a research direction, not a surveyed present-day beach bearing. Retain no-publish guard for modeled beach surf, hazard safety, collecting permission, and predicted new agates until measured validation is established. Avoid spending additional time on an irrelevant 2026 *entrance-channel* depth survey as an Agate beach data source.
