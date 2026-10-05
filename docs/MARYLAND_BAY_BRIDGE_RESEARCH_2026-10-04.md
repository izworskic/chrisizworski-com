# Maryland Chesapeake Bay Bridge Decision Engine — Research and Architecture

Date: 2026-10-04  
Canonical target: `https://chrisizworski.com/chesapeake-bay-bridge-maryland/`  
API: `/api/maryland-bay-bridge`

## Primary traveler question

> Can I cross the Maryland Chesapeake Bay Bridge now, does the current MDTA restriction affect my vehicle, what is traffic doing on US 50/301, and what will the eastbound toll cost?

This product follows the successful Mackinac/CBBT pattern: operator state first; vehicle consequence second; live traffic next; weather as context only; cameras after the decision layer; planned work separated from live incidents; server-side toll rules; explicit unavailable states.

## Authority hierarchy

1. **Maryland Transportation Authority (MDTA)** — operational policy, wind warning/restriction classes, traffic holds/closures, toll rates, planned lane work.
2. **Maryland CHART / MDOT** — live roadway incidents/events, highway message signs, US-50 speed sensors, official cameras, road-weather stations and travel-time routes.
3. **National Weather Service** — hourly forecast and active alerts as environmental context only.
4. No third-party traffic or weather source may override MDTA.

## Official wind policy

Source: `https://baybridge.maryland.gov/emergency-closures`

- **Wind Warning:** sustained 30–39 mph for 10+ minutes, or gusts persistently over 30 mph for 15 minutes. Trailers, motorcycles, roof cargo and other wind-sensitive vehicles are advised to use caution.
- **Limited Wind Restrictions:** sustained 40–49 mph for 10+ minutes, or gusts persistently over 40 mph for 15 minutes. House trailers, empty box trailers, and vehicles law enforcement determines cannot safely cross are prohibited.
- **Full Wind Restrictions:** sustained over 50 mph for 10+ minutes, or gusts persistently over 50 mph for 15 minutes. Only automobiles, pickup trucks, flatbed trailers, commercial buses and heavy-laden tractor/trailers are permitted. Tractor-box combinations under 64,000 lb are prohibited.
- **Traffic Hold / Bridge Closure:** sustained over 55 mph for 10+ minutes, or gusts persistently over 55 mph for 15 minutes. MDTA may discontinue all traffic movement.

Critical rule: the engine never promotes a CHART or NWS wind observation into an MDTA operational state. An explicit operational message is required. Healthy sources with no explicit restriction produce `NO_ACTIVE_RESTRICTION_FOUND`, never a fabricated `OPEN`.

## Maryland CHART feeds

CHART documentation: `https://chart.maryland.gov/DataFeeds/GetDataFeeds`

Production export endpoints:

- Events: `getEventMapDataJSON.do`
- Cameras: `getCameraMapDataJSON.do`
- Speed sensors: `getTSSMapDataJSON.do`
- Road weather: `getRWISMapDataJSON.do`
- Highway message signs: `getDMSMapDataJSON.do`
- Travel-time routes: `getTravelRouteDataJSON.do`

All use `https://chartexp1.sha.maryland.gov/CHARTExportClientService/`.

The adapter filters rows to the Bay Bridge/US-50 corridor and preserves provider timestamps. Camera imagery is never interpreted as measured traffic delay.

## Toll model

Source: `https://mdta.maryland.gov/Toll_Rates/Bay_Bridge_Rates.html`

MDTA states tolls are collected eastbound only. Current standard rates represented in the engine:

| Axles | E-ZPass Maryland / base | Video |
| --- | ---: | ---: |
| 2 | $2.50 E-ZPass Maryland / $4.00 base | $6.00 |
| 3 | $8.00 | $12.00 |
| 4 | $12.00 | $18.00 |
| 5 | $24.00 | $36.00 |
| 6+ | $30.00 | $45.00 |

Special commuter/shopper/post-usage plans are not auto-qualified.

## Planned work

MDTA publishes weekly lane-closure/traffic-pattern advisories at `https://mdta.maryland.gov/blog-category/bay-bridge-traffic-advisories`. Full eastbound-span closures may move two-way traffic onto the westbound span. Planned advisories are separate from live operational state unless current CHART evidence corroborates them.

## Release loss functions

Release is unacceptable if any of these occur:

1. raw wind speed causes a restriction or closure;
2. missing official data becomes `OPEN`;
3. planned work is presented as a live incident without corroboration;
4. a house trailer or empty box trailer is allowed under Limited Restrictions;
5. a tractor-box combination below 64,000 lb is allowed under Full Restrictions;
6. a westbound traveler is charged a toll;
7. camera imagery is interpreted as measured delay;
8. stale fallback data silently appears fresh;
9. frontend code independently invents vehicle/toll rules;
10. source outages erase static official restriction rules.

## V1 readiness score

| Dimension | Weight | Score |
| --- | ---: | ---: |
| Immediate crossing decision | 15 | 15 |
| Authority / operational truth | 15 | 15 |
| Vehicle restriction accuracy | 12 | 12 |
| Live traffic usefulness | 10 | 9 |
| Freshness / provenance | 10 | 10 |
| Mobile first-screen utility | 10 | 10 |
| Toll usefulness | 7 | 7 |
| Camera usefulness | 5 | 5 |
| Weather context | 5 | 5 |
| Planned-work separation | 4 | 4 |
| Search/social discovery | 4 | 4 |
| Resilience/accessibility | 3 | 3 |
| **Total** | **100** | **99** |

The intentionally withheld point is live-traffic calibration until production CHART route behavior is observed across normal congestion and incident conditions. The engine refuses to manufacture a bridge travel-time number from sparse sensors.
