# ShoreFeel regional evidence integrity pilot, 2026-11-24

## Decision and evidence

Visitors need a reliable area comfort reading plus a clearly dated, optional nearby lake-water context. Existing regional U.S. and Ontario routes use NOAA GLSEA ACSPO satellite water, not beach-air or swimmer-depth measurements. Existing NOAA contract: degrees C, UTC daily analysis, latitude/longitude, 4 km and 36 h regional limits; see docs/SHOREFEEL_UNIFIED_REAL_FEEL_20261124.md and the existing CSV fixtures. NOAA public dataset listing: https://apps.glerl.noaa.gov/erddap/griddap/index.html. Direct metadata was access-denied during this session; no fresh feed availability claim. Existing provider contracts and source URLs remain unchanged.

Four specialist skills applied: environmental-intelligence, calibrated-prediction, engine-property-testing, data-contract-validation. Existing offline archive evidence and online-only constraint do not establish independent on-sand air calibration. No new numeric temperature correction, prediction interval, physical logger, new source or request. No new package, function, scheduled job or paid infrastructure.

## Baseline and improvement

The shared GLSEA parser permits 72 h for legacy products. The regional decoder used to select a nearest pixel, then reject it for exceeding 36 h or being future-dated, thereby losing valid alternatives. It also accepted the wrong temperature units and chose the first of conflicting duplicate samples. Apply the existing regional criteria before shared nearest selection, verify the declared CSV units and UTC timestamps, quarantine conflicting coordinate/time samples, and retain valid independent records. The air forecast is independent of water availability; public response schema is unchanged.

Compare existing JS with bounded preprocessing in JS (selected), offline Python archive analysis (appropriate for model research but not live feed correctness), and runtime Python (unnecessary cost). No external libraries. The 72 h contract for legacy destination products is untouched. Existing precision and spatial scope remain unchanged.

## Verification

Executed the exact fetched engine and decoder source in an isolated JavaScript evaluator with the new four test groups (minimal assertion adapter, not Node test runner). Baseline: 0/4 groups passed. Patched: 4/4 groups passed, including 256 seeded mixed-validity and input-order cases (seed 0x5a17fe01). Tests are synthetic parser fixtures, never real beach observations. Full Node tests, owning repo CI, production/browser verification and live source retrieval: NOT VERIFIED in this session. Run node --test tests/shorefeel-source-integrity.test.js tests/shorefeel-unified-real-feel.test.js and npm run verify:all. No accuracy, coverage uplift, latency or SEO outcome is claimed from synthetic tests.

Python OS priority assessment (judgment, not measured): visitor decision 4/5, source reliability 5/5, visual distinctiveness 1/5, cost 5/5, discovery 2/5. Narrow source-integrity fix, not a substantial redesign. Hold scientific prediction release gate until appropriate independent online observations exist.

Rollback: revert this PR; no changes to data sources, page generators, ads, SEO, public routes, Canada forecast selection, U.S. coverage catalog, or 72 h shared parser. Coordinate with U.S. expansion PR #1899; this patch avoids its changed files.
