# Issue #1258 — Batch 66: Montreal Falls access is published, but not a current route guarantee

**Investigated:** November 5, 2026. **Disposition:** keep Lower Montreal GIS #139 and Upper Montreal #140 research-only, noindex and off visitor routing, but correct the prior overly broad impression that *all* public approaches were closed. Published seasonal approaches exist. We did not determine an exact current November 2026 road/parking/gate state or a certified walking line.

## Most useful new source distinction

1. **Existing Fish Cove approach:** Visit Keweenaw's [2023 detailed guide](https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/) directs from Copper Harbor via Mandan Road and Hoar Lake/Fish Cove Road to a rustic lot; about a mile of **unmarked, unmaintained** shoreline walking reaches **Lower** Montreal. The [2026–27 visitor guide](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_Visitors_Guide_20260407_HIGH_23713277-83e7-418f-aab3-34c51d92bb6f.pdf) continues listing Montreal Falls as a challenging hike via Mandan Road to Fish Cove. DNR's [current project updates](https://www.michigan.gov/dnr/managing-resources/prd/key-project-updates) expressly link to Visit Keweenaw's *existing* Montreal Falls visiting guidance. This is a **published seasonal route**, not current road-status surveillance or exact parking GPS authorization.
2. **Different historic DNR/TNC public alternative:** [September 2024 local reporting](https://www.kbear102.com/2024/09/30/michigan-dnr-and-the-nature-conservancy-locate-public-access-route-for-the-montreal-falls/) attributes to DNR/TNC an alternative via Hoar Lake Loop and an unnamed forest road: vehicles stop before berms and hiking was described as 1.3 miles to the river mouth. [TV6 reporting](https://www.uppermichiganssource.com/2024/09/25/keweenaw-outdoor-recreation-coalition-community-build-new-waterfall-trail/) identifies it as public through TNC/State lands. This account and the Fish Cove rustic-lot account **must not be conflated into a fabricated single parking point or trail line**.
3. **Private Smiths-Fisheries Road is not a workaround.** [TV6](https://www.uppermichiganssource.com/2024/09/25/keweenaw-outdoor-recreation-coalition-community-build-new-waterfall-trail/) documents the private-road access problem; historic specialty-guide instructions cannot override private gates.
4. **Proposed KORC west-bank parking/connector:** KORC's [2026 permit appeal](https://www.keweenawoutdoorrecreation.org/calls-to-action-montreal-falls-trail-access) and [March 2026 reporting](https://www.uppermichiganssource.com/2026/03/27/recreation-coalition-requests-dnr-take-action-keweenaw-trail-project/?outputType=amp) still describe **pending** approval for *new* west-side facilities, not a completed trailhead.
5. **Separately approved/under-construction east-side Keweenaw Point Trail:** DNR [project updates](https://www.michigan.gov/dnr/managing-resources/prd/key-project-updates) and Copper Harbor Trails Club's [2026 Montreal Corridor statement](https://www.copperharbortrails.org/kpt) describe ongoing east-of-river construction toward **future** purpose-built access to both waterfalls. The [DNR July 22, 2026 trail map](https://www.michigan.gov/dnr/-/media/Project/Websites/recsearch/documents/MapsI-N/KeweenawPointTrailsMap.pdf?hash=B5CF668B5EB28B028366E0D43202FDCD&rev=7c639c3716eb42a5bf0005dfeec252b6) distinguishes approved route segments from existing trails. Approval/construction is not a visitor opening. Do not mistake this DNR/CHTC project for KORC's separate proposed west-bank access.

## Decision-specific source gates

| Gate | Lower #139 | Upper #140 |
| --- | --- | --- |
| Waterfall identity | State GIS / firsthand position within ~7 m | State GIS vs specialist point ~267 m; additional unnamed uppermost cascade |
| Named public land | State land described by visitor bureau, DNR/TNC 2024 alternative | General state-land context; exact correct upper-viewpoint access not demonstrated |
| Current arrival | Fish Cove and Hoar Lake **published** (different historic approaches); November 2026 gate/vehicle permission unverified | Same arrival uncertainty plus longer extension |
| Public walking | Lower described by visitor bureau as unmaintained shoreline path; no 2026 continuous-path condition certification | No independently cleared continuous trail to exact Upper Falls |
| New trail construction | Two distinct proposals/projects; neither should be used to assert a completed new tourist trailhead | Same; east-side construction is not an opened upper viewing route |
| Visitor publishing | **Hold noindex / no automated navigation** pending current site-specific parking and complete approach confirmation | **Hold noindex / no automated navigation** plus identity correction and upper route confirmation |

The 2026 visitor brochure supports **existing public tourism interest**. It does **not** independently establish exact legal November 2026 parking, an approved maintained line, current gate position or winter access. These must be confirmed by current published land-manager/road-authority statements; visitors are not asked to verify data on behalf of the site.

## Implemented in this batch

- Updated both existing research-only pages with an understandable comparison of Fish Cove, the 2024 DNR/TNC alternative, the private road, and the **two distinct future trail projects**.
- Source-linked structured audit: `data/up-waterfall-montreal-access-evidence.json`.
- New read-only regression check `tests/up-waterfalls-b66-montreal-source-gate.test.js` for noindex, blocked directions, route separation and provenance.
- No change to curated destination inventory, public sitemap, nearby/waterfall map destinations, Person identity, ad logic, or current opening claims. Baseline remains 75 curated, 68 GIS-linked, 93 pending at B65.
- Next source investment: public operator/road-authority status of existing Fish Cove/Hoar Lake vehicle arrival and complete lower-falls walk, ideally an authoritative dated map or manager page; upper waterfall must pass a separate location and walking-corridor gate.
