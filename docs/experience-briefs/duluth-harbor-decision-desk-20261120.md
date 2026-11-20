# Duluth Canal Park: two-horizon harbor decision desk

Date: 2026-11-20
Mode: Experience Investment IMPLEMENT, with read-first review
Owning repository: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/duluth-canal-park/
Authoritative page: public/duluth-canal-park/index.html
AIS client: public/assets/duluth-canal.js
Search presentation: scripts/tune-duluth-discovery.mjs

## Visitor job and measured evidence

A visitor searching for the Duluth ship schedule wants to know whether a freighter is approaching the Aerial Lift Bridge, whether later vessels are expected, and where to watch from a camera or public shoreline.

GSC Web, last-12-months export dated November 20, 2026: 6,214 impressions, 34 clicks, 0.55% CTR, average position 9.68 for this canonical. Against the November 9 export, the cumulative page gained 3,045 impressions and 18 clicks (0.59% marginal CTR). Sitewide queries in the same export include "duluth ship schedule" (525 impressions, 0 clicks), "duluth shipping schedule" (520, 2), and "duluth canal cam ship schedule" (387, 0); query impressions are sitewide, not page-attributed. These historical rows do not prove the November 9 source changes raised or lowered CTR. Sources: the user's November 20 and November 9 Google Search Console sheets.

Source baseline on main at task start: November 20 latest page has near-term AIS watch card, separate published Harbor Lookout fallback, 19-camera network, a vessel map and three shore choices. The build tuner already emits the query-matched title "Duluth Ship Schedule Today & Live Cams | Chris Izworski"; repeating a title rewrite is not the investment. Public rendered baseline checked through search text extraction; 390px and desktop screenshots NOT CAPTURED.

External context checked November 20:
- https://canalpark.com/duluth-ship-schedule/ links expected arrivals and webcams, but puts substantial explanatory content before the actual schedule handoff.
- https://lsmma.com/content.aspx?club_id=605134&module_id=524613&page_id=22 offers operator camera feeds.
- https://harborlookout.com/ is an independent published maritime arrivals/departures forecast, not an AIS-confirmed bridge-passage guarantee.

## Three considered opportunities

1. Live versus later confusion: visitor may read a quiet AIS watch as meaning no vessels are scheduled. Reuse the separate published forecast link and the live AIS card; invest now. Cost: small/medium. Risk: accidentally equating a published forecast with verified passage.
2. Mobile first-screen scroll cost: long lede, four toolbar buttons and separate schedule block push the live answer down. Recompose existing elements, not the underlying data engine. Cost: small. Risk: disrupting map hooks or no-JS actions.
3. Camera and shore handoff: a selected near-term ship exposes map and video actions but not the three existing shore options. Add a shore choice preserving map failure fallback. Cost: small. Risk: a map-only action would fail when Leaflet is unavailable.

## Two credible design concepts

**A. Two-horizon harbor desk, selected.** On phones, place the live supported watch first, immediately followed by the separate published forecast. Show navigation/refresh controls after both answers rather than before. On desktop, arrange live watch and later published schedule alongside one another as two deliberately different evidence horizons. The camera and shore actions remain tied to the existing map and media. A missing AIS feed does not erase the published forecast.

**B. Watch-mode tabs, rejected.** Let visitors switch between live ships, expected later arrivals and camera view. It could prioritize a selected use case and reduce visual density, but risks hiding the static schedule fallback, requiring more JavaScript for a simple decision, and increasing no-JS/search-content uncertainty. It also does not eliminate the source distinction that matters most.

## Distinctiveness comparison

Closest site tools: Soo Locks (schedule-led operational hub) and Great Lakes Freighter Tracking (lake-wide spatial AIS explorer). This is neither a ship schedule table nor a map-first tracker. It shows two side-by-side evidence horizons on desktop, a live-first sequence on phone, and a direct shore/camera choice for the selected Canal Park passage. Purposeful reuse: AIS freshness, camera provider, map markers, confirmed publisher identity and same site navigation.

## Change and safety

- Static HTML/CSS organizes the near-term card and published forecast together and removes pre-answer toolbar clutter on mobile. No third-party dependency or new API.
- Existing live card now offers "Choose a shore view" to focus the existing three map spots, with fallback to the static shore list when map layers are unavailable.
- Generated meta description explicitly separates a near-term AIS-supported passage from independent later published arrivals; existing title and canonical remain unchanged.
- Preserve AIS candidate rules, 30-minute validity, Harbor Lookout limitations, actual camera provider, map source/attribution, legal public access, no-JS external links, Person @id, AdSense loader policy, and all existing user-facing detail.
- Avoid guaranteed schedule/bridge/opening claims. No new indexable page or intent competing with the existing Duluth canonical.

## Visitor replay scenarios and proof limitations

1. Fresh near-term AIS candidate: named vessel/window is shown before general navigation; three relevant next actions lead to its map position, camera, or shore choices.
2. Fresh feed without candidate: page explicitly says the absence of a supported passage is not zero traffic; independent published forecast remains visible.
3. AIS fetch fails: source does not promote stale timing; published forecast and camera operator links remain available.
4. Leaflet/tiles missing: "Choose a shore view" scrolls to the public shore cards instead of doing nothing.
5. No JavaScript: embedded live forecast link, operator camera link, official visitor center details remain available.
6. Desktop/phone: desktop is a two-horizon split; <=700px is single-column and live-first. Actual 360/390/768/1280/1440 browser acceptance NOT VERIFIED.
7. Selected ship map, camera/network, and A to B to A: existing behaviors preserved in source; browser replay NOT VERIFIED.
8. Reduced motion and page overflow: scoped CSS avoids new animation, but actual screenshots and measured layout NOT VERIFIED.

Proposed checks: `node --test tests/duluth-harbor-decision-desk.test.js tests/duluth-canal.test.js tests/duluth-source-date-build.test.js` and complete `npm run verify:all`. Full exact-head PR CI, responsive screenshots, live map tiles, loaded video, freshness and public deployment are NOT VERIFIED until observed.

## Measurement

Keep the generated title fixed during the test. Record a fully matured, comparable 28-day GSC Web page-filtered and query-filtered period before and after deployment, by device and average position; separate impression growth from CTR, and compare with Soo Locks/other shipping demand. Search Console updates are not causal proof. A useful post-release outcome is an increase in qualified organic clicks and successful selection of the live-watch, later-schedule and shore/camera actions. Actual GA4 engagement, AdSense revenue and CTR lift: NOT MEASURED.

**Exactly one next action:** run exact-branch full CI and responsive browser checks, fix failures, then request review of the PR without merging.
