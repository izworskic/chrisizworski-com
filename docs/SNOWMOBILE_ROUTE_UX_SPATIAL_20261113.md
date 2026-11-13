# Snowmobile route planner: mobile usability and spatial performance
Date: 2026-11-13 · Existing public URL: /snowmobile/

## Visitor outcome
Riders selecting a route within the seven DNR-backed Michigan snowmobile
regions no longer have to find every blue dot visually. Each region now offers
a labeled junction search (trail name or number). Matching selections come
only from the same `routeJunctions.features` used by the map and route
API. Results are restricted to the first stop's connected component, so a
visually crossing but disconnected system never appears to be a reachable
stop. Search results include coarse coordinates to distinguish repeated
trail numbers without adding invented waypoints.

The result panel now leads with a clear truth boundary: **distance planning,
not a ride recommendation**, plus unscored traversed parts, current closure
feed verification state and in/out-of-season limitations. The line drawing,
official DNR closure filtering and existing multi-stop routing contract are
unchanged. No local grooming report is inferred from snow depth or an open
line on a map.

## What was optimized
The original `buildTrailGraph()` performed a haversine check for every
endpoint pair: O(N²) exact distance calls. The new
`nearbyEndpointPairs()` uses conservative geographic buckets to discard
obviously distant pairs, then applies the same original haversine test.
Candidates are sorted in ascending index order, preserving the original
UnionFind traversal and published node IDs for unchanged input. This
changes neither the official DNR geometry nor the 20-meter near-endpoint
snap tolerance, and does not connect line interiors.

The actual Rust/WASM shortest-path engine remains in place. Build and
routing speed are measured separately; do not describe a lower number of
candidate comparisons as guaranteed production latency improvement.

## Verification
- `node --check public/assets/snowmobile-region.js`
- `node --test tests/snowmobile-route-ux.test.js tests/snowmobile-routing.test.js tests/snowmobile-rust.test.js`
- `node scripts/benchmark-snowmobile-routing.mjs --check`
- `node scripts/benchmark-snowmobile.mjs --check`
- `node scripts/generate-snowmobile-region-pages.mjs` (regenerate seven files)
- Full CI/production build and actual mobile map workflow before deployment

The benchmark prints actual candidate/naive pair ratios and fixture Rust
vs JS timings, without asserting timing thresholds across different machines.
The CI still compiles Rust 1.90.0 and checks the committed binary byte for
byte. Unavailable data, unverified surfaces, or failed Rust remain explicitly
unknown with the original JS routing fallback.

## Scope guard
No changes to AdSense or GA4 integration, canonical tags, sitemap ownership,
public route URLs, official source URLs, existing map data provenance or
the DNR closure matching. Do not publish fabricated trailhead parking,
GPS turn-by-turn navigation, current grooming, or legal access permission.
