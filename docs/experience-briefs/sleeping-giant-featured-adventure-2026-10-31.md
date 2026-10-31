# Sleeping Giant — EXPERIENCE_OS_V1 featured-adventure pilot
**Review:** 2026-10-31 · **Owner:** `izworskic/chrisizworski-com` · **Canonical:** https://chrisizworski.com/sleeping-giant-provincial-park/

## Visitor job and existing baseline
A person chooses between six trails at Sleeping Giant with a known time budget, hiking versus permitted bike-and-hike, and a desired landscape. The current page provides the six verified official return distances, 70 source-engine comparisons, full parking-to-destination totals, four OTN *research-only* overlays and official access disclaimers. A sorted card grid alone does not make the chosen experience immediately legible; the map and the card are disconnected as interactions.

**First useful answer:** one named trail with miles-first official return distance, published walking time or explicit unknown, supported story and access caveat. This is **not** an open-trail recommendation.

## Evidence / rights
| Claim or photograph | Controlling source | Truth and limits |
| --- | --- | --- |
| Complete official trail lengths, rocky Sea Lion approach and stated hiking time | https://www.ontarioparks.ca/park/sleepinggiant/activities | Verified published route facts, not live or weather/access certification |
| Permitted cycling on summit approaches; Talus cutoff and rack distinctions | https://blog.ontarioparks.ca/bike-hike-sleeping-giant/ | Bike routes are documented only for their designated segments; mixed full-trip duration is not published |
| Operating categories | https://www.ontarioparks.ca/park/sleepinggiant | Campground season is not a present individual trail-open verdict |
| Sea Lion arch photograph, Mcdougallgregor | https://commons.wikimedia.org/wiki/File:Diabase_dyke_formation_known_as_the_sea_lion_in_Sleeping_Giant_Provincial_Park_in_Ontario_02.jpg | CC BY-SA 4.0, site-exact; cropped display, credited and linked |
| Top of Giant viewpoint photograph, Tariq Hossenbux | https://commons.wikimedia.org/wiki/File:View_from_the_top_of_the_Sleeping_Giant_Trail.jpg | CC BY-SA 4.0, route-exact; cropped display, credited and linked |
| Middlebrun Bay rock photograph, Sharon Mollerus | https://commons.wikimedia.org/wiki/File:Middlebrun_Bay_Rock.jpg | CC BY 2.0, bay-exact, depicts rock not beach sand; cropped display, credited and linked |
| OTN research overlays and parking gap | `docs/SLEEPING_GIANT_ROUTE_TOPOLOGY_EVIDENCE.md`, `docs/SLEEPING_GIANT_GEOGRAPHIC_RECONCILIATION_20261029.md` | Neither official parking connector nor signed junctions are navigation certified; two trails have no approved drawing |

All reviewed 2026-10-31. Retain official geometry/distance contracts and fail closed on missing images and tiles.

## External inspiration
1. [AllTrails Trail Previews](https://support.alltrails.com/hc/en-us/articles/37212870983700-Trail-previews-on-trail-pages) (checked 2026-10-31): route preview and elevation help interpret terrain. **Do not copy** 3D preview or assert verified travel line while our parking connector and signed endpoints are unresolved.
2. [NPS App](https://www.nps.gov/subjects/digital/nps-apps.htm) (checked 2026-10-31): map, self-guided interpretive narratives and accessible lists work together. **Do not copy** national-park data or imply Ontario Parks endorsed our app or verified directions.

## Competing concepts
- **A: Source-first featured adventure (selected).** A compact picture/story/return-time-access panel is driven by the *existing* planner. Map-side route picker and six cards synchronize through stable existing route IDs. Missing route-exact photographs collapse cleanly to a text-only panel. Visitor gets a changed answer without invented navigation.
- **B: Animated climb simulator (rejected now).** Timed traversal of an elevation/profile flyover driven by interactive route curves. Visually compelling but the OTN overlays omit access connectors and have unverified signed junctions. It would falsely imply full navigation knowledge. Revisit only with source-certified path/elevation and demonstrated visitor benefit.

Selected pattern IDs: P01 (answer first), P02 (map/cards sync), P07 (narrative-to-map), P10 (honest missing-photo/map alternative), P15 (mobile panel). Key anti-patterns: A01, A02, A05, A08, A09, A10, A22, A23, A25.

## Interaction contract
- Planner `hours/mode/interest` -> existing engine results reorder; matched/source-evaluated first route becomes the featured trail, with **same** route selected in map picker and cards. A suggestion is never a verified open/safe verdict.
- Clicking a route card -> feature title, official return mileage, story, mode/access evidence, map geometry (or its unavailable state), and map picker stay synchronized.
- Changing route in map-side native select -> same feature/card/map state; keyboard and touch accessible, no mouse-only marker needed.
- Featured "explore on map" button -> opens the current research map section and does not create directions.
- Image route has a verified source/credit/license -> load exact site image and credit link; image fails or photo is missing -> hide image entirely, preserving text/action. Async image responses cannot overwrite newer trail selection.
- Map tiles fail -> pre-existing SVG research fallback persists, with an explicit non-navigation warning. All six HTML cards remain with JS disabled.

## Responsive/technical scope
Retain generated HTML and static checked-in fallback, dependency-free JS, Leaflet + CARTO/OSM fallback, JSON-LD Person/canonical, source catalog and 70 decision comparisons, site ads loader and no Redis. On 360/390px: featured answer first; image after text and height capped; no horizontal overflow. On desktop: image alongside text, not a second giant hero. No invented GPS/directions, timed cycle speed or weather observation.

## QA and release
Target tests: planner intent beach -> Middlebrun, summit -> Top, map route selector -> Head and back, matching selection + card, image absent -> text retained, 360/390/768/desktop, keyboard, no JS, tile failure, existing map/ads/SEO/source contracts. Grade per `design-systems/experience-os-v1/docs/QA_SCORECARD.md` only after browser screenshots, CI and postrelease inspection; no unmeasured quality score or conversion claim.

**Release review remains pending until owning-repo CI and production smoke complete.** After release, record exactly which interaction/state/failure results were observed, and any unmet photos or map reliability limits.
