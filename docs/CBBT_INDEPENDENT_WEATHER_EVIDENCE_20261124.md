# CBBT independent weather evidence

2026-11-24. Product Engineering OS candidate, targeted data-contract maintenance; not activation of a new skill. Base 8935cbbc97045d0c85a9a390ad4ee616a07380f8. Previous five reliability PRs merged. GitHub reports production Vercel success for this base; main push-only Actions are not surfaced by this connector.

## Decision and scope
Current NOAA air, wind and pressure are independent observations. Existing Number(null) and Number(blank) converted missing fields into zero in backend and browser; undated NWS grids substituted retrieval time, malformed issuance could throw, expired intervals could persist, and a failed refresh left earlier weather values visible. Choose targeted existing JS normalizers/renderer over a new cross-tool runtime or Python migration. Keep original NOAA CO-OPS/NWS source endpoints, units, observation and forecast freshness thresholds, existing source provenance and polling. No new upstream calls or licensing expansion.

- Withhold each missing, expired or future observation independently. Retained oldest timestamp is conservative aggregate; per-source timestamp fields and raw provenance retained. Real calm winds, 0 degree direction and 0 precipitation remain legitimate.
- NWS issue time must be valid and fresh/aging; valid-time intervals must have a real end and not have expired. Future valid times remain legitimate, unlike future issuance. Missing values stay null.
- Browser renders absent values as unavailable, clears weather and forecast on failed API refresh, ignores superseded responses. Official crossing status, tolls, vehicle rules and restriction authority remain separate. Weather never declares a restriction.
- Existing static guide, canonical, Person, ads and source links untouched other than cache-busting live script version.

## Verification
Existing recorded source fixtures plus added deterministic malformed, stale, future, partial and zero cases; actual browser renderer functions replayed with DOM doubles. Full repository, CBBT backend and real browser checks required before merge. No live source uptime, visual acceptance, SEO or calibrated prediction claim. Browser end-to-end replay not yet implemented or executed in this session. Existing incident/advisory outage semantics and source-quality flags beyond this weather scope remain follow-up audit candidates. No new dependency, route, scheduler or paid service. Rollback through reviewed revert.
