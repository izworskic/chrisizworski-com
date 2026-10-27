# Lake Superior Provincial Park Explorer — release evidence and maintenance

Date: October 26, 2026 (Eastern). Owning repository: `izworskic/chrisizworski-com`. PR: #1220.

## Reader decision and search-intent boundary

This page answers **which Lake Superior Provincial Park stop or walk fits my time, effort, mobility needs, driving direction, and official access constraints**. It does not compete with the 31-stop international Lake Superior Circle Tour for multi-day driving itineraries. The Circle Tour stop #15 links to the park explorer and the park page links back. Standalone canonical: `/lake-superior-provincial-park/`.

## Official access source ledger

Primary references: Ontario Parks official park activities, maps, facilities, operating dates and alerts; Ontario government's Lake Superior GeoTour PDF; official Lake Superior park management plan. Access research snapshot: 2026-10-26. See `public/assets/lake-superior-provincial-park-access.json` for the 13-record source-backed ledger with typed evidence.

- Six **official site/area positions** appear on the map. None is individually certified as a parking-stall coordinate. Do not present a place marker as permission to park or to enter.
- The five remaining visitor-relevant trailheads — Pinguisibi/Sand River (Hwy 17 km 1090.6), Orphan Lake (1080.8), Awausee (1101.4), Trapper's (1074.3), and Crescent Lake (1113.8) — have official highway access references but no invented trailhead GPS pin.
- Agawa Rock pictograph-site waypoint is culturally sensitive and closed for the 2026 season; map uses red site marker but never routes there. Trapper's Trail is seasonally closed. Gargantua Road is closed until further notice. Seasonal day use ended October 25, 2026; current 2026 itinerary recommendations are disabled.
- The explorer's route-preview links are future-season only, between official *destination* coordinates, and withheld when the source-ledger review is older than 30 days. They never assert available parking, current access, or an invented ETA.
- A short easy-rated walk is **not** treated as a wheelchair-accessible trail; the Visitor Centre is the only card tied to specifically confirmed barrier-free *facility* information.

## Photographic evidence

`public/assets/lake-superior-provincial-park-photos.json` records the author, direct Wikimedia Commons file page, reuse license, human-reviewed location match, accessible alternative text and published image URL for seven key cards. Two genuine shoreline images lead the hero. Old Woman Bay, Katherine Cove, Nokomis and nearby Agawa Bay beach are CC0; Agawa Rock Trail and Orphan Lake vista are CC BY-SA; the Sand River hike is CC BY. Every published photo visibly credits its source and license. The Visitor Centre's photograph is explicitly *nearby Agawa Bay beach*, **not** a claim that the building appears.

Do not insert synthetic or nearby-but-mislabeled photographs in Awausee, Trapper's or Crescent cards. Their informative text, access rules, routes and source links stand independently.

## Verified viewport and source QA

- CI browser run: https://github.com/izworskic/chrisizworski-com/actions/runs/40438902850 — **PASSED** on feature branch after local Leaflet repair and correct disclosure of filtered/closed cards during image QA. Dedicated source benchmark: **42/42** on that run.
- Chromium actual 390 px viewport: all hero images and seven card images load; no horizontal overflow, six visible park site pins, six rendered OpenStreetMap fallback tiles, map popup and future/current season safeguards.
- Chromium actual 1366 px viewport: no horizontal overflow; eight rendered fallback tiles and six park pins; all seven card images load; popup and route guards pass.
- No-JS: ten substantive destination cards and six official source links remain in HTML. Screenshots/artifact: https://github.com/izworskic/chrisizworski-com/actions/runs/40438902850/artifacts/12705022651.
- Vercel preview deployment for branch reported READY, but is Vercel-auth protected. The **local production-source Chromium verification** above was used instead of claiming authenticated preview screenshot checks.

## FIELD_GUIDE_V1 scored assessment against inspected mobile, desktop and map screenshots

| Area | Weight | Earned | Evidence / limitation |
|---|---:|---:|---|
| Authentic destination imagery | 20 | 16 | Seven accurately identified images with rights and credits; three minor hikes intentionally text-only |
| First-screen clarity | 15 | 12 | Clear opening action and two-photo hero; mobile tool panel begins below access advisory |
| Useful decision handoffs | 15 | 15 | Route/time/effort decisions; official source links; closures excluded |
| Mobile and accessibility | 15 | 15 | Real 390 px QA; no horizontal overflow; explicit accessible-facility distinction |
| Map reliability | 10 | 10 | Local Leaflet, six source positions, six/eight OSM fallback tiles, popup interactions |
| Data / licensing | 10 | 10 | Government coordinates, dated status, rights and attribution, no imaginary parking GPS |
| Performance / resilience | 10 | 8 | JS-free core information and map fallback; remote Commons images still require connectivity |
| Search / integration | 5 | 5 | Unique stop-level intent; Person-linked schema, self canonical, sitemap, tool registry, Circle Tour links |
| **Total** | **100** | **91** | Every category >=4/5; scoring is based on the actual CI screenshot/run, not a theoretical design |

**Required merge gates:** final exact-head `npm run verify:all`, Circle Tour and title/indexing benchmarks, emitted HTML canonical and sitemap audit, authentic photo references, site ads loader enforcement through the existing shared build (no ads setting changes), and production deploy smoke. Do not merge if any is red.

## Updating for the next season

When Ontario Parks publishes a new operating season:
1. Read the official park operating dates, current alerts, and trail-by-trail notices. Update the dated source catalog and clearly flag changes; never simply change `researchedAt` without actually checking sources.
2. Reevaluate 2026 closed flags individually only with an explicit official reopening notice. Preserve historical closures as dated context.
3. Update HTML static access snapshot and initial season options so no-JS remains correct; align planner and `map.js` logic with the same source decision. Do not infer seasonal open state from weather.
4. Run the full benchmark and real Chromium phone/desktop map test, inspect map tiles and actual image loading, and verify Google chosen canonical and new GSC search-intent impressions after release.

Single post-release priority: official 2027 reopening and access evidence refresh before presenting any trails as current-season options.
