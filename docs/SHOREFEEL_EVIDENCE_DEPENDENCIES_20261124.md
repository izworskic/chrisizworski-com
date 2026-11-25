# ShoreFeel evidence dependency projection

2026-11-24. Product Engineering OS candidate. Base 8935cbbc97045d0c85a9a390ad4ee616a07380f8, preceding five release PRs merged and production Vercel success. Main push-only gate not surfaced in current connector. Separate from #1960 and #1961; the latter modifies upstream normalization, this change consumes the unchanged response schema.

## Scope and choice

Four existing pages consume public/assets/shorefeel.js: Great Lakes and Lake Michigan water-temperature hubs, Traverse City and Grand Haven. Previously a first forecast hour could masquerade as now; old raw water observations and derived model cards were trusted solely because the cached response had marked them available. The independently validated Saginaw pilot and regional US/Canada clients are not changed. Choose a small pure projection inside the existing shared consumer over new runtime graph, global freshness policy or server. It does not recalculate model values or fetch any new evidence.

| Conclusion | Required dependency |
| --- | --- |
| Current local water | Explicit buoy or satellite observation and its own existing age limit |
| Local buoy, map-source evidence | Separate six-hour station reading; no substitution |
| Independent satellite cell | 72-hour source age, existing one-hour future tolerance |
| Current air and wind | 30-minute response (existing Saginaw policy) and covering hourly period |
| Air/wind recommendation | Current response, valid nonexpired hour and numeric air/wind |
| Water exposure text | Valid local water only |
| Air and wet-skin interpretation | Current hourly forecast |
| Combined activity recommendation | Current packet and both water and weather |
| Individual beach-water model | Current packet, model cycle within existing three-cycle/5h publication-lag search window (23h conservative maximum), matching dated recent satellite reference for that beach and intact forecast range |
| Whole-lake number | Its own dated current calendar observation (0-3 days); historical trend may remain dated context |

Model mapping mirrors existing beach-forecast.js BEACHES: west-bay for Clinch Park, east-bay for TC State Park, open-shore for Grand Haven State Park. Exact timestamp and level agreement prevent a different valid cell from supporting the wrong beach estimate. Missing lead-zero or incoherent range withdraws the card. This is display eligibility, not evidence of an improved predictive model. Historic charts remain; source locations and static destination guidance remain. No new scheduled refresh; the dependency projection is evaluated at load, not a continuous expiry monitor. No new dependency, route, cron, paid service, production requests, layout or ad changes. Updated asset hashes and page/sitemap date stamps to match actual edits. Existing source rights and canonical/Person preserved.

## Evidence and release

Deterministic actual-function matrix and existing network Chromium acceptance extended with four scenarios at 390/1366 widths, including independent per-beach withdrawal and partial weather/packet expiry. Other existing ShoreFeel browser cases remain. No screenshot inspection, exact-head CI, production or traffic outcome yet verified. No claim entire portfolio coverage; additional consumers and long-open-tab expiry are follow-up opportunities. Normal reviewed revert for rollback.
