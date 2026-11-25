# Portfolio evidence contract audit, wave three

2026-11-24. Baseline main 8935cbbc97045d0c85a9a390ad4ee616a07380f8. Previous reliability wave merged; Vercel production status success. Push-only main Actions unavailable from current connector; last Duluth PR gate green. Separate from CBBT PR #1960 (independent in-progress release; no overlapping source edits). Candidate Product Engineering OS method, not activation or another framework.

## Repeatable audit
Run `node --test tests/portfolio-evidence-contract.test.js tests/live-evidence-reliability.test.js tests/live-evidence-wave-two.test.js tests/shorefeel-independent-recovery.test.js tests/aurora-independent-recovery.test.js`. Existing `npm test` includes all five automatically, and existing full CI invokes npm test. No new workflow, dependencies, network source calls or production infrastructure. Use the actual owning engine in a deterministic fixture, not a new universal time-to-live or parser. Extend with newly confirmed failure cases. Tests and source inspection are not live uptime or actual visitor behavior proof.

| Invariant | Existing evidence | Added evidence / correction |
| --- | --- | --- |
| Missing, blank, boolean, malformed numeric values are not zero | Manistee missing values and Kp range, #1960 bridge pending | ShoreFeel hourly numeric values and percentage bounds, Aurora shared number parser; explicit numeric zero retained |
| Units and identity | Existing NOAA / NWS engine tests | Fahrenheit/Celsius only, no unknown-unit default; preserve blank NOAA named CSV columns without shifting lake identities; blank climate normal is missing |
| Observation vs valid time | Snowmobile/CBBT future observation checks, Aurora Kp, Ice 48h policy, Manistee age, current ShoreFeel hourly window | Solar wind choose latest valid timestamp before selection; no dependence on array order; ShoreFeel weather window excludes expired hours; existing regional NWS 18h issuance and 1h future tolerance reused for local API |
| Independent evidence loss | Aurora, Saginaw Bay browser replays; Soo/Duluth outage replays | Existing NWS API mock extended with expired land forecast while valid independent NOAA marine air retained |
| Operational authority | Bridge official-status engine tests | Preserve official closure and restriction rules; no change to bridge source or UI in this PR |
| Cache / fallback, conflict, recovery | Prior source-specific regression and browser suites | No claim all possible mixed-cache states, source conflicts or UI consumers covered |

## Remaining coverage
No exhaustive portfolio inventory or count: this is bounded to in-repo ShoreFeel, Aurora, CBBT freshness, snowmobile, Manistee, Ice and previously documented freighter scenarios. National-rivers, national-aurora and other extracted repos require separate owner review. ShoreFeel generic destination client still has first-hour fallback, ice freeze-up independent source expiry remains to audit; CBBT incident semantics and source-specific quality flags not covered. Do not treat untested behavior as green. Malformed numeric values and row order are tested with fixtures, not provider incident claims. Existing source endpoints and rights unchanged. No new model or calibrated accuracy claim.

## Release
Exact-head full repository and relevant ShoreFeel browser gates required; real screenshot inspection and live verification not performed here. No SEO, ads, page layout, dependencies, new routes, cron, services or runtime architecture change. Rollback through normal reviewed revert. Record CI outcomes after exact head runs.
