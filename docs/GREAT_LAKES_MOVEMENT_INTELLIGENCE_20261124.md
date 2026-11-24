# Great Lakes movement intelligence: shared evidence gate (2026-11-24)

## Scope and visitor problem

Freighter Central, fleet tracker and vessel profiles, Soo Locks, Duluth Canal Park, Welland Canal, Seaway/Eisenhower, Cuyahoga and Calumet river watches, Detroit and winter layup all depend directly or indirectly on shared Open Waters observations. Separate Soo and Duluth approach engines also normalize source data. Centralize the evidence rules rather than changing the providers or reimplementing each map. No static history or simulation becomes live AIS.

## Decision

Keep bounded JS processing (selected); Turf or MovingPandas would be appropriate only for verified route geometries and timestamped track archives. Offline Python is appropriate for held-out passage validation, not snapshot hygiene. Runtime Python or a new tracking store would add cost and unlicensed data retention. Preserve existing Soo channel geometry and Duluth approach rules; do not assert any new route, destination or passage timing model.

USCG Class A AIS report reference: https://www.navcen.uscg.gov/ais-class-a-reports . Open Waters source contract: https://openwaters.io/api/ais/ . Provider commercial terms and attribution: https://openwaters.io/ais/ . Existing commercial source permission remains unresolved per docs/SEAWAY_AIS_SOURCE_RELIABILITY_2026_11_07.md. No added fetch, geographic coverage, storage, raw redistribution or provider substitution. Keep all source credits. NOAA public historical points may support later offline validation after dataset-level rights and timestamps are verified.

## Shared contract

Use source-reported position, qualified UTC observation time, numeric SOG/COG/heading. Unknown, saturated or invalid speed is not zero. COG is motion, not bow heading. A 30-minute position window with existing one-minute future clock tolerance remains for map compatibility; current movement inference and existing approach candidates use a conservative 15-minute, nonfuture evidence gate. This cutoff is a product policy, not a measured forecast error bound. Motion labels describe the last reported speed, not a verified continuous track. Contradictory latest same-time fixes are withheld until a newer valid report; no older position is promoted. Existing approach formulas and scores remain heuristic, not calibrated probabilities or measured interval coverage. Existing winter layup remains unconfirmed from AIS.

## Coverage

Shared normalizer supplies tracker, profiles, Soo map, Welland, Seaway/Eisenhower, Cuyahoga, Calumet, Detroit and winter harbor watch. Separate Soo next-ship and Duluth normalizers share the same motion rules. Cross-region Seaway/layup aggregation also checks same-time conflicts. Freighter Central links to these existing tools; no new central live endpoint or redesigned page. Historical pages, other-repo ownership, third-party embeds and browser-only presentation are not independently modified. No new ETA for observation-only ports.

## Evaluation

Exact fetched JS evaluated with a minimal assertion adapter (not Node test runner). Baseline 0/5 groups, patched 5/5 groups, including 256 seeded replays across 3 normalizers (768 checks). Recorded Soo snapshot candidate and chamber lists unchanged: {"candidates":["ROBERT S. PIERSON"],"inLock":["MESABI MINER"]}. Synthetic inputs are not field observations. No true arrival error or calibration result; no claims of additional live coverage. Full CI, browser and deployed source checks NOT VERIFIED. Run node --test tests/ais-movement-intelligence.test.js tests/soo-ais.test.js tests/soo-locks-next.test.js tests/duluth-canal.test.js tests/seaway.test.js tests/welland-canal.test.js and npm run verify:all. Rollback: revert PR.

No new dependencies, functions, routes, billed features, cron, ads or SEO changes. Next action: offline completed-passage validation on eligible public NOAA historical point data with fixed issue-time and holdout windows before any new ETA algorithm.

## Follow-on: one passage-alignment primitive

The shared implementation now lives in public/assets/ais-movement.js; lib/ais-movement.js re-exports it so the existing server and browser paths agree. The fleet tracker and Welland consume exact nonfuture position age (30-minute maximum); backend normalization retains its original one-minute clock tolerance. Movement and direction evidence requires a nonfuture report no older than 15 minutes, valid course and speed at least 1.5 knots. Do not mistake this for a track, verified transit or arrival probability.

passageRelation compares the reported course to an existing local reference bearing using circular angular difference. It returns aligned, opposed, crosswise or unknown, with observation time and basis. The local waterway owner retains its geometry, tolerance and all local vetoes. Soo retains its projected channel, 45/60-degree tolerances, destination checks and slowdown model. Duluth retains its existing canal bearing, 45/70-degree tolerances, local/long-distance rules, and existing estimate. Welland reuses its existing north/south reference at 45 degrees without producing an ETA. No geometry, prediction formula or provider added. Opposed does not mean departing a lock; aligned does not mean a scheduled passage.

Direct exact-source test: 1,100 bearing/course/tolerance combinations, 384 before/after synthetic Duluth candidate comparisons, recorded Soo candidate and chamber parity, invalid/future/stale/low-speed abstention; 2,598 assertions passed. This is a preservation test, not field arrival accuracy. Updated existing regression harnesses and independent Python age oracle for the new exact browser contract; old version-string assertions now check versioned assets and shared-module order. Full new CI and actual browser acceptance still pending. Lake-effect NWS production health has separately failed; do not bypass. Provider rights remain unresolved and no raw storage or geographic expansion is introduced. Future completed-passage and arrival-window validation requires lawful historical track data and measured holdout outcomes, not more snapshot heuristics.
