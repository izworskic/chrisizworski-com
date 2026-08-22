# Search Authority Portfolio

Updated: August 22, 2026 (America/Detroit)

## Objective

The goal is larger than ranking individual pages or occupying the first 30 results for Chris Izworski. The portfolio should make Chris Izworski a clearly understood entity and make the connected Michigan/Great Lakes properties genuinely useful, authoritative search destinations.

The operating flywheel is:

**useful decision tool -> search demand -> repeat use and links -> stronger topical authority -> stronger owned-property network -> stronger Chris Izworski entity -> more discovery across the network**

Branded SERP occupancy is one outcome of the flywheel, not the only objective.

## Five tracks

1. **Chris Izworski entity.** Keep `https://chrisizworski.com/#person` stable, keep `chrisizworski.com` the strongest branded result, and earn legitimate top-30 coverage through distinct owned properties, controlled profiles, and independent authority.
2. **Flagship search tools.** Win high-intent Michigan and Great Lakes decisions with live data, maps, planners, schedules, conditions, access, and source-backed synthesis.
3. **Topical authority.** Build durable clusters around Great Lakes shipping/conditions/recreation/history, Michigan outdoor planning, rivers/fishing, gardening/natural-year, winter recreation, and transportation.
4. **Independent authority.** Strengthen credible government, association, publication, conference, media, podcast, professional, and other third-party references. Do not manufacture fake authority.
5. **Network and engagement.** Move visitors to the next useful decision across tools and properties. Links should reflect real user journeys, not SEO link exchanges.

## Portfolio actions

Every active tool/property is assigned one operating action:

- **PROTECT** — winning or measurement-sensitive; preserve treatment.
- **PUSH** — existing demand near page one; improve the current canonical owner now.
- **EXPAND** — useful/emerging; deepen evidence, answer coverage, utility, or distinct supporting content.
- **CONNECT** — strategically useful but under-connected to the entity, authority graph, visitor journey, or measurement.
- **REPAIR** — indexed/useful but materially weak in discovery, intent fit, answer quality, technical readiness, or authority.
- **BUILD_NEXT** — a distinct opportunity worth completing after launch/canonical gates pass.
- **RETIRE** — only after evidence shows no distinct utility, demand, authority, or network role.

Priority and permission are separate. A protected experiment can be the highest-opportunity surface in the portfolio and still remain untouched until its clean measurement window closes.

## Scoring

The machine-readable portfolio uses a 100-point opportunity model:

| Dimension | Weight |
| --- | ---: |
| Search demand | 20 |
| Rank leverage | 15 |
| CTR opportunity | 10 |
| Unique utility | 15 |
| Authority/evidence | 10 |
| Network fit | 10 |
| Chris Izworski entity contribution | 5 |
| AI citation readiness | 5 |
| Seasonal timing | 5 |
| Monetization potential | 5 |

Scores prioritize work; they never override factual accuracy, canonical ownership, experiment freezes, or usefulness.

## Current leading signal

The current leading snapshot is the Search Console export `chrisizworski.com-Performance-on-Search-2026-08-21`, through August 19, 2026. It is a seven-day prioritization signal, not a substitute for the repo's complete 28-day experiment windows.

Important current facts encoded in the portfolio include:

- Exact `chris izworski` is already averaging position 1. The homepage should remain the primary branded result; the biography/identity page is a supporting authority surface, not something we should force to replace the homepage.
- Mackinac Bridge tolls is a clean-window immediate opportunity: meaningful impressions, average position about 7.4, zero clicks in the snapshot.
- Northern Lights, Soo Locks, Great Lakes ship tracking, Fall Color, and the current Mackinac Live treatment remain protected despite substantial opportunity.
- Beaches, border waits, buoys, Au Sable, boat launches, and winter preparation provide work that can advance while protected experiments remain frozen.

## Cluster strategy

### Great Lakes shipping and maritime

Use Soo Locks, ship tracking, Gazette, buoys, Great Lakes Levels, shipwrecks, Fitzgerald, lighthouses, and Circle Tour as a connected authority system. Live tools should feed factual context to history/editorial surfaces; history/editorial surfaces should return users to live utility where useful.

### Michigan outdoor decisions

Use beaches, boat launches, Outdoors Now, Outdoor Weekend, fall color, Pictured Rocks, rivers, hunting, aurora, ice, and XC skiing as decision surfaces. Avoid generic destination-page proliferation. A destination page earns a canonical only when it contains materially unique data, access, conditions, planning, or other utility.

### Rivers and fishing

Michigan Trout Report, Au Sable, Manistee, Saginaw Bay, salmon/steelhead, access maps, and live conditions should reinforce each other while keeping distinct intent ownership. Maps are not enough by themselves; crawlable access, timing, conditions, and planning context should explain the decision value.

### Gardening and natural year

Freighter View Farms, planting/frost/tomato pages, the Garden Planner, lawn, phenology, morels, birding, and seed/heirloom resources should behave like one seasonal knowledge system without duplicating articles between properties.

### Chris Izworski entity and professional authority

The homepage is the primary branded search result. `/chris-izworski/`, About, Press, Works, author pages, distinct owned properties, GitHub, professional profiles, conference/association pages, government references, interviews, podcasts, and publications can all contribute to top-30 branded occupancy when each is accurate and independently useful.

## Execution order

### Work now

1. Push Mackinac Bridge toll intent.
2. Push the statewide beach hub without creating doorway pages.
3. Push Michigan border-wait ownership and crossing handoffs.
4. Push Great Lakes Buoys through authority/source/internal-network work rather than unnecessary CTR churn.
5. Expand Au Sable and boat-launch authority.
6. Finish Garden Planner production/canonical launch gates.
7. Start Michigan Ice/XC winter authority preparation within the 6-10 week lead window.
8. Strengthen contextual links and authorship across independent owned roots.

### Hold until measurement clears

- Northern Lights Michigan.
- Soo Locks Live.
- Great Lakes Ship Tracker.
- Fall Color statewide hub.
- Mackinac Bridge Live current treatment.

### Repair queue

Shipwrecks, Edmund Fitzgerald, Pictured Rocks, Traverse City Wine, Perfect Lawn, and weakly discovered supporting properties should be repaired before they receive large-scale content expansion.

## Monthly portfolio review

Each month, and after material search/entity changes:

1. Refresh comparable Search Console evidence.
2. Snapshot exact-name branded occupancy separately from Search Console position.
3. Re-score the focus portfolio.
4. Reclassify surfaces only when evidence warrants it.
5. Close or advance clean experiments.
6. Move the highest-value eligible PUSH/EXPAND/CONNECT/REPAIR item into execution.
7. Review seasonal work 6-10 weeks before demand.
8. Review earned external authority opportunities and broken/stale citations.

Do not let a new build displace a higher-value existing-demand repair simply because the new idea is more interesting.

## Durable sources of truth

Use these together:

- `docs/SEARCH_STRATEGY.md` — overall SEO/SERP rules.
- `docs/SEARCH_AUTHORITY_PORTFOLIO.md` — ecosystem authority model and execution logic.
- `benchmarks/search-authority-portfolio.json` — current machine-readable portfolio and queue.
- `benchmarks/search-strategy-governance.json` — global governance.
- `benchmarks/growth-experiments.json` — protected search treatments.
- `benchmarks/tool-network-registry.json` — tool ownership and relationships.
- `benchmarks/owned-domain-network.json` — independent owned-property graph.
- `benchmarks/name-serp-governance.json` — branded SERP occupancy rules.

Run `npm run benchmark:search-authority -- --check` before merging portfolio/search-authority changes. The gate is also part of `npm run verify:all`.
