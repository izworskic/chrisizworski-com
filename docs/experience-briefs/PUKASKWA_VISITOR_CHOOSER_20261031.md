# Pukaskwa Experience OS Visitor Chooser
Research checked October 31, 2026. Owning repo: izworskic/chrisizworski-com. Canonical: https://chrisizworski.com/pukaskwa-national-park/

## Visitor decision

A Circle Tour traveler has 30 minutes, two hours or a full day. Which hike fits the available time, hiking ability, and interests, and does Parks Canada's last dated official observation make the route a reasonable *planning candidate*? A reported-open trail is never certified open now.

## Source contract

- Hiking distances and return times: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking
- Official dated trail conditions: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions
- Operating hours: https://parks.canada.ca/pn-np/on/pukaskwa/visit/heures-hours
- Backcountry season and permits: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/arriere-back
- Hattie Cove driving approach: https://parks.canada.ca/pn-np/on/pukaskwa/visit/arriver-gettinghere
- Live snapshot provenance (not Parks Canada's official API): https://github.com/izworskic/chrisizworski-com/blob/pukaskwa-conditions-data/pukaskwa/conditions-latest.json

October 31 source situation: bridge officially closed Oct 22; short hikes previously marked open Oct 12; backcountry beyond conservative season date. Monitor timestamp is NOT official source observation issue time. Data branch checks four times daily subject to GitHub timing, 18-hour monitored heartbeat cap for positive status, and 7-day official Open observation age; outdated Open becomes stale. Any corrupt/unavailable source, failed monitor or older/same-day reopening yields no green. A last recorded closure remains a block.

## Research inspiration and concepts

External reference A: AllTrails trail filters at https://www.alltrails.com/ . Lesson: time and difficulty should genuinely change what is suggested; do not copy proprietary UI or use crowdsourced access for authoritative park status.

External reference B: Parks Canada's own Pukaskwa trail conditions and day-hike guide above. Lesson: individual issue dates and typical hiking times should be combined. Current separate official lists force visitors to reconcile their own decisions.

Existing system references: EXPERIENCE_OS_V1 (visitor outcomes and truth), FIELD_GUIDE_V1 (real image provenance), JOURNEY_ATLAS_V1 (trip-level handoff).

Concept A: full-bleed photographic story gallery, trail information and closures below fold. Rejected: visually impressive but answers arrive too late and access may be obscured.

Concept B: selected compact editorial wayfinder. A short genuine photograph beside the first-screen answer, dated official status banner, time/effort/scenery controls, answer and explanation, closure alternative, three photo locations, and eight statically readable trail cards. Avoids repeating existing tool card layouts, has a clear no-JavaScript path and small JS surface.

## Decision interactions and acceptance

- Time filter 30m, 1h, 2h, 4h, all day: eligibility changes using official hiking time. Time is actual time hiking at Hattie Cove, not an invented driving ETA.
- Effort easy/moderate/difficult: hard difficulty limit.
- Scenery coast/beach/forest/challenge: ranking changes with the experience, not random suggestions.
- Source state: closure removes route; stale and unknown are clearly marked planning candidates; unhealthy collector never yields recently reported open.
- Share: copy a non-personal URL and official source link; no browser storage or geolocation.
- 30-minute easy beach: Boardwalk Beach. 2-hour moderate coast: Southern Headland candidate, explicitly stale based on Oct 12 observation. Full-day challenge: bridge remains excluded on official Oct 22 closure. Missing source: no green.
- No-JS: eight fully written, source-linked routes and static warnings.
- Source cards show official observation date and retrieval date separately. No fake "open now" claim.
- Highway 627 adds 15 km each way from Highway 17; no invented driving duration.
- Distinct standalone canonical for park-level hike choice, versus 31-stop Circle Tour itinerary. Registry relations both directions and direct Circle Tour handoff.
- Title <= 60 chars, description <= 158, Person graph https://chrisizworski.com/#person, sitemap, tool directory. Preserve standard AdSense. No Redis.

## Verified photographs

- Southern Headland Trail, Andre Carrotflower, July 8 2015, CC BY-SA 4.0:
https://commons.wikimedia.org/wiki/File:20150708_-_38_-_Pukaskwa_National_Park,_Ont._-_Southern_Headland_Trail_-_%22Superiority%22.jpg
- Horseshoe Bay Beach, Hirgax, June 7 2025, CC BY-SA 4.0:
https://commons.wikimedia.org/wiki/File:Horseshoe_Bay_Beach,_Pukaskwa_National_Park.jpg
- Hattie Cove from Southern Headland, Andre Carrotflower, July 8 2015, CC BY-SA 4.0:
https://commons.wikimedia.org/wiki/File:20150708_-_30_-_Pukaskwa_National_Park,_Ont._-_Mouth_of_Hattie_Cove_as_seen_from_Southern_Headland_Trail.jpg

Individual photo credits, historic dates and share-alike licenses appear on page. No generated place photography, cultural-site pins or unverified maps.

## Technical and release

Serverless read-only API fetches the isolated monitoring branch without hitting Parks Canada for every visitor. Source fingerprints verified; error path returns unverified rather than last-green. HTML-first static answer; progressive ES module; responsive 360, 390, 768, desktop; reduced motion and keyboard focus; page keeps useful information with JS disabled.

Do not create a live trail map until official geometry, public parking and path relationships are verified. No permit inventory, paddling safety assurance, road ETA, future trail opening predictions, or precise cultural-site location maps.

Tests: node --test tests/pukaskwa-visitor-chooser.test.js ; GitHub Chromium QA for mobile/desktop/source outage/no-JS/photo decode; repository npm run verify:all. At writing, QA unmeasured. GSC, AdSense and actual visitor behavior NOT AVAILABLE. Check only after equal 7/28-day windows.

Next development after successful release: verified visitor-access and geometry layer with working CARTO basemap, distinct parked starts and trail network.
