# Michigan Winter Trails — standalone field guide release · 2026-10-28

## Product identity
Distinct from `/michigan-cross-country-skiing/` (Nordic ski planning + 48 live snow reports), `/michigan-snow-depth/` (snowpack map), `/michigan-snow-totals/` (storm reports), `/frozen-michigan/` (11 ice curtains, frozen waterfalls & shorelines), and `/michigan-winter-activities/` (18 broad winter activity choices).

`/michigan-winter-trails/` is the dedicated **winter trail-mode, route-etiquette, and seasonal-access field guide** across **15 primary trail systems** and **50 named DNR and National Park Service loops** (plus **7 explicitly quarantined winter routes**). Every trail system, named loop distance, closure notice, and official agency source works without JavaScript. Map pins represent general park or pathway corridors, never guaranteed plowed winter parking or turn-by-turn winter driving directions.

## Access & route-audit findings
- **Pictured Rocks — Munising Snowshoe Trail (#01):** Dedicated 2.65-mile snowshoe loop documented by NPS (`nps.gov/piro/planyourvisit/snowshoeing.htm`). Adjacent Munising Falls canyon trail remains closed until further notice following the April 2025 washout and 2026–2027 repair contract.
- **Tahquamenon Lower Falls (#02) & Upper Falls (#03):** Official DNR winter trail maps document the Lower Falls Green (1.6 mi) and Blue (2.4 mi) snowshoe loops, Upper Falls Brink Walk (0.75 mi) and Marked Snowshoe Trail (1.0 mi). The Upper Falls 1.0-mile Lantern Loop is **cross-country ski only** (snowshoes prohibited), and the 4–5 mile River Trail connecting Lower and Upper Falls is **not maintained in winter**.
- **Paradise Pathway (#04) & Pine Bowl Pathway (#05):** Ungroomed/skier-tracked Eastern U.P. state forest loops (Paradise 1.6, 3.2, 3.4 mi off M-123; Pine Bowl 2.0 mi Short Loop and 5.7 mi Long Outer Loop). Outer 5.9-mile Pine Bowl ski hills feature steep wooded descents where snowshoers must stay off ski tracks.
- **Porcupine Mountains (#06):** M-107 west to Lake of the Clouds and South Boundary Road close to wheeled vehicles in winter; winter Nordic and snowshoe access concentrates at the eastern M-64 / Winter Sports Complex corridor.
- **Vasa Pathway Snowshoe Loops (#07) & Winter Fat-Bike Corridor (#08):** Shared coordinate pin (`44.750594, -85.493329`, grouped `.wf-pin-multi` marker) separating the three blazed snowshoe loops (Orange 1.5 mi, Green/Yellow 0.6 mi, Red 0.25 mi) and the groomed Winter Sports Singletrack fat-bike corridor from the ski-only 3K/5K/10K/25K courses.
- **Sleeping Bear Dunes Heritage Trail & 10 Mainland Loops (#09) + Alligator Hill & Old Indian (#10):** Groomed classic/skate Heritage Trail (no pets Dec 1–Mar 31; snowshoers walk outer edge only) plus 12 audited mainland loops (1.5–5.0 mi). Steep coastal sand bluffs must never be descended in winter.
- **Hartwick Pines (#11):** Old Growth Forest Foot Trail (1.25 mi) and Mertz Grade (2.0 mi) accessed from plowed M-93 visitor center lot. **Au Sable River Foot Trail (3.0 mi) has an indefinite footbridge closure** (out-and-back only, not a complete loop; raw DNR GIS layers also conflict with the published winter map).
- **Negwegon State Park (#12):** Potawatomi (3.6 mi), Algonquin (3.7 mi), and Chippewa (3.1 mi) loops reached via ~3.5 miles of unpaved Sand Hill Road—not reliably passable for low-clearance sedans in winter snowdrifts.
- **Silver Lake State Park (#13):** Official DNR winter fat-tire bike window runs **December 15 through March 15** on the open dunes with a **minimum 3.5-inch tire width**.
- **Muskegon State Park (#14) & Bay City State Park (#15):** Eight mapped DNR loops (0.3–3.1 mi) at Muskegon alongside the lighted Luge Adventure Sports Park trails; three level Saginaw Bay wetland loops at Bay City State Park (Tobico Marsh 5.1 mi, Lagoon 1.3 mi, Andersen 0.9 mi).
- **Statewide 50-Route Ledger & 7 Quarantined Blockers:** Includes Spring Brook Pathway (1.5 & 0.5 mi), Harrisville State Park (2.0 mi Heritage + 4 Cedar Run loops), Port Crescent State Park (3 loops + 2-mile entrance/day-use coordinate split), Grand Mere State Park (2 loops + active hunting zone caution), Algonac State Park (2 lakeplain loops), and all 7 quarantined routes (`UNPLOWED_SEASONAL_ROAD` at Anderson Lake Loops 1–3, `BRIDGE_CLOSED_OUT_AND_BACK` at Hartwick Au Sable, `SKI_ONLY_NO_SNOWSHOE` at Tahquamenon Lantern Loop, `SKI_NETWORK_COMPLEXITY` at Muncie Lakes 9.8 mi, and `SKI_NETWORK_STEEP_DESCENTS` at Pine Bowl 5.9 mi).

## Photography & visual integrity
- October 29 photo update: #06 uses a February 2020 Porcupine Mountains snowshoe image credited to Tyler Leipprandt / Michigan Sky Media LLC, and #07 uses a February 2024 Vasa Pathway image credited to Michigan DNR. Both are from the [DNR Public Portfolio](https://www.michigan.gov/dnr/about/newsroom/photo-video), which DNR makes available for public and commercial use. The Vasa source does not identify the specific snowshoe loop. Both captions identify the images as archival.
- Three NPS public-domain winter trail photographs (Pictured Rocks Munising Snowshoe Trail Jan 2021, Sleeping Bear XC skiing, Sleeping Bear snowshoeing) and eight Wikimedia Commons exact-place photographs credited individually with creator, source link, license link, and seasonal/archival disclosure.
- Blocked/offline external images fall back automatically to an editorial `.wf-photo-unavailable` panel while preserving the original caption credit.
- Uses locally vendored Leaflet 1.9.4 (`/assets/leaflet-1.9.4.js` and `/assets/vendor/leaflet-1.9.4.css`); zero `unpkg.com` dependencies.

## Verification gates
- `node --test tests/michigan-winter-trails-release.test.js tests/michigan-winter-activities-release.test.js tests/frozen-michigan-release.test.js`
- `npm run verify:quick` / `npm run verify:all`
- `scripts/check-michigan-winter-trails-visual.mjs` across 320 / 390 / 768 / 1366px + blocked-photo fallback + no-JS mode
