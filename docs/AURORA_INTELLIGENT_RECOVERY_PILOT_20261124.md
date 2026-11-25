# Intelligent Recovery: Michigan Aurora pilot

2026-11-24. Product Engineering OS reliability follow-up. Main baseline 03929abec4e5132cc2234c61ed844df92d4bb227. Independent of #1955, #1956 and #1957, which remain draft PRs at start. Main push-only gate is not exposed by the connector; exact-head verification required before release.

## Visitor task and audit

The visitor wants to decide whether to go out tonight. The Kp forecast, OVATION model, observed Kp, solar wind, clouds, moon and computed darkness have separate meanings. In the baseline page, a missing Kp peak throws into a total failure handler even if the API successfully returned independent valid sources. The same handler does not reset the gauge, forecast chart, highlighted Kp step or elevated recommendation. Background expiry clears regional data but leaves the forecast displays. A successful zero Kp is not equivalent to missing data.

Compared a new common recovery controller with a narrow repair of the existing page state. Choose the existing page: its manual refresh, ten-minute poll, regional selector, stale-response guard and request ordering already exist. Soo and Duluth have different AIS-specific evidence contracts; ShoreFeel has its own current-hour and water-age checks. Do not transplant their layouts or invent a universal retry/cache policy.

## Implementation

- On current partial responses without a usable Kp forecast, withdraw every forecast-dependent display together, including the gauge, chart, recommendation, scale highlight, status dot, peak card and statewide decision. Empty contradictory forecast periods before storing the snapshot.
- Retain independent source context from the same current response (observed Kp, solar wind, OVATION model, available NWS regional clouds and USNO moon data). Use existing renderers, and the existing astronomical-darkness computation where regional coordinates are available. No independent feed is a replacement for missing Kp.
- Complete HTTP failure, malformed/expired response, and background expiry invoke the same clearing path with no retained live numbers; the static region thresholds, official links and viewing guide still work.
- Valid replacement data restores the existing display on manual refresh or the existing poll. A superseded request still cannot overwrite the latest result. No additional polling, push notification, route, dependency, API, forecast method, paid service, ads or canonical change.

## Verification

tests/aurora-independent-recovery.test.js runs the actual loader and clearing functions with a deterministic DOM double, not a real browser. Existing verdict tests remain in place. Verify actual partial/total failure and recovery in the browser, inspect mobile/desktop screenshots, and check exact-head full CI before merge. No production source availability, rendering, traffic, revenue, or forecast accuracy improvement is claimed. Rollback: normal reviewed revert.

## Handoff

Prioritize a real browser outage/recovery replay for this pilot before expanding to the ShoreFeel destination experience. Independently verify each outstanding draft and avoid editing the extracted national aurora repository from this repo. GSC/AdSense impact not measured.
