# Starbase Texas launch-viewing atlas — Experience OS v1.2 brief
Research and implementation date: **November 3, 2026**

## Actual visitor decision
**Question:** Where can I reasonably plan to watch a Starship launch without driving toward the restricted range, and how does the chosen mission change the plan?

**Primary answer:** Isla Blanca County Park is the most directly documented public island choice. Cameron County also administers Jaime J. Zapata Memorial Boat Ramp on Highway 48; the exact launch-day viewing sightline is unverified. Port Isabel Lighthouse is a separate cultural day stop, not an authorized launch venue.

**Primary visitor action:** Start with the map, pick the relevant public site, follow live Starbase beach/road source data, then continue the **same mission UUID** in Rocket Launch Live USA.

## Source ledger
| Subject | Grounding | What the source does NOT prove |
| --- | --- | --- |
| Boca Chica beach, Hwy 4 road and orders | [City of Starbase beach/road dashboard](https://www.starbase.texas.gov/beach-road-access), reviewed 2026-11-03 | General current beach-open does not approve launch-day entry or other closed areas. Cache older than 90 min must be unknown. |
| Island launch-watching context | [South Padre Island official destination guide](https://visitsouthpadreisland.com/spacex/), reviewed 2026-11-03 | No guarantee of gate hours, parking, admission, or clear sightlines on any specific day. |
| Isla Blanca park/phone/address | [Cameron County Parks](https://www.cameroncountytx.gov/parks-home/), reviewed 2026-11-03 | County listing does not establish a current launch-event entrance or current price. |
| Isla Blanca coordinates | [USGS place center via TopoQuest](https://topoquest.com/place/texas/park/isla-blanca-park/1374243), N26.071745 W97.160249 | A geographic park feature is not a surveyed spectator location or entrance. |
| Jaime J. Zapata boat ramp address | [Cameron County Parks](https://www.cameroncountytx.gov/parks-home/), reviewed 2026-11-03 | Doesn't establish a rocket sightline, late opening, or special launch permission. |
| Jaime Zapata map reference | [NOAA San Martin Lake Channel station 8779911](https://tidesandcurrents.noaa.gov/benchmarks/8779911.html), N26.00181 W97.29856, historical benchmark 2021 | A station geographic reference in the vicinity is not precise spectator parking, entrance or proven visibility. |
| Port Isabel Lighthouse location, ticket hours | [Texas Historical Commission/City historic site](https://portisabellighthouse.com/lighthouse/), reviewed 2026-11-03 | Historical tour hours do not establish night-launch opening, view of pad, or special access. |
| Mission/source clock and pad coordinates | Existing signed national LL2 Postgres schedule, `api/rocket-launch-usa` | A third-party target is not a guaranteed liftoff or range clearance. No pad is invented when GPS missing. |
| Spectator cloud and surface weather | Existing NWS points in the national rocket engine | Not forecast for full rocket path, T-0 range approval, launch safety, or a live camera. |
| Photo: Starship fifth integrated flight test | [Steve Jurvetson original Commons file](https://commons.wikimedia.org/wiki/File:SpaceX_IFT-5_Launch_(54063581561).jpg), photographed 2024-10-13, CC BY 2.0 | Archival launch photograph, never represented as current mission. Attribution and license adjacent to image. |

## Experience OS distinctiveness veto
- **Vandenberg:** coastal hills / open-sky landscape, six public Lompoc venue profiles and marine layer. **Starbase:** one water crossing, changing Hwy 4 safety closures, three geography references and a no-public-pad-access visual prohibition.
- **Florida:** NASA/KSC vs Space Force pad types, mission-specific ticket and Playalinda NPS rules. **Starbase:** no ticket engine; a public-safety distinction between beach-open and rocket-event-access-open is the core decision.
- **National hub:** mission calendar and regional surfacing. **Starbase:** street-scale public place pins, offline geographic manifest, optional restricted LL2 launch pad, explainable straight-line bearing, and purpose-based choice.

## State and fallback contracts
- **Source of truth:** `lib/starbase-viewing.js` exports pure locations, official-source references, bearings and fail-closed verdict; `scripts/export-starbase-places.js` materializes exactly 3 public reference features for map fallback.
- **Live state:** national region = texas and the selected valid LL2 UUID; current weather/notice from national API; changing mission changes selected pad, distance/bearing, source confidence and return link.
- **Interactive inputs:** first-time / no-causeway / history, each reorders cards and moves the selected map pin with keyboard and touch support; a separate mission select updates the actual displayed event.
- **No JS:** three substantive HTML cards, official sources, accessible list, and an inert mission control; no fake launch state.
- **No launch:** bounded schedule absence cannot prove no operations; no clock or pad is inferred.
- **Source failure/stale:** public map from local verified reference file remains. Notices and sky are unknown; never "go"/safe.
- **Tile failure:** plain text cards, geographic attribution and OSM link survive. CARTO is optional only when an actual keyed tile loads; native OSM remains fallback.
- **Pad missing/invalid:** no restricted-pad pin or line. Pad pin never offers driving directions.
- **Media unavailable:** static image has source credit and meaningful prose; no reliance on image to make decision.
- **Concurrent choices:** request sequence rejects previous mission responses, selected site and mission remain coherent.

## Release verification
Source tests: `node --test tests/starbase-viewing-atlas.test.js` plus existing rocket suites and full `npm run verify:all`. Browser QA at 360/390/768/1440 checks map/list, A→B→A mission, persona choice, noJS, stale deep link and failed notice/tiles. Public launch requires independent production DOM and image/tile verification **after** exact merged SHA reports Vercel READY.

No new Supabase, Redis, paid third-party source, Ads config, standalone schedule collector or unverified flight trajectory. New canonical is distinct from the national launcher, Florida and Vandenberg; one sitemap entry; field-guide and national crosslinks.

**Not measured:** GSC, GA4, AdSense effect, real-world parking, range security status or user satisfaction. A test fixture cannot establish any of those.
