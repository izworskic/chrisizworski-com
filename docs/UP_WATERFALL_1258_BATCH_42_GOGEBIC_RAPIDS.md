# Issue #1258 Batch 42 — five western Gogebic waterfall/rapid candidates

**Reviewed:** November 1, 2026. Online evidence only. No emails, drafts or outreach. Proposed for draft PR, not production until release gates pass.

## Results
| GIS ID | Candidate | Independent natural position | Separation | Finding and publication gate |
|---|---|---|---|---|
| 37 | Neepikon Falls | Black River | ~477m | World Waterfall Database disqualified feature; position discrepancy; research-only, noindex |
| 39 | Powder Horn Falls | Powder Mill Creek | ~3m | Natural two-tier falls, but adjacent private property and old lodge approach; research-only, noindex |
| 40 | Rocky Forty Falls | Siemens Creek | ~145m | Public easy-hike source gives a different location 69.2km away; research-only, noindex |
| 48 | Narrow Falls | Black River | ~63m | Named rapids only, ~3in ripple; generic tall falls location ~7.5km north; research-only, noindex |
| 58 | Chippewa Falls | Black River | ~15m | Small rapids by Copper Peak with suspected mixed ownership and unverified route; research-only, noindex |

### New high-value evidence
- **Neepikon #37:** GIS 46.490065,-89.995318 vs independent 46.49433,-89.99471 (~477m). Specialist reports roughly 0.5ft of ripples reached by informal utility-road bushwhack. [World Waterfall Database](https://www.worldwaterfalldatabase.com/index.php/waterfall/Neepikon-Falls-13235) **disqualifies** it as a waterfall and flags a GNIS/topographic label misplacement. A geographic name is not an attractive signed tourist stop.
- **Powder Horn #39:** Exact geographical match (~3m) and current [UPtravel listing](https://www.uptravel.com/listing/powderhorn-falls/5815/) confirm a natural two-tier fall. [Specialist old-lodge lot approach](https://www.waterfallsofthekeweenaw.com/powder-mill-creek/powerdorn-horn-falls/) includes path beside private driveways and a rope to the lower drop; no currently sanctioned lot, owner easement or safe lower gorge route. October 2026 [MLS listing for a nearby privately owned Powdermill Creek frontage parcel](https://www.remaxnorthcountrymi.com/property/138-50224628-tbd-powderhorn-road-bessemer-MI-49911) identifies a neighboring waterfall property; it is **not** parcel proof for GIS #39, but cautions strongly against assuming old lodge parking is public.
- **Rocky Forty #40:** State feature on Siemens Creek is ~145m from a GNIS-derived location. [Mass-generated easy guide](https://upper-michigan.com/guide/waterfalls/rocky-forty-falls.html) gives a **69.2km different point** near Watersmeet/CR527 and an uncorroborated easy cedar walk. Independent [source](https://waterfallhikes.com/waterfalls/rocky-forty-falls-near-ironwood-in-mi) says no confirmed public arrival. Do not reuse generic parking, route, elevation or hydro forecast assumptions; stream is Siemens, not Black River.
- **Narrow #48:** Source GIS about 63m from [field-mapped **Narrows**](https://www.waterfallsofthekeweenaw.com/gogebic-black-river/narrows-falls/), which describes about a three-inch ripple. Aggregated online [directory](https://michiganupperpeninsula.com/places-to-visit/waterfalls/) lists a 10-foot falls ~7.5km away: do not join that position or promise an improved destination. No officially published signed riverside parking/foot corridor. Preserve named feature without inflating waterfall significance.
- **Chippewa #58:** GIS ~15m from [field-mapped small rapids](https://www.waterfallsofthekeweenaw.com/gogebic-black-river/chippewa-falls/) near Copper Peak. [Research summary](https://waterfallsamerica.com/waterfalls/chippewa-falls-mi-623218/) reports west bank Copper Peak private property and east bank Ottawa NF; neither specific riverbank ownership nor powerline/visitor route independently confirmed. Historic land protection [TPL report](https://www.tpl.org/our-work/chippewa-falls-black-river) does not certify modern parcel title.

### Source checks and conservative decision
- Michigan state DNR LOTS parcels layer 0 and easement layer 9 direct point intersections for **all five** returned zero features. Not a county title search; empty matches do **not** prove private land or lack of federal land.
- USDA FS Enterprise Data Warehouse published trail layer, radius 1000m, returned: **Neepikon: snowmobile #60033** (not a waterfall foot route); **Powderhorn: none**; **Rocky Forty: none**; **Narrow: none**; **Chippewa: NFST-128-B** (proximity does not establish a walking spur/parking nor permission to cross private land). Reproducible URLs stored in the access audit for each candidate.
- Ottawa National Forest officially describes **five** developed Black River National Scenic Byway waterfall sites with signed parking, distinct from these upper/nearby minor river features. Roadside fishing pullouts are not automatically waterfall trailheads.
- The NEARBY Powderhorn MLS listing is not itself proof of the natural falls parcel. No use of unlicensed photo assets.

**Publication:** Five `noindex,follow` research-only source reviews linked from the opt-in geographic research layer; no new curated visitor cards, parking pins, routes, TouristAttraction JSON-LD or sitemap pages. Exact GIS/161-identity ledger remains complete, 71 curated / 65 exact matched / 96 pending unchanged. Each has six source-linked facts and explicit blockers. Previous source review was zero for these IDs.

**Next gate:** exact-head queue generator --check, focused Node regression, mobile waterfall browser smoke, full 59-stage site verification and production audit before merge. Preserve source gates and avoid expanding the general public waterfall count from minor rapids.
