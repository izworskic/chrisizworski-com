# Issue 1258 Batch 32 — Big Eric's Bridge campground visitor waterfall
Reviewed October 31, 2026. Online-only, no outreach or messaging.

## Five source checks and route decision
- Michigan DNR official [Big Eric's Bridge State Forest Campground](https://www.michigan.gov/recsearch/sfcampgroundsa-m/BigEricsBridge) is a real publicly operated campground, 21 rustic sites and Huron River access, **not merely a private old logging bridge**. Its published campground position is 46.86508482,-88.08476906, via Skanee and Erick roads ~6.7 miles east of Skanee. Recreation Passport for vehicles; live campground road/gate status not established. Official state tourism: https://www.michigan.org/property/big-erics-bridge-state-forest-campground.
- [Independent waterfalls specialist](https://www.waterfallsofthekeweenaw.com/huron-river/big-ericks-falls/) identifies **Big Erick's Falls** at 46.86505,-88.08267, about 33m from Michigan GIS #126 at 46.864777,-88.082503, below Huron River bridge. It describes campground-side short riverside path and designated parking opposite campground. This is historical field evidence, **not a parcel map** for unlimited downstream travel. No rock-bed walking, river ford or private bank extension.
- [County tourist context](https://www.baragacountytourism.org/attractions) identifies Big Erick's Bridge state campground but has stale site count 20; current DNR lists 21, authoritative.
- Distinguish separate GIS #114 **Erick's Falls on West Branch Huron River** upstream, different bridge, no independent public parking/right-of-way authorization; this is not an additional linked attraction just because of same-name resemblance. Specialist https://www.waterfallsofthekeweenaw.com/west-branch-huron-river/ericks-falls/.
- Map marks *natural falls*, not parking. The DNR campground coordinates and signed entrance are given only as official facility arrival.

## Engineering
Full HTML-first interpretive visitor page `/upper-peninsula-waterfalls/big-erics-falls/`, canonical, Person/WebPage/TouristAttraction/Breadcrumb JSON-LD, CARTO map, five source axes, visitor choices, seasonal gate and bank caution; integrated hub/search/filter/save/arrival, sitemap, 161-GIS crosswalk, review queue, regression, existing template and ads untouched.
**After batch: 69 curated, 64 exact GIS linked, 97 pending, 68 sitemap URLs including hub**. PR remains draft/unmerged pending latest-head full verification and real browser smoke; GitHub file readback alone is not CI.
