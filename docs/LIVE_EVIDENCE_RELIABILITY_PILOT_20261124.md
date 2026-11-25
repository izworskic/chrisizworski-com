# Live evidence reliability, first cross-tool pilot

2026-11-24. Product Engineering OS candidate reference, not activation of a new skill or system. Baseline main 03929abec4e5132cc2234c61ed844df92d4bb227; Soo #1954 passed its four PR workflows before merge. Main push-only workflow is not visible through the current connector. Duluth #1955 has its own pending exact-head gate. This branch is independently reviewable and does not touch either freighter implementation.

## Decision

A visitor must not receive a current condition verdict based on an observation that has not occurred. Source inspection identified identical unsafe zero-age clamping in the Michigan snowmobile classifier and CBBT source freshness classifier. The existing snowmobile summary also admitted future dates into its newest-source label, and classified unknown grooming timestamps as stale. Michigan Ski Hills and GLERL ice have their own explicit report-date checks; do not replace those domain contracts. The national-outdoor-core repository owns a separate national shared freshness contract; do not duplicate or change it here.

Compared (A) a new common runtime state machine across all tools, which risks incompatible source cadence, date precision and ownership, with (B) fixing proven defects in the existing engines and adding shared regression cases. Choose B. No new runtime module or universal time-to-live. The common invariant is a test, not a competing implementation.

## Evidence contract

- Retrieval time is not observation or forecast issue time. Future forecast *valid* times are legitimate and outside this classifier.
- Future issue/observation times, malformed and absent dates map to existing UNKNOWN/unknown and null age, never zero-age LIVE/fresh. Strict cutoff for these timestamped sources; no fabricated clock-skew allowance. Valid dates exactly at the clock remain fresh.
- Preserve each engine's current freshness thresholds and API vocabulary. Do not reinterpret explicit zero, closed, or no reports as a failed source.
- Future snowmobile report evidence cannot support a ride-quality score or confidence. Independent official closure veto remains authoritative. Valid replacement evidence can restore the existing score. Exclude invalid timestamps from the newest-source summary and grooming denominator.
- CBBT change applies to its existing source issue/observation freshness classifier only, not official restriction policy, forecast valid times or a complete frontend outage audit. Weather is context, never an operational restriction inference.

## Verification and costs

Run node --test tests/live-evidence-reliability.test.js plus existing snowmobile and CBBT suites, then npm run verify:all in the existing Actions workflow. New tests compare both classifiers, exact boundaries, invalid input, abstention, valid replacement evidence, closure priority and summary behavior. Tests are committed but not yet executed in the current connector session; review exact-head CI. No new API, dependency, cron, paid service, database, public route, page layout, SEO, Person or advertising change. Roll back through a normal reviewed revert if regression occurs.

## Next adoption candidates

Audit Aurora observation versus forecast issue time, ShoreFeel weather versus water observation age, and ice historical/current fallback separately. Require actual source contract and existing owner before changing code; do not impose this timestamp policy on date-only products. Review live-data failure, empty success and recovery with each tool's existing UI tests before claiming portfolio coverage.
