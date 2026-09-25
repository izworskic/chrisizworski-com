# Duluth Boat Watcher Monitor — Benchmark & Value Function

## User decision

A boat watcher should be able to answer, from one mobile-first surface:

1. What ship is worth watching next?
2. Where is it now?
3. When is the supported Canal Park watch window?
4. Which live camera can confirm the scene?
5. Where should I stand if I am in Duluth?
6. What is likely after that, and how certain is the evidence?

The product is not a copied schedule, generic harbor dashboard, or navigation service.

## Benchmark references

### Harbor Lookout

Behavior worth learning from:
- fast scan of upcoming vessel activity
- vessel identity and particulars are prominent
- published arrival/departure forecast provides a longer planning horizon
- uncertainty is explicit: times change and arrival estimates are generally more reliable than departures

Role we do not duplicate: published longer-horizon schedule/reference.

### Duluth Harbor Cam + Ship Cam

Behavior worth learning from:
- immediate visual confirmation
- multiple useful viewpoints
- cameras are tied to actual Canal Park, Twin Ports and North Shore geography

Our differentiation is to connect camera geography directly to the selected live AIS watch and in-person locations. The complete Duluth Harbor Cam `Our Live Cams` inventory is represented as 18 named feeds grouped into 14 truthful camera sites. The independent Ship Cam remains a fifteenth mapped camera site, for 19 exposed feeds total.

The two primary Canal Park video views remain lazy-loaded inside the monitor. The broader regional camera network is supplemental: it is mapped and browsable without pretending every operator feed is a stable embeddable stream.

## Value function

| Dimension | Weight | Observable success |
|---|---:|---|
| Next-watch trust | 30% | No invented vessel or schedule; selected watch has fresh supporting AIS and bounded uncertainty |
| Spatial awareness | 20% | Selected vessel is always locatable on the map, even when outside the 28 NM local-vessel radius |
| Visual confirmation | 15% | Primary Canal Park video views are available in-page and the full 18-feed Duluth Harbor Cam network is tied to mapped camera sites |
| Mobile time-to-action | 15% | User can identify what, where and when within the first useful monitor surface |
| Vessel identity | 10% | Name, class, distance, speed, direction, freshness and watch window are visible without another site |
| Resilience & provenance | 10% | Stale/degraded AIS is explicit; cameras/watch spots remain usable; source trail and site-level camera-location caveats remain visible |

## Hard-veto losses

Do not release if any are true:
- a ship or passage time is invented
- stale AIS is presented as current
- the selected watch cannot be located on the map
- cameras are disconnected from the spatial workflow
- feed failure is described as “no ships” or “no traffic”
- the primary Canal Park live-watch workflow requires leaving for an external site
- supplemental regional camera links are represented as embedded or guaranteed when they are not
- map clutter makes the selected ship/canal relationship unreadable
- JEV can create candidates or alter deterministic factual gates
- primary video is eagerly loaded on page open when the user has not requested it

## Persona and edge benchmark

| Persona/state | Must succeed |
|---|---|
| Canal Park visitor | See next supported watch, timing and exact viewing locations quickly |
| Remote boat watcher | See selected ship + camera options without local knowledge |
| Serious laker fan | Inspect identity, position, speed, direction and short queue |
| Family timing a stop | Know whether a supported watch is soon enough to justify waiting |
| Photographer | Compare ship position with north/south/Lakewalk viewpoints and nearby camera sites |
| Accessibility-limited visitor | Understand the three fixed viewing choices before moving |
| Selected ship 28–150 NM out | Ship remains visible because candidate coordinates are preserved beyond the close-in map radius |
| Multiple candidates | Selected NEXT vessel is visually distinct from other anticipated ships |
| No supported candidates | Page says evidence is insufficient, not that harbor traffic is zero |
| AIS failure | Cameras and watch spots remain usable; no stale/invented timing is substituted |
| Primary camera unavailable or panned away | Alternate mapped camera options remain available; AIS still supplies situational awareness |
| Slow mobile connection | Core decision/map remain useful and primary video stays unloaded until requested |

## Architecture rules

- Deterministic logic establishes valid candidates, timing windows, freshness and evidence.
- JEV chooses only from that sealed candidate set.
- Candidate AIS latitude/longitude/seen are carried into the response so every anticipated vessel can be mapped.
- The map visibly distinguishes selected NEXT vessel, other supported candidates, recent local AIS reports, camera sites, canal and in-person watch spots.
- The 18 Duluth Harbor Cam feeds are grouped into 14 camera-site markers rather than inventing separate precise mount coordinates for co-located feeds.
- The independent Ship Cam remains mapped separately, producing 15 mapped camera sites / 19 exposed feeds in total.
- Regional North Shore camera sites do not expand the default Canal Park map extent until the visitor chooses `Camera network`.
- The two primary in-page camera streams are loaded only after user action.
- Harbor Lookout remains a lower-page published-schedule cross-check, not a required primary workflow dependency and not a data source we scrape/copy.

## Release checks

1. Selected watch card and map NEXT marker agree on MMSI.
2. Locate-next action opens that vessel on the map.
3. A candidate outside 28 NM remains mappable.
4. The camera-network module exposes all 18 Duluth Harbor Cam feeds across 14 mapped sites, while the independent Ship Cam remains the fifteenth camera site.
5. Primary Canal Park camera playback remains lazy-loaded and usable without requiring a regional map zoom.
6. `Camera network` expands the map to the regional camera inventory only on demand.
7. Green markers and Where-to-watch cards remain linked both directions.
8. AIS failure preserves camera/watch-location utility and never claims zero traffic.
9. 390 px mobile layout has no required horizontal scrolling and monitor controls remain usable.
10. Full repository verification, SERP protection and production deployment are green before completion is claimed.
