# U.P. Waterfall Inventory · Issue #1258 · Checkpoint B01/B02
Reviewed: October 28, 2026
Working branch: `feature/up-waterfalls-1258-batch01-20261028`
Source of truth: [issue #1258](https://github.com/izworskic/chrisizworski-com/issues/1258)

## B01 — Recover three abandoned Porcupine Mountains guides
The authorship in older PR #1226 is reused **only** for Greenstone Falls, Nonesuch Falls and Little Union Gorge Falls, on current main. Superior Falls is preserved from the newer main. Existing design, ad scripts, canonical identity, map and filters remain unchanged.

- **Greenstone, Michigan GIS #98.** Michigan DNR park land and Little Carp River Road signed trailhead; approximately two miles round trip on Little Carp River Trail; nearby Overlooked Falls is a different feature. USGS geographic correspondence is about 40 m; this is not public access evidence.
- **Nonesuch, Michigan GIS #108.** Michigan DNR park land. Nonesuch Mine public walking trail and DNR published N46°45.583′ W89°37.194′ parking waypoint. Distinguish actual trailhead from falls coordinate. The former mine area is not an invitation to climb ruins or enter shafts. USGS V2 match is displaced approximately 262 m; retain identity review flag.
- **Little Union Gorge, Michigan GIS #117.** Michigan DNR park land; interpretive Union Mine Trail is a one-mile loop from signed west-side South Boundary Road parking. USGS V2 match is displaced approximately 529 m; retain identity review flag.

For all three, DNR warns that sections of South Boundary Road close to vehicles from December 1 through late spring. This is a *published seasonal rule*, not a same-day trail status. Do not route visitors to mapped waterfall coordinates as parking.

Evidence: https://www.michigan.gov/recsearch/parks/Porkies ; https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf ; https://www.uptravel.com/listing/greenstone-falls/1697/ ; https://www.michigantrailmaps.com/member-detail/porcupine-mountains-nonesuch-mine-trail/ ; https://explorewesternup.com/things-to-do/waterfalls/ ; https://doi.org/10.5066/P9QQTKA0 .

## B02 — Make geographic reconciliation resumable
`data/up-waterfall-inventory-ledger.json` now enumerates all 161 curated named GIS research features and eight additional curated destinations with no confirmed stable ID match within that extract. It records county, watercourse, point coordinates, source provenance, editorial classification, current-status uncertainty, parking/trail evidence if independently available, and scientific hydrography comparison separately from public visitor rights.

**Counts:** state source 197 total features; 161 named geography candidates in this filtered U.P. subset; 40 curated destinations; 32 exact GIS-ID matches; 129 unmatched state records; eight curated without that GIS correspondence. The 113 USGS geographic crosswalks are *not* 113 visitor pages. Nine same-name source-ID pairs remain ambiguity flags, not auto-merged duplicates. These counts do not constitute all physical waterfalls in Michigan.

## B03 — Next small verification batch, NOT pre-approved for publication
Begin with **Overlooked Falls (#97)** from the Little Carp River trail, and **Trap Falls (#118)** via the Government Peak Trail. Both have named visitor trails in Michigan DNR material, but each still needs explicit legal route, parking and trail effort evidence before a guide can be indexed. Queue **Nonesuch-area Little Iron Falls (#106)** as a possible identity/alias review, not an automatic second destination. Then inspect nearby Western U.P. groupings and Michigan GIS same-name collisions.

Outstanding: 16 Ontonagon and 24 Gogebic research-only identities in this ledger, plus other counties. Work in source-verified small groups rather than generating hundreds of thin pages.

## Release checklist
- [x] Recover three useful existing visitor guides; preserve all 37 previous destinations.
- [x] Update HTML map cards, source-backed arrival fields, structured ItemList and waterfall sitemap.
- [x] Record 161 GIS candidate decisions plus eight unmatched curated entries, without inventing parking.
- [x] Add automated indexing, hydro-correlation and conservation tests.
- [ ] Full latest-head repository verification + waterfall browser/mobile checks.
- [ ] Vercel preview and production deployment reviewed.
- [ ] Merge only after exact-head gate passes; verify live routes afterward.
