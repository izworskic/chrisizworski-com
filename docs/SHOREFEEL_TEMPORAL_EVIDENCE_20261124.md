# Saginaw Bay temporal evidence intelligence

2026-11-24. Product Engineering OS candidate; existing Saginaw Bay pilot only. Base 8935cbbc97045d0c85a9a390ad4ee616a07380f8. Separate from the legacy ShoreFeel dependency PR #1962 and upstream normalization PR #1961. Main push-only gate not surfaced by connector.

## Decision

A valid answer at page load can become unsupported while the visitor keeps the page open. Previously several displayed fields and map popups stayed unchanged until a manual refresh. Choose a single local deadline scheduler over automatic polling or a new backend. It does not forecast a new hour, infer new readings, or fetch anything automatically. Use existing source cadence, source identity and packet constraints.

| Boundary | Behavior |
| --- | --- |
| Buoy/marine air: 6h; satellite: 72h | Withdraw that individual observation and dependent statements; retain other verified observations |
| Scenario water: 36h | Withdraw research-only scenarios and wind/water contrast while the independently valid water reading remains |
| Hour end | Withdraw current air, shoreline apparent temperature, paired forecast and dependent activity guidance |
| Weather-window end | Withdraw expired recommendation |
| Lakewide 3-day calendar age | Withdraw current lakewide context at UTC midnight |
| Packet: 30min | Existing conservative whole-packet gate; withdraw live conclusions and prompt manual refresh |

Inclusive age thresholds expire one millisecond after the boundary; hourly valid periods end exclusively. One timer schedules earliest future deadline. Reproject already accepted data, never recover a rejected future record merely because the clock advanced. Recheck on page visibility, focus, pageshow, and activity/evidence selection. A fresh successful manual request can restore conclusions. Preserve selection, activity and map viewport during expiry; close old popups instead of panning or reopening them. No automatic requests, notifications, services or dependencies. No new numeric forecast accuracy claim. No page layout, canonical, ads or upstream changes. Browser timers can be suspended by OS/browser; visibility/focus recheck is a safeguard, not a real-time guarantee when a tab is frozen.

## Verification

Deterministic tests exercise independent expirations, exact boundaries and rejected future data. Existing Chromium browser acceptance extended with virtual clock, three successive deadlines, no additional API fetch, preserved selections and manual recovery at 390/1366 widths. Exact-head CI and actual screenshots pending; these are synthetic scenarios, not live conditions or visitor outcome evidence. Remaining scope: other tools, continuous expiry in legacy ShoreFeel pages, material-change detection and forecast revision/accuracy evaluation. No new model, polling, dependency, route or paid service. Rollback through reviewed revert.
