# U.P. Waterfalls Issue #1258 — Batch 60: Geographic name collision and visitor access evidence
**Reviewed November 3, 2026.** GIS #68 Upper Silver; #213 Alger; #8 Mill Pond.

## Outcomes and visitor decisions

Upper Silver Falls near Herman: state GIS #68 has two independently published waterfall field waypoints approximately 151 and 121 metres away. This geographic feature is 12.4 km south of Lower Silver Falls #110 at the picnic area. The historical short-upstream "upper" picnic chute is **not** GIS #68. No current authoritative land title/permission, parking or continuous legal walking route at Herman is established. Keep research-only, no route.

Alger Falls near M-28/M-94: GIS #213 is only 42 m from an independent feature waypoint, but the City of Munising adopted 2024–2028 plan (page 25) and Alger County 2024–2029 plan each report **no safe parking options**. Neither general MDOT shoulder-law rules nor tourist turnout anecdotes certify site-specific safe/legal parking or a pedestrian approach. This is not a blanket official closure; these are dated municipal safety assessments. Keep research-only. Wagner Falls offers a separate DNR-managed boardwalk visit, not a walking connection to Alger.

Mill Pond Falls on Sundholm Creek: Michigan GIS #8 is 496 m from GNIS-derived Upper Mill Pond and 884 m from GNIS-derived Lower Mill Pond; the latter two map points are 388 m apart. Source-coordinate differences do not prove aliases, three separate waterfalls, access, or an authorized visitor path. The prior B54 access gate remains blocked.

## Implemented

- Evidence input in data/up-waterfall-identity-evidence.json and deterministic generated distances in data/up-waterfall-identity-calculations.json, built with pure Python stdlib in scripts/build-up-waterfall-identity-proof.py. No network, API, database or runtime Python.
- Research-only visitor pages (noindex WebPage schema; no parking maps): /upper-peninsula-waterfalls/research/upper-silver-falls-herman-geographic-review/ and /upper-peninsula-waterfalls/research/alger-falls-highway-parking-review/. Existing Mill Pond noindex page updated with source distance comparison.
- Reconciliation, inventory ledger, geographic research popup access reviews and deterministic source-review queue updated. Each of #68 and #213 now has six explicit source access gates and a rule against invented parking, access and routes.
- No new indexable public falls; 74 curated, 67 exact GIS, 94 pending unchanged. Sitemap unchanged.

## Release gates

1. Python: python3 scripts/build-up-waterfall-identity-proof.py --check
2. Queue: node scripts/build-up-waterfall-review-queue.mjs --check
3. Source tests: node --test tests/up-waterfalls-issue1258-b60-identity-proof.test.js and existing B20/B54/B59.
4. Full npm run verify:all; waterfall Chromium/mobile/map smoke, name SERP and Vercel, exact production release SHA.
5. None of the 3 may be promoted without source-owner legal route and parking proof; Alger requires site-specific current MDOT safety evidence, Upper Silver signed legal parking/walk/season rules, and Mill Pond original GNIS/parcel identity review.

## Original evidence

Michigan state waterfall GIS: https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7

City of Munising adopted plan: https://cityofmunising.org/wp-content/uploads/Munising_RecPlan_Adopted_2024.pdf

Alger County plan: https://cms2.revize.com/revize/algercounty/document_center/Dashboard/Plans/Alger%20County%205-Year%20Recreation%20Plan%202024-2029%20%28final%29.pdf

MDOT general FAQ: https://www.michigan.gov/mdot/about/faqs/general/common

Upper Silver independent survey: https://www.waterfallsofthekeweenaw.com/silver-river/upper-silver-falls/

Upper Silver second waypoint: https://waterfallhikes.com/waterfalls/upper-silver-falls-near-l-anse-in-mi

Lower Silver picnic feature: https://upperpeninsulawaterfalls.com/baraga-county-waterfalls/silver-falls-lower.html

Mill Pond GNIS-derived sources are listed in the identity evidence file and prior B54 review.

No traffic or CTR lift is claimed by improved research accuracy alone.
