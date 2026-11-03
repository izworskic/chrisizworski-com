# U.P. Waterfall Explorer #1258 — Batch 63 nearby-map and shortlist interaction repair

**Implemented:** November 3, 2026. **Scope:** existing Python-generated nearby index, visitor interaction only. No change to waterfall inventory, arrival evidence, source recency, canonical, sitemap, schema, ads, map provider or indexability.

## Visitor failure and correction

1. The B59 geographic comparison deliberately offers source-reviewed waterfall candidates independently of the main explorer's active search, region, effort and access filters. Previously, the **Show waterfall on map** action called `UPWaterfallFocus(id)` but that function returns false for filtered-out cards. The click therefore silently failed. Now an explicit locate request first clears the four main explorer filters only if the target is hidden, dispatches the normal region change/update pathway so the map/visit lens stay coherent, and announces that filters were cleared in the accessible nearby status. It then focuses the existing map waterfall marker; no parking coordinates or route geometry are invented.
2. Nearby **Save stop** buttons previously only added an item, while an already-saved button had a non-actionable “Saved to your day” label. Clearing the main shortlist or saving elsewhere left stale nearby labels. The nearby button now toggles through the original six-stop planner's own `.save` handler and accurately announces **Save stop** or **Remove saved stop**, with `aria-pressed` and a waterfall-specific accessible name. The planner broadcasts a `upfall:shortlist-updated` event when rendering changes; the nearby panel listens and synchronizes every displayed item. The original six-stop cap/alert is unchanged.

## Source and safety contract

- Geographic comparison still uses the committed deterministic Python output `public/assets/up-waterfalls-nearby.json`; no client-side approximation to driving time, open gates, hydrographs, parcel title or trail route.
- Existing 74 curated cards, 66 eligible nearby suggestions, 8 explicit exclusions and 94 research-only state GIS candidates remain unchanged.
- B62 Whitefish Falls, B61 Chicagon Falls and all earlier research-only candidates remain blocked until authoritative legal visitor arrival evidence is acquired.
- The waterfall map remains source-first with waterfall-coordinate warning. No geolocation, contact, database, Supabase, Redis, or runtime Python service is introduced.
- The visitor's filters change only after an explicit action requiring a currently hidden target; the nearby status announces the change.

## Verification

- New `tests/up-waterfalls-b63-nearby-interactions.test.js` runs source syntax tests and simulated DOM interactions to assert filtered map focus, Save/Remove toggles, external save and clear synchronization, and screen-reader status announcement.
- Existing B59 Python geodesic `--check`, Node review queue `--check`, existing waterfall tests, `npm run verify:all`, browser/mobile smoke, preview deployment and post-merge production must pass before declaring a production release.
- Do not claim CTR, organic growth, current trail opening or visitability changes from this UX repair.

**Next independent waterfall priority:** Improve the actual day-planning decision for the 66 access-reviewed nearby destinations, using only land-manager-sourced travel/arrival facts and clear region constraints. Do not revisit all 94 blocked GIS candidates without new authoritative evidence.
