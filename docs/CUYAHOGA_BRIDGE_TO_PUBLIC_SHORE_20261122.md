# Cuyahoga bridge-to-public-shore handoff — additive Experience Investment

**Owner:** izworskic/chrisizworski-com. **Base:** the already open Cuyahoga River Desk v2 redesign PR #1859, branch `design/cuyahoga-river-desk-v2-20261122`; do not overwrite it. **Date:** November 22, 2026.

## Visitor problem and design choice

The base Cuyahoga Watch already has an effective map-first experience, 4 public Cleveland Metroparks viewing parks, 19 NOAA charted bridge references, existing AIS positions and a 2025 replay of 1,002 original NOAA broadcast points. It must not become another oversized map legend or generic tourism article. The unresolved action: after selecting a bridge on a map or in the charted landmark menu, a visitor knows what the bridge is, but may not know which publicly managed riverfront area can be explored instead of trying to approach working infrastructure.

Alternative A (rejected): add a second map and complete bridge-by-bridge viewing guide. It would crowd the main map, assert unverified public access, and duplicate the current bridge layer.

Alternative B (implemented): a compact contextual bridge-to-public-shore handoff appears **only** inside the selected bridge's existing map dossier. It computes the nearest **of four source-backed Metroparks public park *area* references**, reports the distance as an approximate straight-line comparison and explicitly rejects line of sight, a walking route, safe parking, current access and ship/bridge arrival predictions. One button triggers the existing Cuyahoga public-park selection workflow, and a source link goes to that Metroparks park's official page. The map-first screen and existing history controls are unchanged.

## Architecture and reuse

- New pure CommonJS/browser helper `public/assets/cuyahoga-bridge-to-shore-core.js`: small Haversine comparison with strict park owner/approximate-location/source filters.
- New progressive enhancement `public/assets/cuyahoga-bridge-to-shore.js`: reads the **existing, unchanged** `/cuyahoga-freighter-watch/bridges.json` and `viewpoints.json`. Observes the existing dossier replacement to respond to either map marker or bridge selector, and triggers the existing `[data-park]` button rather than reimplementing map state.
- New isolated CSS and two script links added to the existing page. **The original Cuyahoga app, core, bridge data, NOAA historical data, source attribution, AIS API, map layer and advertisements are not modified.**
- Node tests `tests/cuyahoga-bridge-to-shore.test.js` cover all 19 main bridges, four verified parks, data failure, private destination rejection and untouched live/NOAA boundaries.

## Source proof and limitations

Existing primary data owner: NOAA U.S. Coast Pilot bridge references (`/cuyahoga-freighter-watch/bridges.json`) and Cleveland Metroparks official park references (`/cuyahoga-freighter-watch/viewpoints.json`). See:
- https://nauticalcharts.noaa.gov/publications/coast-pilot/index.html
- https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation

NOAA points are rounded bridge landmarks, sometimes disputed against other official records; the park points are approximate areas, not certified viewpoints. The new distance is merely straight-line between those uncertain general geographic locations. A nearest public park does **not** mean the bridge or a vessel is visible from it. No industrial bridge access, current closure, walking distance, live bridge state, verified vessel crossing time, ETA or parking entrance is inferred.

## Verification and readiness

Run targeted Node tests plus existing `tests/cuyahoga-public-watch.test.js`, `npm run verify:all`, and branch's Playwright viewport script. Test bridge map click as well as native select, nearest park button, bridge→park→bridge change, keyboard and focus, no map tiles, data failure and no-JS fallback. Preserve noindex, canonical/Person, map provider attribution and Auto ads. Do not merge or deploy without actual CI and browser evidence. The base redesign PR #1859 must be reviewed/merged first (or the dependent PR appropriately rebased). No user engagement/CTR uplift claimed.
