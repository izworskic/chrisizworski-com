# Issue #1258 — Batch 68: Montreal trail as-built map and lawful parking audit

**Reviewed:** November 5, 2026. **Decision:** the newly completed Montreal Corridor cannot be converted into a visitor parking-to-waterfall route on the evidence now public. Keep Keweenaw Lower Montreal #139 and Upper Montreal #140 **research-only / noindex**. Do not make users verify access themselves.

## Source analysis

1. [DNR Keweenaw Point Trails GIS-style planning map, created July 22, 2026](https://www.michigan.gov/dnr/-/media/Project/Websites/recsearch/documents/MapsI-N/KeweenawPointTrailsMap.pdf?hash=B5CF668B5EB28B028366E0D43202FDCD&rev=7c639c3716eb42a5bf0005dfeec252b6) distinctly differentiates *existing DNR-managed trails* (solid black) from *Recreation Trail Proposal Database approved* routes (magenta dotted). **Montreal River Trail (East side)** uses the approved style. The July 22 map is therefore neither an as-built 2026 trail survey nor an identified public vehicle lot/spur from that lot to each specific falls. This map was checked visually, not merely by text.
2. [Copper Harbor Trails Club homepage](https://www.copperharbortrails.org/) reports Montreal Corridor *complete*, but [CHTC's Maps & Guides page](https://www.copperharbortrails.org/maps-guides) does not describe a complete Lower-vs-Upper waterfall hiking itinerary with legal arrival. Its linked summer [PDF map](https://www.copperharbortrails.org/_files/ugd/268b07_92a9a10d17c349708339d2ae29890a77.pdf) redirects to a non-retrievable attachment in this environment, so **do not claim its contents were verified**. The [trail-status page](https://www.copperharbortrails.org/trail-status) shows an October 23 note but its trail-by-trail list is dated May 18, 2026, and fails to name the two waterfall spurs.
3. [Trailforks historic Montreal Falls Trail](https://www.trailforks.com/trails/montreal-falls-trail/) is a **1.9-mile legacy trail** whose access notice explicitly says *Restricted Access*: the private Smiths-Fisheries Road gate is approximately 3.33 miles west of the listed trailhead. Its visible map coordinate, as well as nearby parking suggestions, must **never become our car navigation or official parking address**. Trailforks links two alternate routes, including Visit Keweenaw's Fish Cove advice.
4. [Trailforks Keweenaw Point Trail Manganese-to-Fish Cove](https://www.trailforks.com/route/keweenaw-point-trail-manganese-to-fish-cove/) is listed as **23.3 miles**, contains eight existing listed trail segments, and ends at Fish Cove. Its description does not document the newly completed *east-bank Montreal Corridor*, nor a foot route to either waterfall. No inference based on proximity or a map route endpoint is permitted.
5. [Visit Keweenaw](https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/) describes a **named rustic Fish Cove lot** and an unmarked, unmaintained roughly one-mile shoreline path to the **Lower** waterfall; its [2026-27 guide](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_Visitors_Guide_20260407_HIGH_23713277-83e7-418f-aab3-34c51d92bb6f.pdf) continues to feature the rugged Fish Cove walk. This is valid *seasonal descriptive visitor guidance*. It is **not** exact lat/lon, current road gates, trail maintenance, winter clearing or a route to Upper.
6. [KORC's pending 2026 west-bank parking/loop request](https://www.keweenawoutdoorrecreation.org/calls-to-action-montreal-falls-trail-access) is distinct from the east-bank builder-completed corridor. Neither is a substitute for the other.

## Per-waterfall decision

| Proof item | Lower Montreal #139 | Upper Montreal #140 |
| --- | --- | --- |
| Existing Lower Fish Cove seasonal access described | **Yes** | Not a verified upper extension |
| Completed east-bank corridor reported | Yes, general operator headline | Yes, general operator headline |
| DNR after-construction as-built spur | **No verified public source** | **No verified public source** |
| Authorized arrival parking and current gates | Named Fish Cove rustic lot historically; exact GPS and road/gate state not verified | None confirmed for the correct upper cascade |
| Geographic waterfall identity | State GIS/field point near-match | ~267m state GIS vs firsthand location discrepancy |
| New public card, destination pin, car navigation | **Hold** | **Hold** |

## Visitor-facing implementation

- Both existing research pages now distinguish the RTPD-approved map style from finished route, provide operator map portal and cited historic route sources, and explicitly warn against using Trailforks' gated trailhead for automobile arrival.
- Source evidence is serialized under `sourceAxes.asBuiltMapAndParking` in `data/up-waterfall-montreal-access-evidence.json`.
- Added B68 regression tests for as-built proof, source conflict, noindex, no fake parking, no routing and unchanged GIS inventory.
- No changes to the 75 curated destinations / 68 GIS-linked / 93 pending, sitemap, actual public waterfall map, Person attribution or ads. No traffic lift claimed.

**Next decisive proof:** a dated operator-issued post-build as-built PDF/map or Trailforks trail explicitly endorsed by CHTC identifying a legally accessible trailhead/parking address and walking line to Lower and Upper *individually*, plus current land-manager seasonal gate constraints. Upper also needs its ~267m identity mismatch reconciled. Do not ask visitors to do the operator's verification.
