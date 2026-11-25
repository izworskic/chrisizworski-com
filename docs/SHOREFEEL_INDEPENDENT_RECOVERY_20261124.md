# ShoreFeel independent recovery pilot

2026-11-24. Main baseline 03929abec4e5132cc2234c61ed844df92d4bb227. Saginaw Bay existing page, independent review branch. Earlier reliability drafts remain unmerged. Main push-only gate not exposed by connector.

## Decision and baseline

Visitors need useful beach preparation when one source stops reporting. The existing API uses independent all-settled sources; do not add another fetch engine. Existing UI discarded valid water from its activity panel when the current air hour was absent, and retained paired/model or activity fields across source loss. It only loaded once. Compared shared new recovery framework with local repair using the existing API, source thresholds, map and renderer. Choose local repair, no new services or automatic polling. Other shoreline pages have separate source contracts and are outside this implementation.

## Implementation

A bounded manual refresh reuses the API and preserves chosen activity and evidence location. Independently check the selected water source timestamp (buoy six hours; satellite 72 hours and existing one-hour future tolerance), marine air six hours, active forecast hour, and the research model's tighter 36-hour water requirement. The existing 30-minute packet gate remains conservative: no live claim from an expired packet or total HTTP failure. No retained old readings after failure. Independent current air remains available when water is unavailable; valid dated offshore water remains useful when weather fails. No combined claim when its source is missing. Paired forecast comparison remains independent of water. Reset dependent window, map markers, and model displays; no map reconstruction, duplicate layers or new prediction math. Existing static guide, official sources, SEO identity and advertising remain.

## Evidence and limitations

New deterministic snapshot tests and expanded existing Chromium suite at 390/1366 widths cover weather-only, water-only, stale observations, complete outage and same-page recovery. Screenshots and real browser outcomes must be verified on the exact head; not executed or inspected in this connector session. No live upstream or SEO/revenue uplift claim. No claim of coverage across other U.S./Canadian regional beaches or lakewide products. No new production endpoint, dependency, scheduled task, paid service or automatic polling. Normal reviewed revert is rollback. Next action: verify exact-head browser/CI, then review expansion to other existing ShoreFeel consumers.
