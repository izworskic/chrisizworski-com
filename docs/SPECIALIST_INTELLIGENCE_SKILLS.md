# Specialist intelligence skills

Added as draft adoption candidates on 2026-11-24. These workflows extend Python Intelligence OS and Experience Foundry rather than replacing them. Select only relevant skills, not a mandatory ten-skill pass. Upstream references are research inputs, not vendored code or permission to install software. Full dependency/license compatibility checks are deferred to a specific approved pilot; no model or library is adopted at runtime by this change.

| Skill | Proposed first pilot | Upstream sources |
| --- | --- | --- |
| [environmental-intelligence](../.agents/skills/environmental-intelligence/SKILL.md) | Beach Real Feel | [Unidata/MetPy](https://github.com/Unidata/MetPy), [blaylockbk/Herbie](https://github.com/blaylockbk/Herbie), [pydata/xarray](https://github.com/pydata/xarray) |
| [movement-intelligence](../.agents/skills/movement-intelligence/SKILL.md) | Freighter Central | [movingpandas/movingpandas](https://github.com/movingpandas/movingpandas), [turfjs/turf](https://github.com/turfjs/turf) |
| [calibrated-prediction](../.agents/skills/calibrated-prediction/SKILL.md) | Soo Locks arrival windows | [Nixtla/statsforecast](https://github.com/Nixtla/statsforecast), [scikit-learn-contrib/MAPIE](https://github.com/scikit-learn-contrib/MAPIE), [online-ml/river](https://github.com/online-ml/river) |
| [geospatial-intelligence](../.agents/skills/geospatial-intelligence/SKILL.md) | Michigan Snowmobile | [turfjs/turf](https://github.com/turfjs/turf), [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js), [protomaps/PMTiles](https://github.com/protomaps/PMTiles) |
| [journey-optimization](../.agents/skills/journey-optimization/SKILL.md) | Lake Superior Circle Tour | [google/or-tools](https://github.com/google/or-tools) |
| [hydrological-intelligence](../.agents/skills/hydrological-intelligence/SKILL.md) | National Rivers | [hyriver/pynhd](https://github.com/hyriver/pynhd), [pysheds/pysheds](https://github.com/pysheds/pysheds), [DOI-USGS/dataretrieval-python](https://github.com/DOI-USGS/dataretrieval-python) |
| [engine-property-testing](../.agents/skills/engine-property-testing/SKILL.md) | Shore Feel engine | [dubzzz/fast-check](https://github.com/dubzzz/fast-check), [HypothesisWorks/hypothesis](https://github.com/HypothesisWorks/hypothesis), [schemathesis/schemathesis](https://github.com/schemathesis/schemathesis) |
| [data-contract-validation](../.agents/skills/data-contract-validation/SKILL.md) | Michigan Ski Hills | [pandera-dev/pandera](https://github.com/pandera-dev/pandera), [ajv-validator/ajv](https://github.com/ajv-validator/ajv) |
| [visual-data-storytelling](../.agents/skills/visual-data-storytelling/SKILL.md) | Great Lakes Ice Cover | [observablehq/plot](https://github.com/observablehq/plot), [leeoniya/uplot](https://github.com/leeoniya/uplot), [vega/vega-lite](https://github.com/vega/vega-lite) |
| [historical-data-intelligence](../.agents/skills/historical-data-intelligence/SKILL.md) | Great Lakes Ice Cover archive | [duckdb/duckdb](https://github.com/duckdb/duckdb), [duckdb/duckdb-skills](https://github.com/duckdb/duckdb-skills) |

## Adoption order

Start with engine-property-testing and data-contract-validation as supporting safeguards, then evaluate environmental-intelligence on Shore Feel and movement-intelligence on Freighter Central. Calibrated prediction depends on eligible independent outcomes. The remaining skills are selected by the owning tool's unresolved visitor task, not installed in advance.

## Evaluation status

Each skill has 20 trigger prompts and a paired task under docs/skill-evals. Behavioral trigger accuracy and baseline/with-skill results are NOT VERIFIED; run fresh-context baseline first, then with-skill, before accepting this draft. Reject skills that do not change behavior or regress existing rules. Existing skill lint discovers all three mirrors automatically. This PR changes internal Markdown only: zero new functions, scheduled builds, billed features, runtime dependencies, public routes or data sources. No visitor outcomes are claimed. Independent repos need separate reviewed adoption.
