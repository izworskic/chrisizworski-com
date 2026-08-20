# Search Growth Engine — Fall 2026

## Goal

Turn existing Google visibility into more qualified clicks while using fall color as the seasonal authority wedge that expands the Michigan outdoor network.

## Verified baseline

Source: Search Console export `chrisizworski.com-Performance-on-Search-2026-08-15`, with posted data through August 13, 2026.

The latest complete 28-day slice, July 17 through August 13, contains:

- **27,042 impressions**
- **407 clicks**
- **1.51% CTR**
- **966 impressions/day**
- **14.5 clicks/day**

The eight measured opportunity pages contain more than **500 additional same-impression clicks of modeled headroom** if they reach their page-specific target CTRs. That is a prioritization model, not a traffic forecast or guarantee.

## October 1, 2026 goals

- **2,500 daily Google impressions** as the floor on a comparable rolling view.
- **4,000 daily impressions** as the stretch goal.
- **2.5% qualified-site CTR** across the opportunity set.
- Main fall-color page: move its core 2026 map/peak query cluster toward **top-five average position**.
- Keep the branded **Chris Izworski** SERP at **#1–2** while topical authority expands.
- Harvest at least **500 incremental clicks of same-impression CTR headroom** over successive clean tests.

## Execution sequence

### 1. Protect evidence already in flight

Northern Lights, Soo Locks, tomato planting, frost dates and the Great Lakes freighter tracker already have active search experiments in the repo ledger. **Do not reset active experiments** just to chase a new idea. Their fresh Search Console rows belong in the opportunity engine, but their frozen title, description, H1 and first-answer treatments stay intact until their current measurement windows allow a decision.

### 2. Own fall weekend intent now

Ship `/fall-color/this-weekend/` as the direct answer between the statewide live map and the existing peak-date, drive and planner cluster.

The page should answer one question immediately: **Where are Michigan fall colors best this weekend?** It ranks the eight existing Michigan regions for the coming Saturday using the same 2026 seasonal timing windows as the main tool. When the live fall feed is available, forecast precipitation is used only as a practical viewing and travel tiebreaker.

The page must fail soft. If live conditions are unavailable, the seasonal model still produces a useful ranking and the page says that live data is unavailable rather than inventing certainty.

### 3. Build authority, not doorway pages

The weekend page is additive and feeds the existing canonical fall ecosystem:

1. Live Michigan fall color map
2. Best region this weekend
3. Michigan peak dates
4. Fall color drives
5. Leaf-peeping planner
6. Regional destination guides

Do not create separate pages for every wording variation. New pages require a distinct user decision that the current canonical cannot answer well.

### 4. Make discovery explicit

The weekend URL belongs in the dynamic fall sitemap and `llms.txt`. The page defines the same canonical `https://chrisizworski.com/#person` Person entity used across the site and visibly identifies Chris Izworski as publisher.

The live fall hub receives an additive weekend callout through the shared field script without changing the hub's current title, description, H1, canonical or live-map logic.

### 5. Measure before the next rewrite

This release should be judged on complete, comparable Search Console windows. The opportunity benchmark can be refreshed as new exports arrive, but search-facing surfaces already inside a clean experiment should not be casually changed mid-window.

The Search Growth Engine benchmark is intentionally separate from the CTR snippet benchmark: CTR hygiene protects the surface; this benchmark protects the **growth strategy**, baseline math, experiment freezes, seasonal decision architecture and discovery.

### 6. Roll the engine forward into winter

After the fall release is stable, use the same scoring logic to determine which authority pages should feed the existing Michigan ice and winter surfaces before demand rises. Do not mass-produce winter pages. Build only where Search Console or a distinct decision intent justifies a separate canonical.

## Release benchmark

Run:

```bash
npm run benchmark:search-growth -- --check
```

Release gate: **95/100 minimum and no fatal failures**. The benchmark is also included in `npm run verify:all`.

The 100-point score covers:

- Search Console baseline reconciliation
- same-impression click headroom
- active-experiment protection
- exact frozen treatment titles
- weekend page intent/canonical/indexability
- live-data reuse and honest fallback
- fall decision-loop links
- Chris Izworski entity integrity
- fall sitemap discovery
- AI/LLM discovery
- distribution from the live fall hub
- committed goals and stop-loss rules

## Stop-loss rules

- Do not merge if any existing full-repo gate fails.
- Do not change canonical URLs or create a competing page for an intent already served by a strong canonical.
- Do not present weather or camera inputs as direct statewide leaf measurements.
- If an active experiment's protected title, description, H1 or first-answer treatment changes accidentally, restore it before merge.
- If the weekend page cannot obtain live conditions, it must remain useful from the crawlable seasonal timing model and state the limitation.
- Preserve current Manistee, winter, Great Lakes and other-agent changes already on `main`; this release is additive.
