# Freighter Watch Desk — Complete Shore Visit Recommendation, Experience OS / Foundry 0.3

Reviewed: 2026-11-08. Canonical: https://chrisizworski.com/great-lakes-ship-watching-spots/
Owner: izworskic/chrisizworski-com. Baseline release: 7aed09e449fd7b91aa67cebcf907b5284727772f.

## The problem this release addresses

Before this change, a visitor could see current AIS dots and sometimes a model-produced Soo/Duluth passage window. They still could not answer the practical question: **"Should I go watch a ship, where should I stand, when, what does the evidence support, and what might make the trip a mistake?"** The page pointed visitors at more engines instead of completing their first decision. Publishing a functioning map does not complete a visit plan.

## What the visitor gets now

The existing canonical has one first-screen recommendation with four direct answers:
- **Where:** a named public shoreline, named navigation search, official park/land-manager information and general published access hours where available
- **When:** a model-owned bounded Soo/Duluth passage window with advance arrival advice; an immediate in-lock report; a nearby-only report in other regions; or no supported ship time
- **Weather:** the National Weather Service hourly shoreline point forecast matched to the visit time, daytime status, temperature, highest forecast wind speed and precipitation probability; a separate active alert status
- **Decision:** plan around a modeled passage / nearby-only look / a scenic shore stop without a ship forecast / don't drive just for a ship / public hours conflict / severe weather concern / check missing evidence before traveling

A clear decision is not permission to ignore current conditions. **No event-specific access feed, live park closure check, ship-visibility assessment, ocean-wave forecast or door-to-door travel estimate is offered or implied.** When any of those matters, explicitly link the official owner and say it remains unverified.

## Canonical intelligence and ownership

| Data / claim | Owner / source | Contract | Decision authority |
|---|---|---|---|
| Vessel positions | Existing /api/soo-ais, /api/duluth-canal and /api/freighter-ais; normalized Open Waters AIS | checkedAt maximum 3 minutes; individual reports maximum 30 minutes | Observation only, never an ETA |
| Soo passage window and in-lock state | lib/soo-locks-next.js through /api/soo-ais | matching selected MMSI/seen/window; in-lock only when explicitly identified by the engine and seen within 8 minutes | Corridor-owned estimate or qualified current in-lock report |
| Duluth passage window | lib/duluth-canal.js through /api/duluth-canal | matching candidate list and selected source window | Corridor-owned estimate, not an Aerial Lift Bridge schedule |
| Near-area opportunity | New freighter-watch-decision.js | moving commercial vessel, last seen within 10 minutes, within about 2.5–3 nautical miles of an approximate shoreline reference | "Worth a look if already nearby", never "will pass here" or a driving ETA |
| Public viewing locations | Fixed allowlisted lib/freighter-watch-sites.js | specific official published source, named directions search, reviewed date and any published schedule | General plan context only; live opening/closure not independently checked |
| Weather and daylight | /api/freighter-watch-conditions via api.weather.gov points → forecastHourly and active alerts | allowlisted fixed US shore point; NWS hourly checkedAt within 35 minutes and selected forecast hour, alerts status explicitly available or unavailable | Exposure context; severe alert or very strong forecast wind can override a ship opportunity |
| Basemap | Existing keyed CARTO loader and OSM fallback | actual tile request and icon rendering | Geography reference, not parking/surveyed access |

No source may promote a general AIS dot to a shore sighting, a seasonal schedule to a real-time opening, or a forecast to observed conditions. Cached source checks and NWS outages fail closed. Both actual site and source timestamps remain on the page.

## Six independently researched viewing choices

**Soo Locks — observation platform.** U.S. Army Corps of Engineers: https://www.lrd.usace.army.mil/Missions/Recreation/Display/Article/3833525/soo-locks-visitor-center/ . Canal Park is year-round; USACE general park hours Nov–Apr 9 AM–6 PM, May/Sep/Oct 9 AM–9 PM, Jun–Aug 9 AM–10 PM. Indoor center seasonal May–Oct. Winter park access is not the same as indoor center access. Reviewed 2026-11-08.

**Duluth — public Ship Canal/Canal Park shore.** City of Duluth: https://duluthmn.gov/parks/parks-trails/parks-listing/canal-park/ ; USACE LSMVC: https://www.lrd.usace.army.mil/Missions/Recreation/Display/Article/3649015/lake-superior-maritime-visitor-center/ . The outdoor shore and indoor maritime museum are distinct; live outdoor closure/current hours not verified. Reviewed 2026-11-08.

**Port Huron — Thomas Edison Parkway.** City recreation inventory: https://www.porthuronrec.com/parks?comp-k9looxbs_page=2 ; Explore Port Huron: https://www.exploreporthuron.com/trails . Waterfront path and public viewing; no exact current open-hour verification. Reviewed 2026-11-08.

**Straits — Alexander Henry Park, Mackinaw City.** Village: https://www.mackinawcity.org/services/parks-recreation . Public park with Mackinac Bridge/Straits views; open-water traffic may be too far for a useful shore sighting. Reviewed 2026-11-08.

**Detroit — Cullen Plaza, Detroit Riverwalk.** Detroit Riverfront Conservancy: https://www.detroitriverfront.org/plan-your-visit/visitor-info/visitor-info ; https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk . Riverwalk general hours 6 AM–10 PM; event and construction closures are not monitored. Reviewed 2026-11-08.

**Bay City — Wenonah Park.** City of Bay City: https://www.baycitymi.gov/Facilities/Facility/Details/Wenonah-Park-28 . 101 Center Ave, posted 7 AM–9 PM. A reported vessel in Saginaw Bay is not evidence of a downtown Saginaw River passage. Reviewed 2026-11-08.

All site points in the NWS adapter are fixed approximate shoreline forecast references, not parking entrances. The "Find public watching area" button uses an independently documented named public destination, not invented coordinates. General posted hours are treated as unverified after 180 days without a new source review; they never affirm a current unannounced closure is absent.

## Two experience concepts reviewed

1. **All Sources Dashboard:** preserve the AIS map as the primary surface and add weather, official access and boat data in parallel columns. This is feasible and good for an expert, but it still leaves the average visitor to join unrelated timestamps and make the safety/visit judgment themselves.
2. **Shore Visit Verdict (selected):** the visitor chooses shore + time, sees a decisive *source-bounded conclusion* with location, timed model information where applicable, weather, access and exact next actions. The map and raw AIS are inspectable supporting evidence instead of the primary answer.

This differs substantively from the flagship freighter tracker (vessel-first exploration) and the previous static guide (editorial shore choices) in both **first-screen hierarchy** and **actual modeled visitor decision**. It reuses standard accessible controls, source-age invariants, CARTO, the editorial guide, site identity and network links, but not a compulsory Foundry page skin.

## Evaluation and release boundaries

- Pure decision regression: model-owned timing, in-lock now, wind/alert veto, published hours conflict, severe weather priority, missing alerts, stale forecasts, early hours, future-day forecast, nearby-only, Bay City far-ship, commercial/moving/fresh restrictions and evergreen source-age expiry
- Fixed-site API regression: URL host allowlist, header/robots, no coordinate-proxy injection, wind parsing, unavailable alerts, complete NWS outage and named fallback
- Real Chromium: 360/390/768/1440 mobile/desktop, selected place and time reversibility, card answer changes, real keyed CARTO tile, OSM fallback, missing Leaflet library, NWS severe-warning veto and no-JS editorial fallback. The browser harness uses fixed time and dated mock AIS/NWS inputs; **fixtures never certify live source availability**.
- Foundry 0.3: source-captured 7aed baseline, three opportunity comparisons, two viable designs, eight bounded replay scenarios and preservation checks. A recorded gain does not prove live venue access, external source claims, production delivery or measured visitor benefit.
- Full npm run verify:all, PR gates, separate Vercel READY deployment SHA, independent public screenshot and source response truth required before describing the release as live. No modification to ads, Redis, Supabase, canonical, creator Person ID, or other specialized engines.
- Instrumented visitor engagement event: freighter_watch_decision_action, tagged with corridor/time/verdict when existing site gtag is present. No uplift claimed without a comparable dated analytics export.

**Next worthwhile investment after this:** verify corridor-specific vessel direction and location-level shore visibility via independent holdout observations for Port Huron, Detroit and the Saginaw River. Do not infer a timed passage from present AIS speed or destination text until validated.
