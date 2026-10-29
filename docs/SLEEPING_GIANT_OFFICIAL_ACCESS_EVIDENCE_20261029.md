# Sleeping Giant access evidence gate: verified names vs unverified coordinates

**Reviewed:** October 29, 2026 (Eastern). **Release:** Research branch PR #1273, unmerged. This file explicitly does not claim today's roads, trails, bike racks or winter access are open.

## Decision this phase actually proves

Ontario Parks has published an identifiable **signed parking facility** and **named/legal route transitions**. This validates narrative visitor wayfinding and bike/walk trip components, *not* exact navigation pins.

| Anchor | Authoritative finding | Verified from owner | Still withheld |
| --- | --- | --- | --- |
| South Kabeyun Trailhead | Large signed parking lot approximately 36.5 km south along Highway 587, entrance sign names Kabeyun, Sawyer Bay, Ravine Lake and Sea Lion; campground ~5 minutes north | [Ontario Parks camping](https://www.ontarioparks.ca/park/SleepingGiant/camping), [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Exact drivable parking waypoint, road-open status, current spaces/availability |
| Kabeyun ↔ Sawyer Bay trail connection | Official bike-to-hike Head route rides Sawyer Bay and follows a foot-only 0.6-km Kabeyun connector | [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Exact GIS signed turn coordinate |
| Kabeyun ↔ Talus Lake | **Absolute South Kabeyun bike cutoff** and bike racks at junction; Top of Giant 13.4-km cycle and 8.4-km hike (both round-trip) | [Ontario Parks activities](https://www.ontarioparks.ca/park/SleepingGiant/activities), [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Point coordinates, current rack operational status |
| Sawyer Bay ↔ Talus Lake | Nanabosho itinerary cycles Sawyer Bay and continues on Talus on foot | [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Signed turning location, independent rack/parking verification |
| Talus ↔ Top of the Giant | After Kabeyun/Talus rack, trail becomes hiking-only; climb the Top trail | [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Exact summit junction and current trail condition |
| Head walk transition | 12.2-km cycle + 4-km hike return. Foot route includes 0.6-km Kabeyun and 1.4-km Head one way. No installed rack documented at this transition | [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Bike lock-up GPS pin and official bike stand |
| Nanabosho walk transition | 11.8-km cycle + 5.2-km hike return. Official narrative includes 5.5 km on Sawyer Bay cycling approach; no rack documented | [Ontario Parks bike/hike](https://blog.ontarioparks.ca/bike-hike-sleeping-giant/) | Named point coordinate, exact Talus junction line geometry |

Other requirements from Ontario Parks camping: vehicles must display a valid permit, including day visitors; online day-use permits are available ahead of trips. **Do not imply an online permit proves a specific parking stall or open trail.** The official camping page also warns that South Kabeyun can fill on popular summer days.

### Important source-time distinction

The park's [management plan](https://www.ontario.ca/page/sleeping-giant-provincial-park-management-plan) refers to **future** installation of Kabeyun/Talus and Sawyer bike racks. The **September 2024 Ontario Parks article** subsequently describes a rack already present at Kabeyun/Talus and **no racks** at the Head and Nanabosho cycling transitions. Our rack evidence therefore cites the later owner-authored article rather than treating the earlier planning proposal as proof that work was completed.

The historical [park 1:50,000 map](https://www.ontarioparks.ca/pdf/maps/sleepinggiant/trails_map.pdf) was visually inspected to corroborate road/trail spatial context. It is **not** a current trail opening report, meter-accurate junction survey, or basis for a Google Maps link. The government [OTN geometry snapshot](../data/sleeping-giant/otn-trail-geometry-research.geojson) was simplified with `maxAllowableOffset=0.00006` degrees; even unsimplified geometry alone would not prove trail walkability or signed boundaries. None of the 13 OTN access records can be equated to the signed South Kabeyun lot absent independently matching official evidence.

## Code and acceptance gates

`data/sleeping-giant/visitor-access-evidence.json` stores seven named anchors with dated citations. `lib/sleeping-giant/visitor-access-engine.cjs` validates and evaluates them against `official-routes.json`.

Enforced tests include:
- Exactly one named, source-supported signed parking lot, still with **null** parking coordinates and **unverified** current status;
- Named legal cycling boundary at Kabeyun/Talus with official 13.4+8.4 km round-trip components; verified rack **at that junction only**;
- Separate Head (12.2+4 km) and Nanabosho (11.8+5.2 km) bike/hike returns and no rack claims;
- Sea Lion, Middlebrun and Pass Lake **do not gain bike-and-hike recommendations** without owner-authorized evidence;
- Source claims must carry official citations, no invented coordinates or live status, mismatched lengths fail rather than silently change;
- The existing OTN audit remains a **research-only route candidate graph**: 0 precise parking pins, 0 certified junction edges, 0 navigable routes.

For each route the engine produces a `sourceLinks` list, a `lot` with signed **textual** approach if supported, `legalModeBoundaries` with null geometry, and explicit `verificationRequired` items. It never outputs exact Google Maps parking directions, shortest-path routing or a safety clearance.

## Next geographic investment

Acquire authoritative **full-resolution trail segment geometry**, validate source OBJECTID/OGF_ID pairs and OTN precision, and reconcile the South Kabeyun actual lot with a separate park-owned geo-referenced parking map, where possible. For each junction require separate evidence of (1) precisely located sign/intersection, (2) legal bike/walk mode, (3) public access, (4) season/current restrictions, (5) demonstrated continuous geometry. An owner-authored textual trail connection only clears the **narrative** half of that gate.

**Only after all five are proven:** enable HTML/JavaScript on-map turn guidance, park-at-this-pin Google Maps actions, NRCan elevation sampling and dynamic estimated cycling/hiking times. Until then, use source-backed route comparison with carefully labelled unknowns.
