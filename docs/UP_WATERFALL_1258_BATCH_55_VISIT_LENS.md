# Upper Peninsula Waterfalls — Issue #1258 B55 / Visitability Lens
Reviewed November 2, 2026. This is an improvement to the existing indexed 72-stop Waterfall Explorer, not a new waterfall or an opening-status feed.

## Highest-value defect fixed
The tool formerly showed a 72-card list and map with scattered access notes, but visitors still had to reconcile the intended date, full visit time and road restrictions. The generic access filter also treated a research-only record as a non-closed visitor destination. This release introduces a source-restricted, conservative **Visitability Lens** above the map while preserving all curated content and the original search.

## Visitor behaviors
- Pick a U.P. region, max **on-site** visit time (30/60/90/180/unbounded) and travel date. The upper end of a recorded `N–M min` range must fit. Unknown durations cannot become 30-minute outings.
- Three source-backed candidate cards explain what requires verification, link the original arrival source and focus the existing CARTO waterfall pin without claiming the point is a vehicle arrival.
- On a Dec. 10 date, Bond Falls warns that usual vehicle access is mid-May–mid-October. MDOT-source parks warn that most roadside parks close in late October, with their exact gate still unknown. Porkies winter warnings are scoped to published road segments; they do not declare all park roads closed. Known closed/research-only profiles are not suggested.
- A saved stop repeats visit-date access cautions. The main status filter no longer treats research-only records as non-closed public outings. Research map points have distinct gray pin color.
- No-JS fall cards, original source links and the existing map/list/shortlist remain intact.

## Primary access and interpretation sources
- DNR Porcupine Mountains winter roads: https://www.michigan.gov/recsearch/parks/porkies
- DNR Bond Falls visitor access: https://www.michigan.gov/recsearch/parks/bondfalls
- MDOT dated roadside notice: https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/10/15/mdot-roadside-parks-set-to-close-for-season
- USFS Black River corridor works: https://www.fs.usda.gov/r09/ottawa/alerts/black-river-waterfall-platforms-and-trails-undergoing-major-repairs
- NPS Munising Falls trail closure: https://www.nps.gov/places/munising-falls.htm
- DNR Gooseberry Falls self-tour time-range pattern (comparison only): https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html

No agency confirms an "open now" status for the entire collection. The 2026 road notices must be rechecked for future years; date-based cautions are not a durable schedule of opening and do not authorize a private road.

## Engineering and unchanged contracts
- New dependency-free `public/assets/up-waterfalls-visit-lens.js` with stable selected fall ID, source caution scope, and no new network feed.
- Small targeted hub HTML and CSS updates; map ID handoff, saved-stop caution, safe research status filter/pin.
- Tests `tests/up-waterfalls-visit-lens.test.js` plus live Chromium scenarios in the existing waterfall smoke suite (Wagner 30-minute, Bond winter warning, selection reversibility, 360/768/1440 overflow and no JS).
- No changes to waterfall data (72 curated, 70 current indexed ItemList entries), maps' underlying points, public research count (97), sitemap, canonical, Person schema, ads, Redis, Supabase or separate tool owners.
- Experience brief, state matrix and draft release evidence under `docs/experience-briefs/`.

## Release gates
Run full repository gate, waterfall smoke, name SERP protection, Vercel preview and exact emitted page/canonical audit; inspect actual mobile screen and source warnings. No merge with red check. Track actual merged SHA and public production behavior separately. No claimed traffic or CTR uplift.

## Next investment after release
Meaningful expansion should focus on land-manager official route/access records or routinely refreshed closure observations for the most visited locations, not auto-promoting raw waterfall GIS. Avoid unobserved river-to-waterfall flow claims.

## Screenshot-derived critical map repair
The November 2 desktop screenshot of the pre-fix hub showed literal `API KEY REQUIRED` watermark tiles although the old Chromium test passed solely by finding CARTO tile `src` URLs. The previous waterfall map called CARTO `light_all` without the 2026-required public key. B55 now reuses the **existing** same-origin public `/api/carto-basemap-config` endpoint, which reads `CARTO_BASEMAP_PUBLIC_KEY` from Vercel, then builds keyed CARTO tile URLs at runtime. Browser test does not print or bundle the key. If config cannot be fetched in the static Chromium server or the tiles error, it renders an OpenStreetMap raster fallback with attribution and explicit status. The browser now requires **loaded** image content (`naturalWidth>=200`) rather than a tile `src` alone. This fixes a real base-map readability defect; the waterfall point remains a natural-feature locator, never parking. No key or token was added to source control.
