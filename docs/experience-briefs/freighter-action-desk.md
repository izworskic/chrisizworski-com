# Great Lakes shipping desk: experience brief (2026-11-03)

Visitor decision: where is the live feed reporting vessels, and what does the selected report actually say? This is an enhancement to the existing ship-tracker canonical. Counts are snapshots of reports, not ship traffic totals, passages, arrival predictions, dock activity or navigational information.

## Concepts considered

1. A lake-wide heat layer: compelling, but density contours imply comprehensive coverage, need careful scale interpretation, and obscure individual ships. Not selected for this release.
2. A corridor watch desk with selected-ship report: six existing map areas with directly labeled, approximate distance counts; selecting an area changes the existing map and source handoff. Selecting an actual reported vessel exposes its MMSI, report age, source and available AIS fields. Selected because the data is already supported and the experience answers a concrete viewing decision.

## Visual and interaction distinction

Compared with Freighter Central (`/freighters/`), the specialist tracker answers where reported ships are *right now*, with a six-corridor watch desk and selected-report detail rather than a directory/finder. Compared with the winter layup page, this shows time-limited public AIS observations and makes no confirmed berth or layup claim; the layup page tells documented seasonal stories. Both reuse the existing ship map and factual source boundaries rather than duplicate a skin.

## Evidence and data

- USCG AIS FAQ, checked 2026-11-03: https://navcen.uscg.gov/ais-frequently-asked-questions. Position and vessel/voyage reports are distinct and may arrive at different times.
- USCG vessel information verification: https://navcen.uscg.gov/ais-vivs-home. AIS static data may have discrepancies; names alone cannot securely bind a vessel to a biography or photo.
- MarineTraffic help, checked 2026-11-03: https://support.marinetraffic.com/en/articles/13641438-how-do-i-see-vessel-details and https://support.marinetraffic.com/en/articles/9552654-live-map. Reference the principle of selection-to-detail, not its proprietary design or data.
- NOAA AccessAIS: https://coast.noaa.gov/digitalcoast/tools/ais.html. Historical tracks are a separate dataset and not produced by a current-position snapshot.

Uses only the existing normalized Open Waters AIS response and existing six map centers/radii. 35 miles, 60 miles for Saginaw Bay, are geographic approximations, not actual corridor boundaries. Counts include all vessel types; circles overlap. Reports older than 30 minutes and more than one minute future-dated are excluded. No extra request, storage, new source, account, Redis or automatic GPS. Python independently generates deterministic synthetic reports and computes an oracle to test browser counts; the live presentation runs in JavaScript. Python does not supply live positions.

The current provider payload does not supply a verified crosswalk for existing editorial biographies/photos; no picture or biography is matched by name. Missing destination/length stays unknown. A vessel-supplied destination is not an arrival guarantee. Cite feed source and report age on every selected card; retain the existing full attribution and navigation warning.

## State matrix

- Initial/loading: count status says waiting; no invented zero.
- Fresh: six labeled counts; clicking a place moves the existing map and marks the selected area.
- Ship A → ship B → ship A: detail is keyed by MMSI, replaces previous data, and uses the same filtered live snapshot as its list/map.
- Search/view changes or report expires: selected detail clears if its MMSI is outside the currently displayed set; no stale personal selection survives.
- Refresh fails: retained observations remain only while within the age limit; the corridor desk says refresh failed and shows the last checked time.
- All data fails: no counts; explicit unavailable language and existing external passage alternatives.
- Map/CDN failure: clickable text results remain able to open selected-report details. No JS: page explains that live counts need JS and retains static passage alternatives.
- Narrow, keyboard, and reduced-motion: native buttons and text labels, no color-only meaning; fixed buttons stay in place while counts refresh. Fixture-based screenshots at 360/390/768/1440 were inspected. They revealed a blank map fallback that was shortened in the follow-up; repeat browser checks are required. Keyboard and real map-tile evidence remain required.

## QA and outcome

Focused Python geographic reference plus node tests are executable; fixture-based 360/390/768/1440 browser workflow is provided. Real-browser screenshots, production tiles, photo review (not applicable), independent screen-reader review, performance measurements and user outcomes remain NOT MEASURED until evidenced. The 90/100 score cannot be honestly assigned without that evidence. No CTR, impression, engagement or revenue lift is asserted.
