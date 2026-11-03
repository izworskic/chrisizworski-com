# Python Intelligence OS v1.0

**Purpose:** A durable, evidence-first engineering operating system for analytics, phenology, forecasting, simulations, GIS, spatial decisions, optimization, source reconciliation, and visual data products across chrisizworski.com.

**Relationship:** Experience OS v1.2 designs the experience; Python Intelligence OS designs and verifies the intelligence. This is an engineering standard, **not** a new visitor-facing product or mandate to rewrite tools in Python.

## Runtime decision tree

| Situation | Preferred path | Reason |
| --- | --- | --- |
| Lightweight UI/math already reliable in JavaScript | Keep JavaScript | Faster client interactions and fewer moving parts |
| Heavy batch analysis, historical joins, spatial modeling, repetitive QA | Scheduled/offline Python -> versioned JSON/GeoJSON/SVG | Cheap, testable, cacheable and SEO-friendly |
| Truly per-request computation requiring Python libraries | Bounded Vercel Python server function with cache/fallback | Useful only if measured benefit justifies additional runtime |
| Interactive charts, maps, timeline scrubbing, animations | Existing accessible JS/React/HTML frontend | Keep Python out of the browser critical path |
| Sensitive, unsupported or unlicensed data | Do not ship | No substitute data, fabricated predictions or license evasion |

The first pilot deliberately uses the **offline** mode. No Supabase, Redis, new database, runtime Python service, paid API, private visitor-coordinate storage or new canonical URLs.

## Seven capability families

1. **Data intelligence:** ingest, normalize, deduplicate, reconcile, validate source versions and temporal coverage.
2. **Prediction:** prospective, domain-specific models with independent field outcomes, holdout error and calibrated uncertainty. Never equate GDD to confirmed emergence.
3. **Spatial intelligence:** provenance-aware coordinates, projection/units, public access and temporal constraints. Never invent parking or paths.
4. **Simulation and optimization:** reproducible parameters, baselines and sensitivity cases, no fake precision.
5. **Visual intelligence:** data-driven timelines, evidence coverage, comparative views, uncertainty bands and accessible, mobile-readable alternatives.
6. **Evidence intelligence:** source-age gating, explicit missing-data states, honest units/scope, revisions, observability and traceable claims.
7. **Improvement intelligence:** backtests, regressions, measured performance, visitor-task success and comparable pre/post organic search windows.

Each product adopts only what solves its specific visitor problem. Avoid cloned dashboards and generic confidence badges.

## Quality score and release threshold

Prioritize candidates using five 0–5 inputs:

| Dimension | Weight |
| --- | ---: |
| Visitor decision value | 30 |
| Data/model reliability | 25 |
| Distinctive experience/visual value | 15 |
| Performance/maintenance/cost | 15 |
| Search/discovery opportunity | 15 |

Score = sum(weight × dimension/5). **85+** suggests implementation evaluation, **70–84.9** needs more research and **below 70** is deferred. The score is a prioritization instrument, **not** a scientific probability or release permission. Four blocking gates must be true regardless of score: legal source use; validated evidence; fail-closed fallback; owning-repository verification. See [QUALITY_GATES](docs/QUALITY_GATES.md).

## Engineering pattern

```text
Official / licensed sources + dated existing archives
  -> source register and normalizer (time, location, units, licensing)
  -> evidence integrity checks (missing, duplicate, revision, stale)
  -> domain model (descriptive by default; predictive only after calibration)
  -> versioned artifacts or bounded API with explicit status and provenance
  -> Experience OS interface (decision first, thoughtful unique visuals)
  -> independent QA + CI + production checks + performance / GSC observation
```

Source observations, weather suitability, model estimates and visitor-confirmed sightings must be labeled distinctly.

## Adoption and ownership

- Canonical governance and reusable decision process: **this** directory in `izworskic/chrisizworski-com`.
- First Python implementation and visitor-facing pilot: `izworskic/phenology-michigan/scripts/python_intelligence/`, `scripts/build-phenology-field-read.py`, and `components/SeasonalFieldRead.js`.
- The tool's owning repository remains authoritative for science, APIs, deployments and tests. If a second repo adopts helpers, assess extracting a separately versioned library; do not copy-paste uncontrolled science.
- Experience OS v1.2 remains mandatory for meaningful visitor-facing UI changes.

## Initial candidates

See [CANDIDATE_PORTFOLIO.md](docs/CANDIDATE_PORTFOLIO.md). Score individual improvements against current measured baselines before building; many tools already have sophisticated JavaScript or third-party engines.

**Release checklist:** verify ownership, review upstream license, collect baseline, version schema, code + tests, run full gates, browser verify on production, record scientific caveats, inspect deployment and evaluate comparable outcomes. Never merge past red required checks.
