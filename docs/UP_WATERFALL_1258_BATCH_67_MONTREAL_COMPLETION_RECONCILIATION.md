# Issue #1258 — Batch 67: Montreal Corridor is reportedly complete, but waterfall visitor routes are not verified

**Investigated:** 2026-11-05. **Outcome:** Correct B66's overly certain statement that the *east-bank corridor is under construction* by explicitly recording conflicting operator and regulator sources. Maintain both Lower Montreal #139 and Upper Montreal #140 as **research-only, noindex**, with no visitor parking pin, trail polyline, drive destination, opening status, sitemap entry or new public waterfall card.

## What changed in authoritative published information

1. [Copper Harbor Trails Club homepage](https://www.copperharbortrails.org/) now states **"Montreal Segment of the Keweenaw Point Trail is Complete"**, says 30+ miles connect to remote east-Keweenaw landscapes, and announces a June 26, 2027 completion celebration. There is **no dated completion timestamp** on this announcement, no official parking address, and no endpoint-specific Upper or Lower Montreal Falls walking line.
2. [The same builder's detailed Keweenaw Point Trail project story](https://www.copperharbortrails.org/kpt) still describes the 2026 Montreal Corridor in future tense: it **will create** first sustainable permanent access to Upper and Lower Montreal Falls. This may be stale relative to the homepage, but cannot establish an as-built signed waterfall route.
3. [Michigan DNR's current project-updates page](https://www.michigan.gov/dnr/managing-resources/prd/key-project-updates) says the Montreal Corridor is **underway** through the 2026 season on the east bank; its [dated July 22, 2026 map](https://www.michigan.gov/dnr/-/media/Project/Websites/recsearch/documents/MapsI-N/KeweenawPointTrailsMap.pdf?hash=B5CF668B5EB28B028366E0D43202FDCD&rev=7c639c3716eb42a5bf0005dfeec252b6) labels **RTPD-approved** corridors, not verified post-completion trailhead-to-falls access. Do not downgrade the club's newer completion signal merely because DNR has not synchronized its project page.
4. [CHTC's trail-status page](https://www.copperharbortrails.org/trail-status) mixes a current-ish October 23 maintenance paragraph with an older May 18, 2026 trail-by-trail snapshot. It does not certify named Montreal Falls parking, safe waterfall spurs or November 2026 opening. [CHTC maps and guides](https://www.copperharbortrails.org/maps-guides) provide a map portal; absent a source-verified as-built route and access point for each fall it should not become a guessed visitor itinerary.
5. [Visit Keweenaw Fish Cove route](https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/) and the [2024 DNR/TNC Hoar Lake alternate reported in local media](https://www.kbear102.com/2024/09/30/michigan-dnr-and-the-nature-conservancy-locate-public-access-route-for-the-montreal-falls/) remain separate *historically documented* public approaches. [KORC's west-bank proposal](https://www.keweenawoutdoorrecreation.org/calls-to-action-montreal-falls-trail-access) and private Smiths-Fisheries gates do not become public by the east-bank completion report.

## Decision matrix as of review

| Issue | Lower #139 | Upper #140 |
| --- | --- | --- |
| Waterfall identity | State GIS and firsthand point within ~7m | GIS / firsthand point ~267m apart, secondary upper cascade confusion |
| New east-bank trail | Builder homepage says complete; official endpoint and parking unverified | Same; no independent signed spur to exact upper waterfall |
| Existing historic walk | Published difficult Fish Cove ~1mi and alternate Hoar Lake ~1.3mi | Neither is individually proven to the mapped upper cascade |
| Current November 2026 arrival | No live authority road/parking/gate confirmation | No live authority road/parking/gate confirmation |
| Publish as visitor destination | **NO**: research-only, noindex | **NO**: research-only, noindex |

**Technical changes:** added source/conflict decision fields to `data/up-waterfall-montreal-access-evidence.json`, reconciled both existing noindex research pages, and added B67 regression tests checking proof gates, exact operator sources, no premature public route promotion, and SEO identity safety. No inventory count changes: 75 curated, 68 GIS-linked, 93 pending under B65/B66 baseline.

**Next decisive proof:** published operator or Michigan DNR *as-built route and trail status* from a **legal parking/arrival point** to each waterfall, and seasonally appropriate closure/gate status, all tied to the correct geospatial waterfall. Do not ask visitors to supply access proof; do not infer it from a celebratory construction headline. 
