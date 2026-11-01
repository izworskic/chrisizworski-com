# Porcupine Mountains visitor experience: repair and redesign brief

Status: in progress, not approved for release. Canonical: https://chrisizworski.com/porcupine-mountains/ .

## The problem
The page asks visitors to choose repeatedly, exposes internal GIS uncertainty before showing the map, and includes six dead DNR trail-detail links. A visitor needs an understandable place to start, the nature of the walk, a real map, and the particular things to check before driving. A matched GIS point does not establish a signed walking connection or current access.

## People and voice
- First-time Circle Tour couple with two hours: choose a memorable stop and see its location, walking commitment and seasonal approach without a long questionnaire.
- Family or visitor seeking a shorter, step-free experience: distinguish the Lake of the Clouds overlook and Nawadaha platform from stairs, rough river paths and the tower. Do not promise present accessibility.
- Waterfall seeker approaching from Wisconsin: find Presque Isle on the western side, see the dated 519 work-zone uncertainty and check a current source.
- Experienced day hiker or backpacker: find official trails, trail distances and crossing warnings without mistaking partial linework for a navigable route.
- Winter visitor or person towing a trailer: see relevant seasonal and vehicle-specific restrictions, without invented open gates or staging coordinates.

The narrator is a knowledgeable, welcoming interpretive park guide: grounded in the land, direct about what the visitor will experience, practical about the next decision, and never pretending to be park staff.

## Two approaches
1. A map-first field table: a clear map and three distinct areas; selecting a place reveals a short outing, walking details, route and seasonal cautions. Advanced comparisons and research remain optional. This meets the visitor's spatial and experiential decision in one connected journey.
2. A longer questionnaire that ranks outings: can account for time, mobility and arrival, but the existing multi-step planner and separate compare tool have made the page repetitive. Keep targeted planning inputs optional and connected to the same selected place, not a second parallel decision.

Choose approach 1. Unlike the Gooseberry time-budget waterfall walk and Tahquamenon waterfall experience, the Porkies decision is spatial: widely separated western, interior and eastern districts. The map should explain that distinction, with real park photography and interpretive detail, not clone either tool. Distinctiveness and actual rendering still need browser review.

## Acceptance benchmarks
- A first-time visitor can pick a place, see it on a real basemap, understand walking effort and find a next action without answering six questions.
- One chosen place remains consistent between card, map and detail; keyboard and touch work; test A→B→A and narrow screens.
- Short-walk, western waterfall, wilderness hiking, winter and large-vehicle scenarios each receive relevant source-qualified guidance, never an invented open status or hiking route.
- All visible links and dynamically rendered destination links audited, with any unresolved failures reported; source records remain historically honest.
- Six mapped points are labeled as documented parking points, not a live vacancy report or proof of a signed entrance. Road, parking, trail and accessibility claims use independently applicable primary sources.
- At 360, 390, 768 and 1440px, inspect screenshots with real tiles and photos; test no tiles, no JS, keyboard and network failure. Preserve usable official-map fallback and attribution.
- Preserve canonical, current noindex policy, ads, creator identity, safety gates and existing source evidence. Run product tests, full repository gate, exact-head browser QA and preview before a release decision; record failures honestly. Experience OS scorecard must be at least 90 with no hard-gate failure; no score until verified.

## Initial audit and work
Reviewed Nov 1: six former Michigan DNR individual trail URLs returned HTTP 404. DNR's [trail descriptions](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf), [park map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf) and [park page](https://www.michigan.gov/recsearch/parks/porkies) were retrievable. Replace visitor-facing dead links with relevant available sources; preserve historical evidence URLs as historical references, not as proof of current availability. Move the existing embedded map before detailed GIS discussion and remove unnecessary tile CORS mode, pending live tile testing. This is a first repair, not completion of the full brief.
