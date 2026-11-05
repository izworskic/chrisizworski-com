# Issue #1258 — Batch 69: Fish Cove parking and November vehicle-access source gate

**Date researched:** November 5, 2026. **Scope:** Lower Montreal Falls #139 and Upper Montreal Falls #140 in Keweenaw County. **Disposition:** historic Fish Cove lot construction confirmed by dated tourism account; seasonal driving rules disambiguated; neither waterfall promoted to a navigable public guide or open-now stop.

## Material new findings

1. **Built Fish Cove lot, documented by 2022 source.** Visit Keweenaw, [Aug. 19, 2022 riding article](https://www.visitkeweenaw.com/blog/post/our-top-4-places-to-ride-in-the-keweenaw/), says the Keweenaw ATV Club had opened a multi-use trail to Fish Cove ending at a new **graveled parking lot** near Lake Superior. This is independent of the still-proposed **KORC Montreal Falls/Bare Bluff trailhead** and the DNR/CHTC east-side Montreal Corridor. The tourist report is not a November 2026 lot inspection.
2. **State land-manager record corroborates club partnership and partial easements.** Michigan DNR Baraga Forest Management Unit [compartment 11082 (entry year 2027), exported September 16, 2025](https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/Cmpt_Reviews/Baraga/2027/bar082_comp_info.pdf) states the DNR **has easements for parts of Mandan Road** and the **Keweenaw ATV Club partnered with DNR to build parking for Fish Cove users**. These carefully worded facts do not verify title of each connecting road segment, a present-day lot opening, a car route or signed parking GPS.
3. **Separate Fish Cove pedestrian approach.** Visit Keweenaw's [Lower Montreal guide](https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/) identifies a rustic Fish Cove lot, roughly one mile of rocky **unmarked, unmaintained shoreline path**, and a summer/high-clearance recommendation. Its [2026–27 visitor guide](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_Visitors_Guide_20260407_HIGH_23713277-83e7-418f-aab3-34c51d92bb6f.pdf) continues advertising Fish Cove. Neither is a published current November gate or trail-condition log.
4. **Seasonal DNR BK Hoar Lake ORV route restriction.** The [March 19, 2024 DNR route map](https://www.michigandnr.com/PUBLICATIONS/pdfs/ForestsLandWater/ORV/Maps-Trail/BK_Route.pdf) marks Keweenaw designated ORV routes including BK as seasonally closed starting November 1. It incorrectly prints **April 31** as the end date, which is not a real calendar day. The [Keweenaw ATV Club June 22, 2026 note](https://www.keweenawatvclub.com/map-update-with-openclosed-trails/) confirms north-of-Calumet trail operating season **May 1 through November 1**. Preserve a season-start fact without repeating the invalid calendar end. **Do not generalize ORV restrictions to a legal highway-vehicle closure across every forest/county road, nor infer public lot access.**
5. **Winter roadway and shoulder parking ban.** The [Keweenaw County Road Commission notice, posted October 27, 2026](https://keweenawcountyonline.com/news-roads-view.php?target=2778), prohibits parking on highway or county-road **roadways and shoulders**, **2 a.m.–8 a.m. local time**, **November 1–April 15**. It does not independently establish a Fish Cove lot closure or lot-specific parking regulations. A roadside shoulder is **not** a recommended unverified parking substitute.
6. **Ownership mosaic warning.** [Michigan DNR Keweenaw Point planning page](https://www.michigan.gov/dnr/managing-resources/prd/parks/mgt-plans/keweenaw-point-state-lands) says acquisition and planning are delayed even as previously approved trails proceed. Do not use a park-wide ownership shortcut to claim every parcel in the approach or future trailhead belongs to DNR.

## Decision matrix

| Evidence axis | Finding | Effect on visitor page |
| --- | --- | --- |
| A named Fish Cove gravel lot exists | Dated 2022 tourist account; independent DNR partner record in 2025 | **Historically established**, not speculative |
| Current road/lot access | No dated November 2026 gate, road status, vehicle-class clearance, or published lot conditions | **No live opening or GPS arrival claim** |
| BK Hoar Lake designated ORV route | Seasonal ORV closure begins November 1 | **Do not propose ORV approach Nov. 5**; conventional-vehicle law remains independently unresolved |
| County highway/county-road shoulders | Nighttime 2–8 a.m. parking restriction Nov. 1–Apr. 15 | Warn against roadside shoulder parking; **do not apply blanket lot ban** |
| Lower Montreal foot route | Visit Keweenaw describes unmarked shoreline walk | A historical challenging summer route, not maintained/guaranteed safe in winter |
| Upper Montreal foot route | Lower-route evidence does not establish exact Upper location or complete legal passage | **Research-only and no map directions** |

**Publication gate:** source-ledger and research pages only. No updates to curated visitor inventory, public sitemap, map pins, nearby Python index, ads, or Person schema. Current baseline remains 75 curated / 68 GIS-linked / 93 pending (B65–B68 reference values).

## Implementation

- Evidence JSON extended with `b69SeasonalPublicArrival` using source-specific dates and separate traffic/parking categories.
- Both noindex Montreal research pages include source-linked arrival evidence and explicit November driving/parking limits.
- New B69 regression test asserts dated evidence, exact category distinctions, no invented directions, no opened trail, and no mistake conflating ORV closures and all conventional vehicles.
- Existing cumulative B66/B68 gates remain mandatory. Run the new test, the full repository verify gate, browser/map smoke, SERP test and Vercel preview on the exact PR head.

## Next evidence threshold

A manager-authoritative, dated, route-specific status page or notice for the Mandan–Hoar Lake/Fish Cove passenger-road approach, Fish Cove gravel-lot use/season, and the complete lawful/continuous Lower Montreal public shoreline walk. Without that, this is historically verified public access **but not a live, navigable winter trip**. Upper Montreal requires a separate georeferenced water-feature and walking corridor proof. Do not ask visitors to supply validation.
