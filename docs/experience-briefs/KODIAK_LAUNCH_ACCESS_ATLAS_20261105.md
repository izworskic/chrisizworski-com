# Kodiak Rocket Launch Access Atlas — November 5, 2026

## Visitor outcome

The fifth connected launch-region field guide covers Kodiak Island's Pacific Spaceport Complex–Alaska without converting a bounded third-party launch calendar, a published park, or a range map pin into a claim of legal launch-day viewing.

Canonical: https://chrisizworski.com/kodiak-rocket-launch-viewing/

The page's own visual language is a remote coastal chart rather than a clone of Florida's venue ticket planner or Wallops's NASA sound-rocket atlas. The leading answer is **no confirmed public launch-day viewpoint**, followed by the road-check checklist, a mission-linked LL2 selection, and a strictly contextual two-point map.

## Evidence ledger

- Alaska Aerospace **Beyond Launch**, checked November 5: surrounding land may be used for recreation except during hazardous-operation closures; launch facilities are closed to ordinary visitors; educational group tours require arrangement. https://akaerospace.com/beyond-launch
- Alaska DNR, November 14, 2025 land management decision: Narrow Cape and Ugak Island safety zones may be closed for launch safety. This is the authority, **not a live closure feed**. https://aws.state.ak.us/OnlinePublicNotices/Notices/View.aspx?id=221720
- Alaska State Parks **Pasagshak State Recreation Site**: legitimate general day-use recreation and campground, not launch viewing permission. https://dnr.alaska.gov/parks/aspunits/kodiak/pasagsrs.htm
- Alaska State Parks reservation facility page: coordinate **57.47917, -152.44972** refers to the Pasersaq cabin within the recreation site; the main campground parking entrance is farther along the road. This pin is a published feature reference, explicitly **not** a launch spectator point or campground entrance. https://alaskastateparks.reserveamerica.com/camping/pasagshak-river-state-recreation-site/r/facilityDetails.do?contractCode=AK&parkId=1182200
- Alaska Aerospace **Spaceports**: PSCA site operations and polar/sun-synchronous orbit relevance; published range map reference is approximate, no visitor route. https://akaerospace.com/spaceports
- Kodiak Chamber listing: Pasagshak Road closure hotline **1-833-PSCA-321**. Treat as published reference, not confirmed current status; operator confirmation needed. https://comfishak.com/sponsor/alaska-aerospace-2/
- Alaska 511 alerts are supplementary road information, not a range safety approval. https://511.alaska.gov/List/Alerts
- Local reporting confirms an August 21, 2025 government launch with no public prior announcement, illustrating LL2 non-exhaustiveness. https://alaskapublic.org/news/public-safety/2025-08-25/government-rocket-makes-unscheduled-launch-from-kodiak-spaceport
- October 2026 local reporting documents expansion plans and continuing controversy over launch road closures. Any future viewing access road mentioned in reporting is **proposed, not built or authorized**. https://www.kmxt.org/news/2026-10-28/how-do-you-fight-that-kodiakans-concerned-about-access-at-spaceport-environmental-damage

## Source and code boundaries

- Reuses **only** the shared /api/rocket-launch-usa regional feed; launch location ID 25, Alaska Time, selected UUID in both directions.
- A source outage, expired UUID, truncated calendar, or date-only launch never becomes a false launch, access clearance or countdown.
- No new authenticated schedules, scrapers, Postgres schema, Redis, Supabase, NWS spectator forecasts, or traffic-driving directions.
- Static index provides the primary visitor safety answer without JavaScript, and source-backed place cards remain available if the map/CDN/API fail.
- The interactive map uses two explicitly labeled references, source-reviewed provenance and CARTO-with-OSM fallback. There is no flight trajectory, launch pad location beyond approximate range marker, road route, inferred ETA, or geolocation request.
- Exactly one sitemap URL with truthful 2026-11-05 lastmod; national selector, Guides and safe slash/slashless routes updated. No ad layout changes.

## Validation gates

1. Run node --test tests/kodiak-viewing-atlas.test.js, node --check public/kodiak-rocket-launch-viewing/app.js, npm run verify:all and the site build.
2. Check 360/390/768/1440 viewports; launch A to B to A with exact UUID, invalid/expired UUID, zero launches, stale/partial data and network failure.
3. Test map library/tile failure, no-JS source links, keyboard map selection, CARTO key absent, contrast and reduced motion.
4. Independently verify deployed HTTP, canonical, sitemap uniqueness, same-mission deep links, geographic source labels and responsive layout. Do not claim GSC improvement or production success until measured.

## Future higher-value trigger

Return to Kodiak when Alaska Aerospace publishes a reliable structured, dated road-status feed or a verified public spectator plan. A generic park description and old range closure press release must not be treated as permission to travel on launch day.
