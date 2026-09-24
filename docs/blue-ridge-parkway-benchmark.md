# Blue Ridge Parkway product benchmark — 2026-09-24

This benchmark is for product design, not search-position claims. It compares the strongest useful patterns from major Blue Ridge Parkway and road-trip planning surfaces and turns them into a build target for the canonical `/blue-ridge-parkway/` tool.

## Value function

| Dimension | Weight | What earns the points |
|---|---:|---|
| Current-condition truth | 18 | Authoritative road status, freshness, construction/closure consequence, clear degraded states |
| First-decision usefulness | 18 | Answers **where should I drive from here, with the time I have?** without making the visitor assemble the answer |
| Route + time fit | 16 | Start point, real time budget, route feasibility, turn-around logic, stop sequencing |
| Map + wayfinding | 12 | Mileposts, route orientation, useful map, access/exit logic, navigation handoff |
| Stop practicality | 12 | Stop duration, effort, what earns the stop, what to skip, facilities/context |
| Weather + seasonal intelligence | 10 | Mountain rather than city weather, elevation effects, foliage/season context without false precision |
| Writing + visual clarity | 8 | Strong hierarchy, compact useful prose, no tourism filler, mobile comprehension |
| Handoff / field use | 6 | Directions, print/share, offline-oriented guidance, easy re-entry into the plan |
| **Total** | **100** | |

## Sites reviewed

### National Park Service — Blue Ridge Parkway
Sources reviewed:
- `https://www.nps.gov/blri/planyourvisit/roadclosures.htm`
- `https://www.nps.gov/blri/planyourvisit/maps.htm`
- `https://www.nps.gov/blri/planyourvisit/gettingaround.htm`
- `https://www.nps.gov/blri/planyourvisit/auto-touring.htm`

Best-in-class strength: authoritative road truth. NPS exposes gate-oriented milepost sections, closure notes, project information, official maps, driving guidance, and the facts that the Parkway is a slow road, has no gas stations on the motor road, and can have unreliable GPS/cell service.

Gap: the visitor still has to translate a long status table into a trip decision. NPS tells you what is open; it does not generally answer which open section best fits a four-hour afternoon from Asheville or Boone.

### Blue Ridge Parkway Association
Sources reviewed:
- `https://www.blueridgeparkway.org/maps/interactive-map/`
- `https://www.blueridgeparkway.org/maps/`

Best-in-class strength: Parkway-specific discovery breadth. The interactive map exposes mileposts and categories including trails, attractions, access, lodging, restaurants, visitor centers, EV charging and other points of interest. Favorites can feed a Trip Builder, and sample itineraries help users understand possible trip scale.

Gap: discovery is stronger than live decisioning. The visitor still chooses from a large catalog and must separately reason about closure feasibility, mountain weather and whether the itinerary fits the time available today.

### Roadtrippers
Sources reviewed:
- `https://roadtrippers.com/`
- `https://roadtrippers.com/about/features/`
- Roadtrippers 2026 trip-planning support documentation

Best-in-class strength: route manipulation and field workflow. Start/end points, stop ordering, driving limits, saved trips, print/export, collaboration, route editing, POI discovery and navigation are mature.

Gap: it is a general road-trip engine. It does not inherently own Parkway-specific closure semantics, milepost truth, elevation/weather judgment or the difference between a worthwhile Parkway stop and a generic nearby POI.

### RomanticAsheville.com
Sources reviewed:
- `https://www.romanticasheville.com/BlueRidgeParkway.htm`
- `https://www.romanticasheville.com/mountain-drive`
- `https://www.romanticasheville.com/Craggy.htm`

Best-in-class strength: practical local detail. Pages give mileage, mileposts, elevation, route shape, stop-specific advice and useful context such as the large temperature difference between Asheville and Craggy Gardens.

Gap: strong editorial pages are not a live route engine. Current conditions and route feasibility still require the user to cross-check NPS and then manually adapt the article.

### Explore Asheville
Sources reviewed:
- `https://www.exploreasheville.com/article/scenic-drives-near-asheville-fall`
- `https://www.exploreasheville.com/article/scenic-drives-near-asheville-spring-waterfalls-wildflowers-blue-ridge-parkway`

Best-in-class strength: seasonal storytelling. The site correctly explains that fall and spring move by elevation and gives season-specific drives rather than flattening the mountains into one regional date.

Gap: polished inspiration is not the same as a current decision. Route closures, available hours, live mountain forecast and the exact tradeoff between candidate Parkway sections are separate steps.

### Visit NC
Source reviewed:
- `https://www.visitnc.com/things-to-do/blue-ridge-parkway-scenic-drives`

Best-in-class strength: broad official destination discovery and attractive itinerary entry points.

Gap: the page is intentionally broad; it does not solve a live Parkway route choice.

## Benchmark scores before this optimization pass

Scores reflect the observed product against the value function above. They are not claims about SEO rank or overall brand quality.

| Product | Truth 18 | Decision 18 | Route 16 | Map 12 | Stops 12 | Seasonal 10 | Clarity 8 | Handoff 6 | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| NPS Parkway | 18 | 6 | 7 | 8 | 9 | 8 | 5 | 3 | **64** |
| Parkway Association | 8 | 9 | 12 | 12 | 11 | 6 | 6 | 5 | **69** |
| Roadtrippers | 3 | 10 | 16 | 12 | 11 | 3 | 7 | 6 | **68** |
| Romantic Asheville | 5 | 11 | 9 | 6 | 12 | 7 | 8 | 3 | **61** |
| Explore Asheville | 6 | 9 | 7 | 5 | 10 | 10 | 8 | 2 | **57** |
| Visit NC | 3 | 6 | 4 | 4 | 7 | 5 | 7 | 2 | **38** |
| Our first branch build | 17 | 17 | 14 | 7 | 10 | 9 | 7 | 3 | **84** |

## What the first build still lacked

The first branch version already combined official road gating, route-specific NWS weather, time feasibility and Parkway-specific routes. The benchmark exposed seven meaningful deficits:

1. **The map was informative but not field-oriented enough.** It needed stronger route/stop hierarchy and a compact itinerary alongside it.
2. **No elapsed-time itinerary.** Users could see stop durations but not approximately when each stop occurs or when they get back.
3. **No explicit “why this route” explanation.** The selected answer needed a short factual reason rather than forcing the user to infer it from cards.
4. **No explicit “what changes the plan.”** Closure notes, high rain/wind and a thin time margin should be surfaced as decision triggers.
5. **Weak Plan B.** Alternatives existed as a list but the best fallback was not promoted.
6. **Not enough Parkway field context.** No-gas-on-the-Parkway, unreliable GPS/cell service, milepost use and tunnel/slow-road realities deserve a compact preparation strip.
7. **Internal AI/JEV language leaked into the method explanation.** Visitors should see the decision logic and sources, not implementation terminology.

## Optimization target

The revised tool should reach at least **95/100** on the same value function by combining:

- NPS-grade source transparency and closure vetoes;
- Parkway Association-style milepost orientation without a giant POI catalog;
- Roadtrippers-style route/timeline/handoff behavior without generic routing noise;
- Romantic Asheville-style practical stop copy;
- Explore Asheville-style elevation/season awareness;
- a substantially faster first decision than any of those pages alone.

Target score:

| Product | Truth 18 | Decision 18 | Route 16 | Map 12 | Stops 12 | Seasonal 10 | Clarity 8 | Handoff 6 | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Revised Blue Ridge Parkway tool | 18 | 18 | 16 | 11 | 12 | 10 | 8 | 5 | **98** |

The missing two points are intentional: a browser tool should not pretend to equal a dedicated navigation/offline-map product, and the public map geometry is not a replacement for turn-by-turn routing.

## Product rule after benchmark

Do not compete by adding more attractions or more prose. Compete by reducing the amount of reasoning the visitor has to do.

The page should answer, in order:

1. **Is the route feasible?**
2. **Which direction/section should I drive?**
3. **Why that one today?**
4. **How long will it actually consume?**
5. **What stops earn the time, and when will I reach them?**
6. **What condition would make me change plans?**
7. **What is my best fallback?**
8. **How do I take the plan onto the road?**
