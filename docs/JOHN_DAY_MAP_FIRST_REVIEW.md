# John Day: map-first acceptance review

Owner correction, October 22, 2026: expose AIS ships, lock dots, the animated lock, viewing areas and incoming-vessel cards without making visitors search through prose.

## Implemented reading order

1. Compact place header, then ships/map workspace. No trip-planner form before the map.
2. CARTO raster map using locally served Leaflet 1.9.4 (BSD-2-Clause), with circular lock markers, directional AIS vessel markers and separate green recreation circles. No WebGL dependency.
3. Adjacent automatic AIS cards: name/MMSI, age, speed, straight-line distance, course context and reported destination. Nearest reports first. The course-toward label is a geometric interpretation, not a lock queue or a route-aware ETA.
4. Visible shore cards linked to markers and named-place directions: Giles French (river/dam landscape, no promised close-up chamber view), LePage (confluence recreation, no chamber view), Bonneville alternative for a seasonal close-up visitor area. Confirm current access with official sources.
5. Visible SVG teaching animation: play/pause, scrub, reverse direction, gate closure/opening, vertical water change and entry/departure. Explicitly illustrative, accelerated, not to scale, not current operations. Reduced-motion users step through it.
6. Optional trip planner, boating rules, river observations, and evidence detail after the primary experience.

## Source checks

- Production `/api/john-day-ais` and upstream Open Waters bbox query both returned zero features on October 22 evening local time. This establishes a receiver-data gap, not an empty river. Do not invent names, incoming schedules, transit counts or arrivals to fill cards.
- Public USACE LPMS home documents official queue reports updated every 15 minutes, but web retrieval of its report/service links redirects to the home page. Retain the official queue action; no unverified scraper or fabricated queue is introduced.
- Lock reference coordinates: USACE Lock Characteristics FeatureServer.
- LePage coordinate 45.7283972, -120.6512639: Recreation.gov campground 233536 structured data.
- Giles French approximate park point 45.709987, -120.695347: Campendium listing; park existence/river recreation verified by USACE Corps Lakes G208480. Not a surveyed entrance or a chamber-view guarantee.

## Acceptance gates

- Map and vessel area precede planner; animation has no hidden parent or tab-only entry.
- Lock dots select the matching lock detail. Viewing cards select the matching park popup; named directions remain available without map tiles.
- AIS loads on first visit, refreshes every two minutes while visible, filters expired reports, and never labels zero reports as zero incoming traffic.
- Card → marker and marker → card selection stay coordinated; late map initialization keeps selected MMSI.
- Simulation play changes boat/water/gate geometry; pause/hidden-page stop, scrub, reverse, restart, reduced-motion progression work.
- Phone portrait uses map → vessel cards → viewing cards → simulation; no horizontal page overflow.
- Existing navigation-rule and water-data source/safety tests remain in force. Update obsolete MapLibre/tab-specific assertions to the new render/interaction contract; do not remove truth assertions.

Status and preview/release evidence belong in the review PR. No ranking, traffic or revenue gains claimed.
