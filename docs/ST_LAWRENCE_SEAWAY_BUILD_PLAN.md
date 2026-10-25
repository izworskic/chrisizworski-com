# St. Lawrence Seaway: live ships, shore visits, and the water staircase

Planning recommendation • October 23, 2026 • Chris Izworski

## 1. The product to build

Build a Seaway ship-watching and lock-exploration tool around a practical question:

**“Where can I see a Seaway ship today, and what will I be watching?”**

The eventual higher-value question is “Which ship can I catch next, and where?” That promise requires better evidence than a nearby AIS position. Keep it as a gated capability, rather than pretending the existing AIS integration supplies scheduled lock arrivals.

Use one corridor hub at the proposed `/st-lawrence-seaway/`, connected to a small number of destinations with independent utility. Start with an Eisenhower Lock experience at the proposed `/eisenhower-lock/`. Check existing routes and registry before reserving these paths.

Keep `/welland-canal/` as the established Welland product. The hub explains its place in the system and links to it; it does not replace its title, copy, or search intent. Likewise, preserve the separate jobs of Freighter Central, the lake-wide freighter tracker, Soo Locks, and Duluth.

This is a product hypothesis grounded in available sources and existing site capabilities. No keyword volumes, conversion rates, or traffic forecasts were established in this research. Semrush returned an insufficient-API-units response.

## 2. Geographic scope and launch order

The official Seaway describes seven locks between Montreal and Lake Ontario and eight in Welland. The broader Great Lakes–St. Lawrence waterway reaches much farther. Make that distinction visible so visitors understand what they are exploring. [S1]

| Area | Proposed role | Distinct visitor job | Release priority |
| --- | --- | --- | --- |
| Montreal–Lake Ontario corridor | Core of the new hub | Find ships, locks, and shore access along the river/canals | Initial release |
| Eisenhower / Massena | First detailed destination | Plan a close-up lock visit with visitor-center context | Initial release |
| Iroquois | Next destination candidate | Watch ships at a documented public observation area; understand a control lock | After coverage and access checks |
| Thousand Islands | Next regional candidate | Find a scenic river-passage viewpoint rather than a lock | After route and viewpoint validation |
| Montreal / South Shore and Beauharnois | Later regional experience | Compare accessible city/canal viewing opportunities | After local access verification |
| Welland | Existing linked destination | Explore its eight-lock climb and existing ship watch | Reuse existing page |
| Lower river below Montreal | Future extension | River/port watching with a different geographic scope | Not initial scope |

Include all seven new-corridor locks in the hub's geographic and educational layer: Saint-Lambert, Côte-Sainte-Catherine, the two Beauharnois locks, Snell, Eisenhower, and Iroquois. Do not assume every lock has visitor access. Publish individual pages only when they add their own useful data, verified public access, photographs, interpretation, and decision support.

Eisenhower has a documented visitor center, observation decks, and exhibits. The official page currently distinguishes peak and non-peak opening patterns. South Dundas documents ship viewing and parking at Iroquois Point. These make both strong research candidates, not proof of search-volume superiority. [S2, S3]

## 3. Search opportunity

The official Seaway already offers vessel information, a map, and lock order of turn. The opportunity is to connect that information to an understandable, worthwhile visit. An additional vessel map by itself offers limited differentiation. [S4, S5]

| Search-intent hypothesis | Proposed owner | What earns the click and the return visit |
| --- | --- | --- |
| St. Lawrence Seaway ship tracker / ships today / live map | Corridor hub | Usable corridor map, recent ships, regional filters, shore-viewing context |
| Eisenhower Lock ship schedule / ships today / visitor center | Eisenhower page | Recent local ships, direct official queue access, visitor hours, directions, lock model |
| Iroquois Lock ships / ship watching | Future Iroquois page | Verified viewing access and location-specific explanation |
| Thousand Islands ship watching / freighters | Future regional page | Named public viewpoints, passing-ship context, river geography |
| How Seaway locks work / Seaway lock map | Hub interpretation | Interactive route profile and a scientifically honest lock demonstration |
| Seaway opening / closing dates | Seasonal section on hub | Current official notice, section-specific dates, update history |

Draft hub title: **St. Lawrence Seaway Ship Tracker: Live Map & Locks**.

Draft Eisenhower title: **Eisenhower Lock Ships Today: Live Map & Visiting**.

These are working titles. Check actual SERPs, the eventual feature set, existing-site query ownership, and available Search Console evidence before committing them. Use “schedule” in a page promise only when users can reach clearly attributed official schedule information; AIS activity is not a schedule.

Validate US and Canadian search intent separately when keyword data is available. A French experience could be valuable for Quebec later, but needs its own useful localization and editorial review.

## 4. The page experience

### The first screen

Use a restrained real photograph and a short place-setting introduction. Put the actual tool immediately beneath it. On mobile, the region selector, freshness summary, first ship card, and map entry should appear before a long history lesson.

Recommended reading order:

1. Region and purpose: “Watch a lock,” “Watch ships on the river,” or “Explore the Seaway.”
2. Recent local ship activity with report age and an official queue link.
3. Prominent interactive map, synchronized with ship cards.
4. The selected public viewing plan: exact entrance, access, hours source, facilities, directions, and what is worth seeing if traffic is quiet.
5. Interactive lock and route interpretation.
6. Historical/observational charts, seasonal notices, and related destinations.

Use location on request, with a manual location/region alternative. Default to the visitor's chosen side of the border; let them explicitly include both countries. Do not silently suggest an international crossing as a nearby alternative.

### Live map and ship cards

- Reuse the established CARTO configuration and existing fallback pattern.
- Reuse the Duluth-style ship silhouettes, with appropriate scale, stable identity, and heading/course handling. Unknown heading must remain unknown.
- Keep ships, numbered lock dots, and public viewing icons visibly different.
- Tapping a ship selects its card; selecting a card focuses its ship. Tapping a viewpoint opens its access details and directions.
- Preserve pan, zoom, and selection during refresh. Offer an explicit “return to region” control rather than repeated recentering.
- Keep name, observation age, speed when reported, source, and selected-state information visible without hover.
- Bound requests by region/viewport. Audit provider result limits and truncation before covering this long corridor. A broad capped response must not masquerade as complete coverage.

V1 cards can truthfully say “recently reported near Eisenhower” or “recent activity near this viewpoint.” They must not say “next into the lock,” “locking now,” or “arrives in 14 minutes” without the evidence required for those specific claims.

## 5. Interactive models, charts, and graphs

| Feature | User question | Primary representation | Evidence and boundary |
| --- | --- | --- | --- |
| Lock cutaway | How does a ship climb or descend? | HTML controls and SVG side-view animation | Educational simulation; play/pause, step, scrub, upstream/downstream; never presented as live gate telemetry |
| Seaway elevation profile | Where are the climbs, canals, and open reaches? | Annotated SVG profile coordinated with the map | Verified reference elevations, clearly labeled datum and schematic distances where applicable |
| Ship/chamber comparison | How tight is the fit? | To-scale plan view and dimensional labels | Use known dimensions; hide clearance calculation when inputs are missing; do not infer navigational compliance |
| Passage activity by hour | When have we observed traffic here? | Hourly bars with dates and coverage indicator | Requires deduplicated passage observations and a known observation window; not AIS message counts |
| Seasonal traffic pattern | Which parts of the season have more reported traffic? | Monthly line or bar chart | Historical official series after schema and definitions are verified; not a daily arrival predictor |
| Selected vessel journey | Where has this ship been reported? | Timestamped route points and an event list | Only retained/permitted actual observations; gaps stay gaps; no invented track or scheduled itinerary |

Build the models in HTML/CSS/JavaScript with SVG for the explanatory graphics. Start with a 2D cutaway that makes water levels, gates, valves, and the ship understandable. Consider 3D later only if it adds a useful view of the mechanism.

Model Iroquois appropriately as a control-lock case; do not reuse an exaggerated high-lift animation for every lock. Use verified, lock-specific dimensions and geometry. The existing Welland contract calls its marker coordinates approximate, so they are unsuitable as unverified chamber polygons. [S1, S6]

The BTS catalog lists a public Seaway vessel-transits dataset. It is a candidate for historical charts; the catalog does not establish that it contains per-vessel arrival history or hourly lock observations. Inspect its actual series, units, temporal granularity, revisions, and completeness first. [S7]

All graphics need tap and keyboard controls, direct labels, readable text alternatives, and reduced-motion behavior. Use an accessible table as the fallback for charts and vessel lists. The lock animation must be usable paused.

## 6. Data and truth contract

The current Welland code was inspected in `api/welland-canal.js`, along with `docs/WELLAND_CANAL_SOURCES.md`. It reuses `lib/soo-ais`, filters recent bounded AIS observations, and returns an explicit `isSchedule:false`. Its official queue is an outbound link, not an ingested data feed. Preserve that boundary. [R1, R2]

| Layer | Starting point | What it can support | What remains unproven |
| --- | --- | --- | --- |
| AIS positions | Existing Open Waters / shared normalization | Recent ship reports and local map/list views | Reliable coverage throughout the Seaway; continuity; provider caps |
| Official queue | Seaway order-of-turn pages | Direct source access at launch | Supported permitted machine-readable ingestion and republication |
| Lock reference inventory | Official Seaway material | Names, connections, educational interpretation | Exact footprints and current per-lock operating values |
| Public viewpoints | Operator, municipal, park sources | Viewing plans and directions | Every site's current access, parking, and entrance coordinates |
| Seasonal status | Current notices and radio messages | Sourced opening/closing information | Automatic interpretation of every amendment |
| Historical statistics | BTS and official reports | Clearly labeled historical charts | Final dataset schema and appropriate comparisons |
| Cameras / images | Verified operators and licensed photographs | Place-specific visual context | Embedding permission, uptime, and camera view at each site |

AIS, schedule, access, and notices must have separate timestamps. A page-level “updated now” label must not imply an old ship report is fresh. Distinguish loading, fresh, partial, stale, unavailable, off-season, and “no fresh reports received.” The last of these does not mean there are no ships.

Do not scrape around authentication or CAPTCHA. The existing repo contract explicitly requires a supported licensed/authorized route before first-party official queue ingestion. Link to the source until that is resolved. An engineering team must not treat rendered public HTML as an established production API. [R1]

Future arrival windows require permitted source access, channel-route distance, direction, recent consecutive observations, stops and intervening locks, uncertainty, and measured performance. Straight-line distance divided by speed is insufficient. Keep predictions disabled until an evidence-based acceptance threshold is defined and passed.

## 7. Technical and operating shape

Use one shared Seaway data contract with regional adapters and reusable UI components. Reuse working AIS normalization, ship marker styling, CARTO setup, source-state handling, and analytics conventions. Inspect their current implementations rather than copying a single broad bounding box into a corridor endpoint.

Server-render/static-render the useful destination content, reference inventory, and explanations. Enhance with JavaScript. Keep dynamic map/list state in shareable URLs: region, viewpoint, vessel when valid, and selected educational lock. Preserve browser back behavior. Do not index every filter combination or publish an indexable page for every vessel.

Cache bounded requests, pause background refresh while the tab is hidden, lazy-load cameras/models below the main tool, and retain last successful observations visibly labeled when possible. Do not interpolate missing AIS history to create the appearance of live tracking.

No new paid API, runtime LLM, Redis, or Upstash dependency is proposed. Historical charts should use existing datasets first. If future observation history needs collection, design retention and storage using an already approved durable option before enabling it. A 72-hour audit is proposed work, not an automation started by this plan.

Use real site-specific photographs with documented rights and credits. Keep the experience in a cohesive tool shell consistent with the user's preferred Pictured Rocks structure; do not change AdSense configuration or promise a specific ad reduction.

## 8. Delivery sequence and acceptance

**Step 1 — Feasibility and inventory.** Audit the existing implementations and route registry. Sample AIS coverage across Montreal, Beauharnois, Massena, Iroquois, and the Thousand Islands over a proposed 72-hour observation period. Record timestamps, gaps, caps, and source outages. Verify official queue access options, exact public entrances, and photo sources. Document source terms and coverage limits. No blind full-corridor launch.

**Step 2 — A complete first visitor journey.** Build the hub plus Eisenhower: useful map near the top, stable ship silhouettes, recent-ship cards, direct official queue access, verified viewing plan, one accurate interactive cutaway, and a route profile. Link existing Welland. If AIS is weak, narrow or relabel the live promise before release.

**Step 3 — Data-backed interpretation.** Add the verified historical chart, dated seasonal notices, and any camera with confirmed provenance and embedding rights. Add activity charts only after enough valid observation history exists.

**Step 4 — Selective geographic expansion.** Add Iroquois and/or Thousand Islands when coverage and visitor inventory support a distinct experience. Decide order using measured search queries and engagement. Research Montreal/Beauharnois access more deeply before adding a dedicated regional page.

**Step 5 — Predictions and notifications, if justified.** Treat supported queue integration, evaluated arrival windows, and opt-in alerts as a separate capability with its own evidence gates. Nothing in this plan authorizes sending messages or starting recurring monitoring.

Release checks:

- Map/list parity, stable MMSI identity, correct region and country, bounded and disclosed coverage.
- Fresh, stale, unknown-heading, duplicate, capped-response, no-report, and upstream-failure scenarios.
- Verified lock dots and viewpoint entrances; synchronized map/cards; no refresh-driven zoom reset or flashing ships.
- Educational simulation unmistakably separate from live information; accurate water-level direction and lock-specific behavior.
- At 390px width, a first-time visitor can find recent local activity, an official queue link, and viewing directions without interpreting a dense dashboard.
- Keyboard and touch interaction; reduced motion; chart/list fallback; useful content when JavaScript or live data fails.
- Correct canonical, crawlable static value, relevant internal links, sitemap entry, social metadata, and central Chris Izworski Person identity with visible creator link.
- Run the existing repository growth review manually for this release, appropriate verification/CI, and production smoke checks. Do not add a growth job to every merge.

Suggested planning rubric: evidence quality 30 points, finding and acting on a viewing plan 25, live map/list reliability 20, interpretation 15, mobile/accessibility 10. This is a proposed evaluation rubric, not a measured quality score. Fabricated arrivals, false official queue claims, wrong-location imagery, or unusable ship interaction fail the release regardless of total score.

## 9. Growth measurement

Capture region changes, ship selections, viewpoint selections, directions clicks, official queue clicks, lock-model interaction, and handoffs to Welland and other maritime tools. These measure actions, not proof of a successful ship sighting.

Use Search Console to establish indexing and query ownership, then evaluate 28- and 90-day windows. Report branded/nonbranded queries, US/Canada, device, page, impressions, clicks, CTR, and position. Compare query-level changes rather than treating all CTR changes as title-copy effects.

Judge geographic expansion on observed demand plus useful visitor actions. Do not assign an invented slice of the one-million-impressions goal to this tool, or interpret the site-wide 5% CTR aspiration as a forecast. Ship a genuinely useful small network and expand where evidence supports it.

## Sources and inspected repository files

Public sources reviewed October 23, 2026. Operational facts and access require rechecking before implementation/release.

- [S1: Official locks and channels](https://greatlakes-seaway.com/en/the-seaway/our-locks-and-channels/)
- [S2: Official Eisenhower Lock visitor center](https://www.seaway.dot.gov/explore/seaway-visitor-center)
- [S3: South Dundas — Iroquois Lock](https://www.southdundas.com/recreation-tourism/attractions/iroquois-lock)
- [S4: Official vessel order of turn](https://seaway-greatlakes.com/vessel-transit/order-of-turn)
- [S5: Official Seaway map](https://greatlakes-seaway.com/en/navigating-the-seaway/seaway-map/)
- [S6: Official Montreal–Lake Ontario lock reference booklet](https://greatlakes-seaway.com/wp-content/uploads/2019/10/montreallakeontario.pdf) — historical reference; verify current engineering values
- [S7: BTS vessel-transits dataset catalog](https://catalog.data.gov/dataset/great-lakes-st-lawrence-seaway-vessel-transits)
- [S8: Official opening/closing information](https://greatlakes-seaway.com/en/commercial-shipping/seaway-opening-and-closing-information/)
- [S9: Current Seaway notices](https://greatlakes-seaway.com/en/news-and-information/notices/seaway-notices/) — the index lists an October 22, 2026 closing notice; use the latest operative notice, not an earlier target date
- [R1: Current Welland source/product contract](https://github.com/izworskic/chrisizworski-com/blob/main/docs/WELLAND_CANAL_SOURCES.md)
- [R2: Current Welland AIS endpoint](https://github.com/izworskic/chrisizworski-com/blob/main/api/welland-canal.js)
- [R3: Existing live Welland tool](https://chrisizworski.com/welland-canal/)

This deliverable is a research-backed build plan. No website changes, deployment, scheduled collection, or notifications were performed.
