# Rideau Canal Explorer | Research and experience brief
Date: 2026-11-17
Owner: izworskic/chrisizworski-com
Proposed canonical: https://chrisizworski.com/rideau-canal/
Status: Research and build planning only. NOT a deployed tool. This document is deliberately not a production release approval.

## Executive decision
Build a single distinctive Rideau Canal Explorer, led by the real-world decision "Where should I go, what will I see, and how much time should I allow?" Provide separate sightseeing, cruising and paddling journeys over one reconciled inventory. Begin with a verified, photo-led visit desk and a few strong official places. Then add a conservatively modeled boating planner after source, seasonal and geometry gates. Do not clone an existing paddle map. Do not call 2026 operational records "live" in 2027.

## Verified research, checked 2026-11-17
1. Parks Canada identifies 24 lockstations and 47 locks including the Tay Canal, on a roughly 202 km waterway. Its status portal also includes separately named locks, bridges and a visitor island. The **portal row count is not a lockstation count**. Normalize stations, chambers, bridges and other visitor locations separately. https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation and https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/points-retenir-navigation-facts
2. The 2026 navigation season closed October 12, with the operational portal showing seasonal shutdowns beginning October 13 (some notices November 3). Any 2027 date or opening claim is unverified until Parks Canada publishes it. The site warns it is not maintained in the off-season. https://parks.canada.ca/lhn-nhs/on/rideau and https://parks.canada.ca/lhn-nhs/on/rideau/visit/heures-hours
3. Parks Canada's 2026 last-lockage guidance is 30 minutes per chamber, and swing bridges need 20 minutes before closing. Actual lockages can be affected by staffing, management duties, weather and congestion. Ottawa deserves separate validation rather than treating any nominal formula as an arrival guarantee. https://parks.canada.ca/lhn-nhs/on/rideau/visit/heures-hours
4. The canal crosses lakes, rivers, narrow cuts and marshes. Paddlers often choose shorelines rather than the marked navigation channel and may portage instead of locking through. Navigation-channel distances are not predicted paddling routes. https://parks.canada.ca/lhn-nhs/on/rideau/activ/pagaie-paddling
5. The official visitor map explicitly states it is not suitable for navigation. Navigators should use the appropriate current Canadian Hydrographic Service charts 1512 and 1513 and notices, with vessel draft and clearance checked separately. https://parks.canada.ca/lhn-nhs/on/rideau/visit/carte-map and https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/aides-navigation-aids/cartes-nautiques-nautical-charts
6. Technical data lists approximate 3 to 5 days for a transit, whereas Rideau tourism suggests 5 to 7 days with the locks and sightseeing. The product must distinguish time-at-helm, lockage, unmodeled delays and leisurely stop budgets. There is no single authoritative ETA for every traveler. https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/points-retenir-navigation-facts and https://www.visitrideaucanal.com/plan-your-visit
7. Official station profiles supply separate verified addresses, GPS, facilities, navigation chart sections, distances, and histories. Smiths Falls Combined is an exception to generic chamber dimensions, so avoid inferring dimensions across stations. https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation/ecluse-lock-smiths-falls-combined-combine
8. Parks Canada's water level web information includes automatic stations typically updated every 24 hours plus less-frequently recorded manual readings. Data timestamp and source terms need independent verification before ingestion. https://parks.canada.ca/lhn-nhs/on/rideau/info/infonet/niveau-eau-water-levels
9. UNESCO describes the Rideau as a militarily motivated 19th century slackwater engineering system, largely still operating on its original line. The interpretation should explain what slackwater meant and why John By built this waterway, with human construction stories attributed to Parks Canada. https://whc.unesco.org/en/list/1221 and https://parks.canada.ca/lhn-nhs/on/rideau/histoire-history
10. Independent lockstation distance references follow the marked navigation channel and explicitly warn about difference from actual paddling distances. The source is useful for cross-checking only. Obtain permission or license review before copying a proprietary complete compilation. https://rideau-info.com/canal/lockstation-distances.html

## Competition and unmet job
- Parks Canada's traveller portal: authoritative conditions, bridge notices, station detail, official dates. Do not masquerade as its real-time service. https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation
- Kite Kingston Waterway & Paddle Planner: currently supports waypoint trip sketches, straight-line distance and time estimates, GPX export, real/near-real gauge layers, waterbodies, and shareable routes. Building a lesser clone has no defensible user value. It explicitly says its sketches are not navigation charts. https://kitekingston.com/waterway-planner/
- Rideau-info: extensive veteran guide, historic material, journey distances and lock descriptions. Do not copy text, photography or compiled tables without rights review. https://rideau-info.com/canal/visitor-guide.html
- Rideau tourism and Le Boat: polished itineraries and travel ideas; the former says 5 to 7 days for full boating transit. Provide an independent, cross-modal stop decision rather than only boat rental content. https://www.visitrideaucanal.com/plan-your-visit and https://www.leboat.com/boating-vacations/itineraries

Unmet visitor question: "I have three hours, a whole day or a week. Which section and specific locks make sense for my interests, and what rules and conditions actually matter to my chosen mode of travel?"

## Two product concepts, deliberately different
**Concept A: The Lock Explorer.** A long map, 24 lockstation icons, filtering and a details card, followed by visitor information. Pro: fast to build. Con: duplicates several existing directories and fails to answer a visit choice.

**Concept B: The Waterway Field Desk (selected).** A compact first answer followed by three unmistakably different journey actions: "Watch the locks", "Cruise the waterway", "Paddle a section". With sightseeing selected, visitors choose an available time budget and an interest such as engineering, historic village or scenery. A selected sourced stop changes the recommendation, map focus, exact photo and official source simultaneously. The historic engineering story is revealed with the stop rather than a generic hero. Cruising gets a different panel with ordered station segments, last-lockage budgets and constraints. Paddling gets proven launch/takeout information where actually verified, plus paddler-specific weather/wake and portage caveats. Pro: produces a plan, not a long catalog. Con: requires a disciplined multi-type evidence model and browser-tested state synchronization.

**Why B is distinct from existing tools.** Welland Canal chiefly answers where to watch vessel movement; Rideau answers which whole-day or multi-day historic experience fits a visitor. The Au Sable / Manistee float tools mainly plan downstream river segments; Rideau has locks, bridges, two travel directions, branch routing and a major land sightseeing audience. Reuse verified map and accessibility infrastructure, not the first-screen layout or destination copy. Current screenshots and physical browser comparison: NOT MEASURED, mandatory before release.

## First-screen experience
At 390px show: exact season label ("2026 navigation ended; 2027 dates not yet confirmed"), title "Rideau Canal: choose your journey", one explanatory line, three native journey choices, and the selected journey's first immediate, truthful recommendation. Avoid huge header photography and dashboard stat bricks. A scene-setting source-matched photograph or fine line lock-sectional illustration may appear *after* the first useful choice, never displacing it.

Tone: knowledgeable park interpreter. Explain a hand-cranked gate, a stone arch dam or historic blockhouse using each place's specific source. Avoid generic hype, fake agency authority, and mechanistic source-desk prose.

## Source ownership and model before code
Use a versioned static inventory with typed records, not flat coordinate guesses:
- `station_id`, official label and alias, official URL, mainline/branch, canonical direction order, linked chambers, linked bridge IDs, official place address/GPS and visitor role.
- `chamber_id`, parent station, chamber count/order, official dimensions where documented, verification date.
- `bridge_id`, type, schedule exceptions with source issue date, parent reach.
- `visitor_stop_id`, station/nearby attraction vs bridge vs island, confirmed approach and amenities, accessible evidence, Google Maps role, real photo asset and license.
- `segment_id`, from/to nodes, published navigation-channel length with source and rights, uncertainty; paddling alternatives **not** assumed to be the same geometry.
- `notice_id`, precise place/element, category, issued time, fetched time, source URL, season and expiration. Expired/failed source never implies open.

The Parks Canada portal contains more named lock and bridge entries than its stated 24 staffed lockstations; **reconcile the 24 station IDs against the official lock list and individual profiles before publishing numerical totals or route structure**. Distinguish the Tay Canal branch via a graph, not a line appended to the Ottawa-Kingston main stem. The Colonel By Island visitor destination must not be modeled as a lock chamber.

Proposed authority ladder: Parks Canada / Canadian Hydrographic Service / Canadian Coast Guard warnings for navigation and operations; land manager and local municipality for verified arrival and parking; UNESCO / Parks Canada for history; third-party travel guidance for itinerary ideas only; OSM data with proper attribution for map visualization. Link raw source per displayed claim.

## Specific initial experiences
1. A sightseeing desk with at least 6 diverse, officially verified anchors drawn from Ottawa Locks, Merrickville, Smiths Falls Combined, Jones Falls, Chaffeys, and Kingston Mills. Each anchor needs official details, sourced visitor approach, accurate photo or no-photo fallback, honest seasonal label, and "View in Google Maps" *place search*, not fabricated directions.
2. A station browser reconciled to the entire official inventory. Visible public and branch names, full official links, keyboard filtering, selected state, and bridge vs station vs visitor-stop types.
3. A practical itinerary selection for "short stop / half day / full day". Not an unverified driving distance or duration calculator. Recommend only a qualitative area cluster until road routing and time budgets are source-validated.
4. Boat journey stage: source-backed ordered lock graph, direction, start/end, vessel dimensions as guardrails, chamber count, calendar-confirmed hours and explicit separate travel/lockage/unmodeled-delay estimates. Stop early and show "cannot establish" if any essential gap remains.
5. Paddling journey stage: curated source-approved legs, independently validated put-in/takeout/portage or otherwise no route output; do not create a hazardous GPX line from straight segments. Link official charts and existing specialized planners for advanced routing.
6. Winter skateway: separate intent and eventual canonical, not a tab implying the entire 202 km canal is maintained for skating. National Capital Commission is the status authority. Defer until a separately verified winter source and distinct SEO decision contract exist.

## What each control must change
- Journey mode changes first recommendation, relevant source labels, supported controls, map category and action.
- Time budget changes actual shortlist and rationale, not merely a badge.
- Selected stop changes name, evidence, accessible map focus or explicit unmapped label, exact photo/credit and Google Maps place query by one stable ID.
- Start, end, direction and arrival date change the cruising itinerary and whether the constraints are satisfiable. 2027 date without published 2027 hours -> no supported lockage-time claim.
- Units change the display only; authoritative kilometers and station coordinates remain unchanged.
- Reset and A -> B -> A restore all connected states. No stale remote image can replace a newly selected place.

## Source freshness and release gates
- The last verified *official* 2026 status is seasonal shutdown. Publish no "open now" or 2027 hours until new official season evidence is issued.
- If source fetching fails, retain historical/editorial planning with "operational status unknown" and link to Parks Canada. Never substitute a fake observed transit, wait time, opening, water depth or lock availability.
- Official public visitor map is for orientation only. The user must see a chart warning for actual boating navigation.
- No built-in API or Redis is needed for the static first release; defer live ingestion until source rights, rate limits, timestamps and failure paths pass.
- Exact photography with verified license, visible creator and source link only. No AI-generated location photographs, no reused wrong-lock image.
- Use the main site's shared Google Maps standard. Location search is not verified driving directions, and bridge/gate pins are not public parking entrances.
- HTML-first essential content, one canonical intent, correct Person schema `https://chrisizworski.com/#person`, standard shared Auto ads loader, no surprise SEO or ad policy changes.
- On launch, register a directed network node, visible Tools card, ItemList order, sitemap and source relationships in the same PR.
- Required tests: station grouping/count/branch; idempotent selected state; A -> B -> A and share-link recovery; no-JS source and place links; stale/2027 no-schedule state; unsupported length/draft/clearance; low-time-budget refusal; units; photo races/failure; maps missing; touch/keyboard; official no-navigation-map disclaimer; 360/390/768/1440px loaded-map browser screenshots; exact photo rights; full repository `npm run verify:all`; post-merge public smoke.
- Experience OS score requirement: >=90 with each area >=4/5, distinctiveness veto separately, no unmeasured claimed passing grade.

## Repository state and implementation
Main verification is now green: commit `4c63d5ac8323caefde8399585d96d0548ef7f327`, run https://github.com/izworskic/chrisizworski-com/actions/runs/44216834627. This cleared the previous red main blocker before Rideau development began.

Implemented on `feature/rideau-canal-field-desk-20261117`:
- `data/rideau-canal/locations.json`: 26 operational lock entries covering 24 grouped stations, 47 chambers, 15 separately named bridge entries, and one visitor-only island. Exact source-linked coordinates and interpretation for seven audited public-location profiles only.
- `public/assets/rideau-locations.json`: byte-identical published mirror; parity pinned by tests.
- `public/rideau-canal/index.html`: standalone noindex, source-first visit desk and fully readable JS-failure links, with declared canonical but no public launch/Tools card or sitemap yet.
- `public/assets/rideau-canal.js`: visitor mode, time/interest choices, separate channel reference distance and paddling source mode, map/list/selected evidence, photo token protection, shareable state and map fallback.
- `public/assets/rideau-canal.css`: distinct responsive page style with front-loaded choice.
- `tests/rideau-canal.test.js`: inventory grouping, provenance, metadata, photography, route safety and script syntax gates.

**Limitations:** Browser/visual acceptance, network-loaded map and Wikimedia photo bytes, all official profile coordinates beyond seven, 2027 hours, source ingestion rights for automated live operational status, source-approved paddle route legs, measured actual user demand and AdSense outcomes are NOT VERIFIED. The new page is a noindex preview, not a released canonical tool.

**Next release gates:** confirm PR head against current main, run source and full repository CI, real 360/390/768/1440 browser journeys, image rights/loaded photo checks, and actual tiles/failed-network behavior. Only after QA and source validation should the noindex be removed and Tool Network registry, Tools card, ItemList, sitemap and contextual navigation be launched in one atomic reviewed change. Do not confuse a passing unit test with that future public release.

## Exactly one next implementation action
Run actual browser interaction and loaded-media QA against the noindex pilot, fix issues, and document evidence. Do not publish or claim a 90/100 score without observing the experiences.
