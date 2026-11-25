# Great Lakes failed-refresh evidence handling

Targeted maintenance after #1941, #1948 and the rolling forecast research. Soo Locks #1954 merged after all four release workflows passed. The numeric prediction experiments are not promoted. The existing browser error-state handling is an independent usability correction.

| Surface | Failure-path audit | Decision |
| --- | --- | --- |
| Soo Locks | Previous cached ETA and chamber-now claims persisted | Fixed in #1954 |
| Duluth Canal Park | Retained ETA, candidate markers, candidate popup and monitor with warning only | Fix in this PR: one sanitized display snapshot; clear candidates and pick, withhold all arrival windows and disable focus-next; keep only last-known map positions within existing 30-minute limit, marked as such; no motion state colors from retained positions |
| Welland Canal | Clears vesselData and sets aisState unavailable | No change |
| Cuyahoga | Reclassifies null feed, clears selected stale vessel and popup | No change |
| Calumet | Reclassifies null feed, clears ship marker and falls back to place | No change |
| Great Lakes tracker | Retains positions filtered by current age and identifies refresh failure | No numeric arrival-window issue in inspected map renderer; no change in this PR |

Source inspection, not a complete end-to-end outage test of all tools. Duluth reuses current DOM renderer, existing Leaflet, polling, official published forecast link and camera controls; no new engine, dependencies, API, cron, route or numeric model. Browser regression extends existing fixture matrix at five widths with failure, retained position popup, empty success and full recovery; no claim of forecast improvement or operational accuracy. Existing canonical, Person identity, ads, static content and camera links preserved. Real browser and repository release gates required. Scope is failed refresh, not a claim that all successful upstream responses are accurate or fresh.
