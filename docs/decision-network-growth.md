# Decision network growth release

Status date: 2026-08-18

This release upgrades three existing growth surfaces without creating a new thin-page cluster:

1. a crawlable task-based authority graph on the Tools and Great Lakes hubs, with focused continuation links on Boat Launches and Shipwrecks;
2. Michigan Boat Launch Finder V2, preserving the existing 42-launch inventory and regional NDBC context while making search/filter/directions faster;
3. Great Lakes Shipwreck Explorer V2, preserving the existing record-rich parent page while adding lake/era/cause/access filters, quick views, an orientation map, and factual consistency repairs.

## Loss function

The build is considered worse, regardless of apparent feature depth, if it creates thin/cannibalizing URLs, resets protected active-experiment search surfaces, turns nearest-buoy data into ramp or safety truth, turns regional wreck anchors into exact coordinates, removes source records, breaks parent canonicals, introduces personal/location storage, or touches the unrelated Circle Tour agent work.

## Search boundaries

- Boat Launches retains `https://chrisizworski.com/michigan-boat-launches/` as the parent search owner. No new launch-detail URLs are created in this release.
- Shipwrecks retains `https://chrisizworski.com/great-lakes-shipwrecks/` as the explorer/database owner. No new wreck-detail pages are created in this release.
- Existing active experiment destinations receive inbound links only; their title, description, H1, first answer, schema, canonical, and indexability are not changed here.

## Trust boundaries

- NDBC conditions are regional screening context, not observations at a particular ramp, marina, river mouth or protected harbor and not a boating-safety rating.
- Shipwreck map markers are named-place orientation anchors derived from the existing table, not navigation, dive or exact wreck coordinates.
- The Edmund Fitzgerald and Hamilton & Scourge access labels reflect their status as prescribed Ontario marine archaeological sites requiring licensed access within regulated distances.
- No geolocation, cookies, browser storage, fingerprinting or personal identifiers are introduced.

## Measurement

Stable first-party event families:

- `Decision Network Handoff`
- `Boat Launch Filter`
- `Boat Launch Pick`
- `Boat Launch Action`
- `Shipwreck Explorer Filter`
- `Shipwreck Explorer Preset`
- `Shipwreck Detail Open`

Network events use symbolic destination/lane/surface IDs rather than destination URLs.

## Market test

The benchmark is a build-quality merge gate, not a traffic forecast. Baselines come from the Search Console export through 2026-08-15. Outcome targets are evaluated only after enough comparable traffic exists; the release should not be churned mid-window merely to raise an internal score.
