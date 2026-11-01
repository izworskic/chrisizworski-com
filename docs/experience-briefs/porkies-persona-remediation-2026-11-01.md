# Porkies visitor-first experience: three persona fixes
**Owner:** izworskic/chrisizworski-com · **Canonical:** https://chrisizworski.com/porcupine-mountains/ · **Date:** November 1, 2026 · **Experience OS:** latest 1.2.1 rules and v1 park storytelling.

## Research reason and two paths considered

The [16-persona live-browser pilot](https://github.com/izworskic/chrisizworski-com/actions/runs/41302790278) flagged five users: three campers/trailer drivers whose main itinerary had **no vehicle restrictions**, and two short-time visitors whose desired waterfalls/mountain views were replaced because they entered from the far side of the park. On 390px phones the full planner began ~4,876 CSS pixels down (~5.8 initial screens), although the existing hero CTA linked to it.

**A. Reject or hide any distant attraction, put every vehicle restriction below the map, and move the entire form to the hero. REJECTED.** This optimizes a simplistic shortest-route score without verified driving time and destroys the existing photographic, thoughtful field-guide landing. The original failure persists for the visitor who specifically wants falls.

**B. Preserve the page's real-location field-guide composition while building three connected choices. SELECTED.** In the first answer, show actual DNR vehicle staging limits; when the desired experience conflicts with a short arrival-side itinerary, offer an explicit reversible *nearby / separate destination* fork, neither called a safe/quick route. On the first screen, offer three compact editorial attraction links (view / falls / old forest) that move focus to the real date+access planner. Links remain valid without JS. The selected route-intent is reflected in the primary answer, A/B comparison, browser URL state and copied text, with no fabricated transfer time.

## Primary official research, inspected November 1, 2026

- [Michigan DNR 2025 visitor guide, *Scenic areas*](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf). At Lake of the Clouds, the DNR **recommends visitors drop trailers/campers at the middle ski hill parking area off M-107**; for Summit Peak, it **recommends a designated staging area near the South Boundary Road turn-off**. The guide does *not* certify a particular modern staging GIS point, year-round entrance, motorhome length clearance, open lot, or passable road. Those are not inferred.
- [Michigan DNR Porcupine Mountains park guidance](https://www.michigan.gov/recsearch/parks/porkies). Distinguishes the east winter approach and the west Presque Isle area; records accessible *Nawadaha* platform, not entire falls circuit.
- [DNR paper park map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf). Distinct districts and unbridged river crossings. No inferred cross-park drive in two hours.
- [21-trail source descriptions](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf). Summit tower 0.5-mile approach plus stairs; East/West River separate trails, NOT a verified walking loop. Source editions disagree on Escarpment mileage (3.7 vs 4.3 mi), preserved as a caution.
- Two external mechanisms rechecked: [NPS app trip planning](https://www.nps.gov/subjects/digital/nps-apps.htm): activity selection then official park/access evidence; [GOV.UK design principle](https://www.gov.uk/guidance/government-design-principles): meet a real user need with a straightforward initial decision. **Adapt mechanism, not visual skin**: the Porkies' unique journal-style wilderness front page stays intact.

## State and decision model

| Visitor interaction | Source of truth | Primary answer, secondary source and fallback |
| --- | --- | --- |
| Car↔RV↔trailer (all seasons) | Shared `vehicleCautions(vehicle, stops, season)` in `porkies-explorer.js`, fed by DNR scenic-area instructions | Large-vehicle concerns shown **before** proposed stops in main result; same policy surfaced in A/B comparison. For #841 Presque, signed contact-booth and turn remain unverified. No vehicle-safe turn-by-turn guidance. No-JS DNR text and link persist. |
| Western arrival + ≤4h + views | DNR district source, no cross-park time feed | *Stay near arrival*: Presque Isle local river, not misrepresented as a view; *Choose panorama*: Lake of the Clouds as **separate trip, not guaranteed within budget**. Both plans have reversible buttons, updated source-backed comparison and share link. |
| Eastern arrival + ≤4h + falls | Same | *Stay nearby*: Lake of the Clouds, not misrepresented as a waterfall; *Choose falls*: west Presque Isle as **separate trip, no verified ETA**. Reversible choice updates main result and comparison. |
| View / falls / forest at first screen | Source-led park experiences and actual labeled anchor to `#decision` | Selecting interest pre-fills planner and focuses date; does not silently submit, promise parking/roads, or track location. With JS off, native anchor still leads to usable planner, source links and 6 verified parking cards. |
| GIS, map, photos, external source unavailable | Static HTML and DNR links | All six existing parking records and static comparison remain, no fabricated opening. No dependency introduced on external source to render initial hero or planner. |

**Explicit limitations:** This source policy does not establish current RV/trailer clearance, precise lot coordinates for staging, road opening, parking space, or actually attainable short-trip ETA. Visitor interest selection is a preference, not a route authorization. The page remains `noindex,follow`, and existing Canonical, Person JSON-LD, AdSense, map layers and DNR provenance remain unchanged.

## Release acceptance

- Source tests cover 3 RV/trailer personas, two reversible travel-intent personas, no-change ordinary trip, low mobility, January/May gate restrictions, and no route-time calculations.
- 340, 390, 768, 1366px Chromium browser: first-screen attraction selector within initial phone viewport; keyboard focus date on click; report's destination and comparison A/B both update and reverse; car→RV→trailer changes actual result; shared source warnings; signed-trailhead and map restrictions remain.
- 16-persona regression (original scripted input/goal matrix) must rerun against **deployed production** after merge, separately from fixture-backed PR testing. Human completion, search traffic and CWV are NOT measured.
- Full repository `npm run verify:all`, Porkies browser QA, Name SERP guard, emitted public HTML audit and exact-head preview Vercel success before merge; Vercel production READY on merge SHA and independent canonical smoke afterward.

## Transferable rule

**Never silently swap the destination the visitor asked for because their time budget is narrow.** Reveal that their wish requires a separate trip and state the evidence gap, while offering a realistic nearby alternative. **Never bury vehicle eligibility inside a later map** after the first itinerary has already been presented. Promote the true constraints at the first recommendation and preserve the park's distinct interpretive identity.
