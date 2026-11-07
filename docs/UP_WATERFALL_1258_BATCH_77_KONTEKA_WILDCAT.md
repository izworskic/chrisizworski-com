# U.P. Waterfalls · B77 source audit: Wildcat Falls and Konteka journey

Reviewed **November 7, 2026**. Online research only, with no emails, drafts, agency contact or visitor verification requests.

## Wildcat Falls · immediate next eligible public guide

**Northwoods Alliance** owns and manages the Wildcat Falls Community Forest near Watersmeet and explicitly states it protects permanent **non-motorized public access**. Its visitor instructions describe the signed waterfall trail and legal arrival in detail: US-45 north of Watersmeet, County Road 206 / Sucker Lake Road west, then County Line Lake Road north. The yellow-marked waterfall trail begins on the west side of County Line Lake Road at a sign about **0.6 mile north of McGinty Lane**. Roadside parking is described on the road, not at a surveyed lot coordinate. The yellow-marked trail is described as **three quarters of a mile**, with difficult uneven footing; the owner does not say whether that number is one way or round trip. The owner asks visitors to respect neighboring parcels and prohibits off-road motor vehicles, campfires and collection of stone, wood or plants.

**Source:** [Northwoods Alliance owner and visitor guide](https://www.northwoodalliance.org/wildcat-falls).

A regional waterfall brochure identifies approximate **natural-feature** coordinates **46.346173, -89.292236** for Wildcat Falls on Scott and Howe Creek. This is not an official trailhead, parking reference, footbridge, or surveyed legal visitor route. The independent [regional brochure](https://explorewesternup.com/wp-content/uploads/2026/04/WaterfallMapBro_2022_Drft6-opt.pdf) supports geography, but the owner map and this coordinate are not yet independently reconciled.

An [older commercial listing](https://upper-michigan.com/guide/waterfalls/wildcat-falls.html) says there is no marked trail and advocates bushwhacking. **Do not follow those directions**: they contradict the current management organization's published yellow-marked trail. Also do not confuse the separate community-forest lake parcel at McGinty Lane or the public DNR boat access with the waterfall trailhead itself.

**Publication gate:** owner, non-motorized access, marked arrival road and walking trail pass. Precise waterfall feature identity and placement remain pending a second concordant, location-specific source, so do not add a current public map marker, SEO guide, 79th destination, navigational car link or Python nearby record yet. Do not invent a parking GPS waypoint, live road condition, mapped hiking polyline or seasonal closure.

## Konteka (Peanut Butter) Falls · one outing, two separate geographic features

The existing **O Kun de Kun Falls** public destination is the correct primary page and visitor parking for the hike. The NCTA's Segment 22 source describes **Konteka Falls upstream** of the larger O Kun de Kun waterfall and separately locates the public US-45 trailhead. [Visit Keweenaw](https://www.visitkeweenaw.com/blog/post/a-fall-day-trip-to-o-kun-de-kun-falls/) calls the smaller upstream feature Peanut Butter Falls and describes the two waterfalls on the same trail. [Waterfalls of the Keweenaw](https://www.waterfallsofthekeweenaw.com/baltimore-river/konteko-falls/) uses the spelling *Konteko* and supplies approximate natural-feature coordinates **46.64996, -89.15506**. That point is not an officially mapped trail segment or parking location.

This B77 change improves the existing O Kun de Kun guide, synchronizes the hub summary and trail length, adds a second role-labeled falls marker to the optional detail map, and retains **78 curated destinations / 76 waterfall sitemap guides**. It does not build a duplicative destination page, add a second driver arrival, or encourage descending the riverbank.

## Release gate

Run exact-head `npm run verify:all`, `python3 scripts/build-up-waterfalls-nearby.py --check`, `node scripts/build-up-waterfall-review-queue.mjs --check`, waterfall mobile/map browser smoke, canonical/Person/schema checks, name-SERP protection, and preview READY before merge. The optional extra map pin must never be described as parking, navigable by car, a public path, or a surveyed safe viewpoint. Independently confirm production HTML after deployment.
