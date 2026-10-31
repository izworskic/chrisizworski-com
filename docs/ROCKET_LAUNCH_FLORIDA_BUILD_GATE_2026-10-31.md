# Space Coast Launch Viewing: Florida access pilot build gate

Reviewed: 2026-10-31. Repository: izworskic/chrisizworski-com. Canonical page: https://chrisizworski.com/national-tools/space-coast-launch/

## Release purpose

Improve the pre-existing Space Coast tool rather than create a competing "rocket launch live" landing page. Deliver evidence-first visitor decisions about scheduled missions, legal access, and spectator surface weather. No flight trajectory, cloud interception prediction or assured launch view is represented.

## Source ledger and contracts

| Field | Source | Polling | Exact requirement |
| --- | --- | --- | --- |
| Mission NET, status, pad, precision | Launch Library 2 production v2.3 | Server-only; shared CDN cache 15 min, stale 30 min | Use location__ids=12,27. Never treat day/month/year NET as a midnight launch or use a recent successful launch as upcoming. Current LL2 anonymous limit may be too low for high-traffic multi-region requests. |
| Playalinda NPS closures | Official park-hosted https://www.nps.gov/cana/park-alerts-cana.json | Server only, same response cache | Filter is_active, date limits; preserve location-specific closure scope, do not infer every lot is closed or open. |
| NPS fallback | https://developer.nps.gov/api/v1/alerts?parkCode=cana&limit=50 | Only if park-hosted feed fails | Server-only Vercel NPS_API_KEY header. Developer API may lag direct park site by approximately two hours. |
| Spectator surface forecast | https://api.weather.gov/points/{lat},{lon}, then forecastHourly | Only when a minute- or second-level launch is within seven days | Compare Titusville and Port Canaveral; no claim of observed rocket trajectory visibility. |
| KSC launch-site and ticket eligibility | https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations | Manual official mission verification for now | Gantry is ineligible for LC-39A/39B. Every other ticket availability remains mission-specific. |
| Public county venue guidance | https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/SpaceView and https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/Parrish-Titusville | Publisher checks | Brevard identifies Space View after-hours launch access, Parrish as launch-viewing park. Neither provides real-time parking capacity. |
| City park hours | https://www.cityofcocoabeach.com/facilities/facility/details/alanshepardpark-54 | Publisher checks | Alan Shepard regular hours 8 AM–7 PM, separate city parking no overnight parking. |
| NASA mission schedule | https://www.nasa.gov/event-type/launch-schedule/ | Context only | Official NASA mission catalog is selective, not a universal launch-status API. NASA_API_KEY is available in Vercel but not required by this release. |

## Live evidence as of October 31, 2026

Park-hosted NPS JSON returned five active records. The Playalinda notice listed an October 25, 2026 start and February 27, 2027 end, lots 8–13, the main road north of Eddy Creek and northern beach sections closed. The separate hours notice lists 6 AM–6 PM, last entry 5 PM. Any closure's posted end date is not permission to enter before the land manager confirms reopening.

Launch Library 2 v2.3 tested with location IDs 12 (Cape Canaveral SFS) and 27 (Kennedy Space Center). The full response exposes net_precision, pad, launch status and last_updated. The lightweight mode=list DOES NOT include pad or provider, so only the normal response is suitable for these calculations. v2.3 upcoming can return already completed launches, so completed statuses must be removed.

## Release gates

1. Node regression suite: node --test tests/space-coast-live.test.js.
2. Parse: node --check api/space-coast-launch.js, lib/space-coast-decision.js, public/synced-national-tools/space-coast-launch/app.js.
3. API schema: ok=true, upcoming array, next, weather, nextDecision.schedule, verified boolean on accessSource, viewpoints array, parkAlerts array.
4. Venue-specific gate: an active NPS closure for lots 8–13 marks only north Playalinda closed; south lots remain access-unverified.
5. LL2 coarse times: day/month/year carry no localized precise time and no positive seven-day hourly weather verdict.
6. KSC pad rule: Gantry is not eligible for LC-39A/B.
7. Error path: if both NPS sources are unavailable, Playalinda is unknown, never open.
8. Sync protection: do not pull space-coast-launch API/index/app from the old pinned national-outdoor-tools-hub bundle.
9. SEO: retain canonical URL, site ads and existing national directory references. No extra page or conflicting route.
10. Preview source/route and mobile check. Do not claim public preview verification if Vercel authentication blocks direct browser access.

## Known limitations and next investments

- A high-traffic production launch feed requires a durable shared cache, paid LL2 rate access or another authoritative licensed source. Fifteen-minute regional CDN caching is not a guaranteed global rate limiter.
- The venue catalog cannot prove launch-specific NASA/Space Force security closure, parking availability, ticket on-sale status or entrance queues.
- No accepted trajectory source means no guarantee of rocket climb direction, booster visibility or cloud intersection. NWS short forecasts are surface-level context only.
- NPS notices may not be geometrically structured at parking-lot granularity; decisions require conservative location-specific title/description rules.
- Add a fully verified park-access/parking geometry map, actual park-hour exceptions, and mission-specific official launch-site event monitoring next.
- Test live delay/scrub latencies before creating any "live launch now" countdown guarantee.
