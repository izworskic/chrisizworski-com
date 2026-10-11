# Welland Canal Live — source, product and search contract
Date: 2026-10-11 | Canonical: https://chrisizworski.com/welland-canal/ | Owner: `chrisizworski-com`

## Visitor decision and non-cannibalization
**Decision:** Where should I watch a vessel at the Welland Canal today, and which official transit information should I check first?
This is distinct from `/great-lakes-freighter-tracking/`, which owns lake-wide AIS queries, and `/freighters/`, the multi-port discovery desk. It is analogous to Soo Locks and Duluth but provides canal-specific geographic value, an eight-lock selector, source-specific schedules, and Ontario visitor guidance. Do not spin off per-lock thin keyword pages without new independent data/utility.

## Primary/official research sources
- St. Lawrence Seaway Management Corp. named vessel transit reports: https://www.seaway-greatlakes.com/vessel-transit
- Official vessel order of turn: https://www.seaway-greatlakes.com/vessel-transit/order-of-turn (dynamic contents may be subject to access/HTML changes)
- Official Seaway ship map: https://greatlakes-seaway.com/en/navigating-the-seaway/seaway-map/
- Official Welland notices to shipping: https://greatlakes-seaway.com/en/news-and-information/notices/notices-to-shipping-welland-canal/
- 2026 pleasure craft published schedule and booking: https://greatlakes-seaway.com/en/pleasure-craft/
- St. Catharines Museum / Welland Canals Centre and viewing platform near Lock 3: https://www.stcatharines.ca/arts-culture-and-events/st-catharines-museum-and-welland-canals-centre/visiting-us/
- Thorold Lock 7 viewing centre: https://www.thorold.ca/recreation-culture-community/canals/lock-7-viewing-centre/
- Canal history, approximate length, locks, dimensions: https://en.wikipedia.org/wiki/Welland_Canal
- For reference on named ships, historical timetables and additional sources: https://www.greatlakes-seaway.com/
- Existing shared Open Waters AIS integration: `api/soo-ais.js`, `api/duluth-canal.js`; attribution https://openwaters.io/ais/

## Truth and freshness
- `/api/welland-canal` fetches the existing public Open Waters AIS feature collection in a bounded Niagara Peninsula rectangle; filters by 30-minute position age, geographic boundaries and valid MMSI; cache 60 seconds, background refresh every 2 minutes.
- It deliberately DOES NOT scrape official order-of-turn HTML or claim an API/permission to commercial schedule data. The CTA opens the current authoritative data directly.
- AIS is an observation, not proof of a lock appointment, waiting order, transit time, current lock occupancy, nor a navigation chart. No false empty reports on outage.
- Lock coordinates are **approximate** map reference dots, not chamber polygons or navigation waypoints. Lock 4–6 especially are coarse markers within Thorold's flight locks; confirm ground accuracy before higher-precision lock occupancy or arrival alerts.
- Direction derived from reported course is only directional context. A missing course, stationary vessel or ambiguous heading must remain UNKNOWN.
- No camera embed until source operator, reliability and permitted embedding are verified. The source material does not establish a stable camera feed.
- No server push notifications or predictive ETA until trustworthy official machine-readable lock scheduling/authorization and validated channel routing.
- Recheck seasonal pleasure-craft schedule annually; in 2026 the official period and day pattern differ for early and late season.

## Product and measurement
- Canonical indexable static page plus noindex API; related-tool links in the freighter hub and tool directory, registry node and sitemap.
- Reuses the project's central canonical Chris Izworski Person ID: `https://chrisizworski.com/#person`; visible creator link points to `https://chrisizworski.com/chris-izworski/`.
- Search targets to *measure, not assume*: “Welland Canal ships today,” “Welland Canal ship schedule,” “Welland Canal Lock 3,” “Welland Canal ship watching,” “Welland Canal live map.” Separate branded and nonbranded queries in GSC.
- GA4 page views, manual clicks to official schedule and referrals to related owned maritime tools should be evaluated; do not assert revenue or CTR from impressions without measured data.
- No purchased new data/API dependency introduced; still depends on existing Open Waters service.
- Acceptance: fresh AIS and no-AIS scenarios, list/map parity, all 8 selectors, timestamp timezone, mobile, CTA targets, FAQ factuality, schema, sitemap, tests, then `npm run verify:all` and production checks. **Do not merge on red CI.**

## Next improvement only after launch data
Acquire an official *machine-readable and permitted* Seaway order-of-turn feed (or verify a stable/public legally reusable source) and compute a defensible lock-specific next vessel recommendation with explicit source/age. Otherwise retain current non-predictive result.
