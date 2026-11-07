# Upper Peninsula Waterfalls B78 · Wildcat Falls owner-map reconciliation

Reviewed November 7, 2026. **Online sources only; no emails, public tips or verification requests.** Editorial and data changes are in the source-controlled site.

## What crossed the evidence threshold

Northwoods Alliance's current public-facing Wildcat Falls visitor page gives the legally relevant owner, permanent non-motorized public access, public-road approach and a **yellow-marked approximately ¾-mile trail**. We inspected two owner map images exposed by that page: `1withlegend.jpg` illustrates the waterfall parcel and road west of County Line Lake Road; `Slide2.jpg` explicitly marks **FALLS** at the western end of the red illustrated trail, **ROCK FACE** along the north leg and **TRAIL HEAD** at County Line Lake Road. Neither image is a GIS-exported or measured polyline.

The [Western U.P. Visitors Bureau brochure #29](https://explorewesternup.com/wp-content/uploads/2026/04/WaterfallMapBro_2022_Drft6-opt.pdf) independently names Wildcat Falls on Scott and Howe Creek and gives **46.346173, -89.292236** as an approximate *waterfall natural-feature* coordinate. The bureau repeats the owner's visitor-road approach and 0.6-mile McGinty Lane offset. These sources reconcile feature identity and the broad western parcel geography, but **do not establish a surveyed safe waterfall viewpoint or approved car-parking GPS**. The coordinate is published strictly as a source-attributed approximate natural feature.

Verified source axes: (1) land manager Northwoods Alliance, (2) public trail permission, (3) owner-published permitted roadside visitor arrival by road and sign, (4) owner-illustrated yellow walking trail with falls and trailhead labels, (5) regional natural-feature coordinate concordant with owner-described creek and map parcel. Live road conditions, plowing, occupied shoulder and exact route geometry are deliberately unknown.

## User journey

The field guide gives a decision before the map, distinguishes lake parcel versus waterfall trail, tells users to use US-45 → CR-206 (Sucker Lake Road) → County Line Lake Road → approximately 0.6 mile beyond McGinty Lane, then the **marked trail sign on the left**. Never route a car to waterfall pin; do not fabricate an exact lot, parking marker, walk polyline, trail grade, accessibility or one-way distance for the owner's ¾-mile number. Published waterfall pin is not suitable for driving navigation.

The page includes author identity, indexable canonical, social tags, visual map, linked source evidence, careful winter caveats, cross-links into Bond/Kakabika and the hub. The map contains one approximate natural-feature pin. Reuse existing CARTO/Leaflet and ad protections.

## Historical conflict

Older [commercial directions](https://upper-michigan.com/guide/waterfalls/wildcat-falls.html) and inherited federal text report no trail and tell visitors to bushwhack from a creek crossing. The land manager's trail construction and 2020+ visitor guidance supersede that route; **never republish the old navigation advice**. The trail manager also warns that its separate County Line Lake boat access is not the Wildcat Falls trail entrance.

## Inventory and release requirements

79 curated destinations, 69 exact state-GIS matches, 92 unreconciled GIS candidates, 14 curated without exact source GIS match, 77 indexable waterfall guides, 70 Python nearby eligible and 9 excluded. No new or invented state GIS OID. Preserve noindex protections for blocked cases.

Release needs exact-head `npm run verify:all`, `python3 scripts/build-up-waterfalls-nearby.py --check`, `node scripts/build-up-waterfall-review-queue.mjs --check`, waterfall mobile-map smoke, Name SERP, sitemap dates and actual generated HTML/preview READY. Merge then verify Vercel production build SHA and live canonical/map guide.
