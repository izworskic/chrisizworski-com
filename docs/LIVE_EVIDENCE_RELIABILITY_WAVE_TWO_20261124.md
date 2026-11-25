# Live evidence reliability: wave two

2026-11-24. Baseline main 03929abec4e5132cc2234c61ed844df92d4bb227. Continuation of #1956, independent draft branch. Main push-only gate unavailable from connector; last Soo PR gate green. Do not merge before exact-head full CI and relevant browser acceptance. No new framework, dependency, route, cron, paid service, layout, canonical or ads change.

| Product | Observed defect or verified existing behavior | Proposed correction |
| --- | --- | --- |
| Michigan Aurora | Solar wind parser gives magnetic and speed values the newer of their timestamps, hiding an expired component. Kp source available on empty valid periods. | Reject independently expired/future components using existing six-hour limit; preserve valid independent fields, validate Kp 0 to 9 and report unavailable when no usable period remains. Retain OVATION future valid-time tolerance and existing forecast horizon. |
| Michigan ShoreFeel | nowPeriod falls back to first hour even if already expired or not yet valid. Existing NDBC and nearshore NOAA parsers already check age independently. | Withhold current modeled air without a covering hour; retain the forecast timeline and independently valid water data. No change to shoreline physics. |
| Michigan Ice | API computes stale at generation time; browser trusts the flag after caching. History can arrive from yesterday. | Recheck 48-hour source age with existing two-hour tolerance, and Michigan calendar date before displaying a today comparison. Keep older historical chart context and off-season peak. |
| UP Waterfall Explorer | Existing USGS daily parser already excludes incomplete current days, stale readings and invalid comparisons. | Preserve current daily contract; no unverified waterfall flow forecast or unnecessary edit. |
| Manistee River | Latest timestamp of any parameter makes older independent readings appear current; missing raw values coerce to zero. | Apply existing 180-minute limit independently per parameter, reject future/invalid timestamps, keep valid zero and use oldest retained timestamp conservatively for the aggregate. No new flow prediction. |
| Portfolio | Different sources legitimately have different cadences, date precision and owning repositories. | Shared regression suite, no universal TTL. |

## Remaining scope and evidence

The independent national-aurora and national-rivers repositories are outside this main-repository pilot. Do not edit their mirrored pages or duplicate national-outdoor-core. ShoreFeel forecast issuance freshness, mixed-age cached browser payloads, ice freeze-up enhancement, Aurora UI refresh, and full outage/recovery browser behavior require additional source-specific tests; the patch does not claim all are solved. Actual upstream conditions, exact-head CI, visual QA and measured outcomes are unverified at creation. No change in numerical forecast accuracy is claimed. Rollback is normal reviewed revert.
