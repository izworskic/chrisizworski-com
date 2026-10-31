# Gooseberry Falls: evidence-first decision engine → EXPERIENCE_OS_V1

Checked 2026-10-31 · Owning repo: `izworskic/chrisizworski-com` · proposed distinct canonical: `https://chrisizworski.com/gooseberry-falls/`

## Visitor question

**"I have 30–90 minutes at Gooseberry Falls. Which falls can I reasonably visit, given my time, mobility and season, where do I start, and what do I still need to verify?"**

The existing `/lake-superior-circle-tour/` answers the trip-wide planning question. Gooseberry's new canonical owns the **within-park outing choice**, not another Circle Tour itinerary, generic fall color report, or live river-gauge page. No current dedicated Gooseberry page was identified by repository search on 2026-10-31.

## Authoritative evidence ledger

| Field | Exact source | What it supports | What it DOES NOT support |
| --- | --- | --- | --- |
| Short waterfalls walk | https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html | 30–45 min; Upper/Middle; step-free ADA route option if selected | Today's access/closure, guaranteed suitability |
| Falls View Loop | same DNR page | 45–90 min; Upper, Middle, Lower; not ADA | Winter maintained walking, open status |
| Seasonal walking rule | same DNR page | Only Upper Falls walking route maintained in snow | No claim other trails closed, snow presently on ground |
| Summer visitor map and precise park instructions | https://files.dnr.state.mn.us/maps/state_parks/spk00172_summer.pdf | Fifth Falls 2-mi loop; River View 1.25-mi one-way; visitor center; picnic; routes; park rules | GPX track geometry or minute-by-minute public access |
| Winter map | https://files.dnr.state.mn.us/maps/state_parks/spk00172_winter.pdf | Accessible plowed trail to Upper Falls, ski/snowshoe distinctions; no hikers on groomed ski/snowmobile trails; river ice never safe | Winter grooming is current or area is safe |
| DNR park and notices | https://www.dnr.state.mn.us/state-parks/park.html?id=spk00172 | Visitor center wayside lot does not require vehicle permit, official notices link, park generally 8am–10pm | A stale hours excerpt establishes real-time open status; the dynamically rendered alerts are automatically verified |
| DNR self-tour summary | https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour.html | Park-specific Picnic Flow and permit distinction: permit necessary to drive to lakeshore; visitor center wayside free | Exact travel time or parking vacancy |
| Superior Hiking Trail Association | https://superiorhiking.org/trail-conditions/ | Oct 5 2026 report: washout between West and East Gooseberry campsites; failed structure near Middle Gooseberry Campsite; slumping along park spur | It is NOT a closure of the short Middle/Upper Falls visit; status is not continuously verified |
| MN DNR temporary closure guidance | https://www.dnr.state.mn.us/trailconditions/index.html | Check park Visitor Alerts/Trail Notes and posted signs; status changes | Current trail open status without a dated park-specific notice |
| USGS 04015140 | https://waterdata.usgs.gov/monitoring-location/USGS-04015140/ | Gooseberry River site exists but has **zero continuous data types** | No "live waterfall flow" value, trend, percentile or water-safety forecast |
| NWS | https://api.weather.gov/points/47.143,-91.470 and https://api.weather.gov/alerts/active?point=47.143,-91.470 | Public forecast/alerts covering *general park vicinity* when request succeeds, with issuance/retrieval time | Park-specific route closure, observed waterfall water level or safety determination |
| MN DNR Gitchi-Gami | https://www.dnr.state.mn.us/state-trails/gitchi-gami/index.html | Paved trail to Split Rock; regional segment notices | Closure of Gooseberry falls routes |
| Historic natural history | https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html | CCC retaining wall, Gateway Plaza interpretation, basalt/lava falls formation | Fictional stories or on-site ranger presence |

### Provenance and freshness

- The park route and permit rules are **official reference guidance**, not sensor data. Recheck their documents before future edits.
- The SHT hazards are **reported by the association as of its October 5, 2026 update**; a future dated notice supersedes them. We do not claim these are *today's* access conditions.
- NWS is **forecast/issued alert**, not observation; use network-provided timestamps, display update time, and expire forecast if upstream is unavailable.
- The DNR park alerts page is linked prominently; until an API/structured, trustworthy source for individual trail statuses is independently verified, access is `UNVERIFIED`, never `OPEN`.
- The 2026 April river flood led to trail closures, demonstrating why this matters: https://www.startribune.com/gooseberry-falls-trails-closed-flooding-state-park-minnesota-dnr/601797298 . That *historical event* is not present closure evidence.
- No invented crowd counts, parking occupancy, weather-derived waterfall-flow signal, fixed opening hours for visitor-center services, or invented route-line geometry.

## External interaction research: two distinct approaches

1. [DNR's Gooseberry self-guided walk](https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html) (reviewed 2026-10-31) exposes numbered interpretive stops and established 30–90-minute alternatives. Improve on it with a clear choice and personalized plan, not by copying its content or map.
2. [NPS mobile app visitor tools](https://www.nps.gov/subjects/digital/nps-apps.htm) (research-library source rechecked for application 2026-10-31) provides self-guided destination stories and on-site utility. Transfer the stop narrative and evidence-first planning; do not imply NPS approval or offline maps.

Additional direct models from local Experience OS research: I03, I06, I10 and I13; patterns P01, P02, P04, P06, P07, P10, P14; anti-patterns A01, A02, A05, A07, A08, A13, A17, A19.

## Design alternatives

**A. The Falls Decision Desk** (chosen): immediate 30/60/90+ minute visit choice, step-free preference and season; personalized shortwalk/loop/Fifth Falls/lakeshore recommendation, truthful unverified access state, next-action directions and ranger-style sense-of-place. A compact licensed photo, source-linked map, and optional park-conditions panel are secondary.

**B. Waterfall Forecast Theatre** (rejected now): river-stage scrubber, animated high-water predictions, crowds and real-time conditions. It would be compelling but depends on unmonitored hydrology and crowd/closure feeds. It risks fabrication and should NOT ship.

## Engine contract

Inputs: `minutes` in [30,60,90,150], `mobility` = `stepfree|standard`; `season` = `snow-free|snow-covered`; `interest` = `waterfalls|shoreline|long-hike`; `conditions` = weather alerts and park access `unknown`.

Priority:
1. Snow-covered + step-free: **Upper Falls maintained winter route**, verify plowing/ice conditions before travel. Never recommend lower-falls loop as maintained walking.
2. Step-free + snow-free: **Upper and Middle via switchbacks**, official 30–45-minute guidance. No Lower Falls guarantee.
3. Snow-free and 30 min: shorter Upper/Middle walk, acknowledge 30 min lower bound, may be rushed.
4. Snow-free ≥60 min standard and waterfalls: **Falls View Loop** 45–90 min (time bands are planning ranges, not measured route ETA).
5. 150 min + long-hike: **Fifth Falls** 2-mi loop, hilly/gravel/boardwalk, and backcountry advisory from SHT, without conflating the distinct route.
6. Shoreline: **Picnic Flow/Agate Beach area** and exact permit consequence if driving into park. Do not assert accessibility.
7. Forecast alert: **check conditions before leaving / postpone exposed activity where relevant**; do not claim official closures.
8. Unverified park status ALWAYS surfaced. Labels `official typical route` and `access not verified`.

State transitions change named route, expected time, mobility details, access caution, primary park-map link, and permit context. No meaningless colored toggles. URL state is non-identifying (`?time=60&mobility=...&season=...`). HTML includes a useful default answer without JS.

## Photography

Exact-place image #1: https://commons.wikimedia.org/wiki/File:Goosberry_Falls.jpg (ZMoreno387; CC0 1.0; checked 2026-10-31). Author metadata GPS point refers to falls photo, not a parking place. Remote source via Commons Special:FilePath; do not download restricted Getty/travel image search thumbnails. Test actual load before release.

Exact-place image #2 (optional only after visual QA): https://commons.wikimedia.org/wiki/File:Agate_Beach_(Gooseberry_Falls_State_Park).jpg (Joe Passe; CC BY-SA 2.0; checked 2026-10-31); must display author+license link if used.

## Map and technical decision

Do not fabricate vector linework from schematic PDFs. DNR official downloadable summer/winter maps are always visible (PDFs). A small interactive map only if verified basemap + accurate point markers + real tile coverage can be demonstrated; it must collapse to directions and official park maps when tiles fail. A photographed falls location **is not** the visitor parking location. DNR official address: **3206 Highway 61 East, Two Harbors, MN 55616**.

Technology: static indexable HTML, no dependency for choice engine, optional Vercel serverless NWS proxy with cache/stale/no-data, optional shared CARTO configuration. No Redis, no new personal tracking, no geolocation prompt, no ad-stack change.

## Acceptance / test plan

Unit cases: 30min accessible snow-free, 90min stair-tolerant no snow, winter accessible, 150min long hike, shoreline vehicle permit, upstream weather unavailable/active alert, unknown park access. Browser 360,390,768,1440; no-JS; no map/CARTO tiles; blocked photo; keyboard; reduced motion. Confirm semantic JSON-LD strict parser; all existing repo CI and site benchmarks. **Not measured yet:** production visual QA, performance percentile, GSC impact, live deploy.

## Integration

Link new verified tool from the existing Circle Tour **after** full QA; introduce one distinct tool-registry entry and update sitemap/stamps using existing scripts and full clone. Do not claim this page live until actual merged/deployed and smoke-tested.