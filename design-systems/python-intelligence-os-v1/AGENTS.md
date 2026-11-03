# PYTHON_INTELLIGENCE_OS_V1 — agent operating instructions

This is the canonical Python Intelligence OS v1.0 standard for all projects in Chris Izworski's tool network. Read [README.md](README.md), [docs/QUALITY_GATES.md](docs/QUALITY_GATES.md), and [docs/PHENOLOGY_PILOT.md](docs/PHENOLOGY_PILOT.md) **before** initiating a substantial Python, analytics, forecasting, optimization, GIS or simulation enhancement.

**Nonnegotiable:** Standardize the quality. Never standardize away the imagination. The existing Experience OS v1.2 governs visitor interactions, editorial voice, maps, mobile accessibility, aesthetics and discovery. Python OS governs data contracts, responsible numerical intelligence, validation, performance and evidence. Neither overrides the owning repository's instructions.

## Decision workflow
1. Identify the user's decision, owning repository, existing algorithms, current data source and bottleneck. Check active PRs and production baseline. Do not assume Python is needed.
2. Compare (A) existing JavaScript/SQL or static precomputation, (B) scheduled Python with versioned outputs, and (C) request-time Python. Score documented visitor value, model reliability, visual distinctiveness, cost and discovery; reject candidates blocked by hard gates.
3. Produce a source register including data owner, license, permissible use on an advertising-supported property, API cadence, timestamps, spatial meaning, units, missing-value conventions and scientific limitations.
4. Keep ingestion, transformations, domain-specific decision rules, uncertainty and presentation separate. Version JSON contracts, document scope and add honest statuses: AVAILABLE, PARTIAL, STALE, UNAVAILABLE. Do not turn gaps into zeros or regional data into an exact local answer.
5. Backtest real predictions against **independent** ground truth and a naive comparator, with out-of-time splits and uncertainty calibration. If ground truth is absent, publish descriptive evidence, not percentages, model skill, sightings, causal claims or treatment recommendations.
6. Implement the lowest-operational-cost route. Prefer offline stdlib jobs and artifact-backed data when live Python adds no measurable benefit. No new Redis, Supabase, persistent user location, keys or network services without specific approval.
7. Run owning-repository tests and full release gates; verify browser at 390px and desktop, performance, stale/failure UX, source links, screen readers and evidence timing. Preserve canonical, Person schema, ad behavior and current URL ownership.
8. Record baseline and post-release measures separately: source coverage, numerical validity, forecast calibration (only where eligible), latency/cost, task completion and GSC 28-day impressions/CTR. Search gains are hypotheses, never guaranteed.

## Required deliverables for each substantial adoption
- Owner-specific implementation brief with at least two architectures considered.
- Versioned input/output schema, provenance and freshness rules.
- Reproducible Python and JS tests with missing, duplicate, stale, future, rollover and conflicting inputs.
- Benchmarks plus an actionable rollback.
- Public verification and a concise release record; links to exact owning repo changes.

## Canonical implementation pilot
The existing Python field-read worker is in `izworskic/phenology-michigan`, **not** this site repository. Reuse its `scripts/python_intelligence/` scientific quality helpers as an implementation reference; do not duplicate phenology endpoints in the site shell. See [docs/PHENOLOGY_PILOT.md](docs/PHENOLOGY_PILOT.md). Follow cross-repository adoption rather than copying unreviewed product logic.
