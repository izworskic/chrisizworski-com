# Detroit Discovery Pilot Operating System

Updated: September 22, 2026

## Pilot question

Can one genuinely useful live Detroit decision desk create a growing search and navigation surface without turning the site into a page-count content farm?

The pilot is the five-page cluster:

1. `/detroit-outdoors/` — broad owner: what is worth doing outdoors around Detroit today?
2. `/detroit-river-freighters/` — narrow ship-watching decision.
3. `/detroit-birding-today/` — narrow Detroit birding trip-timing decision.
4. `/lake-st-clair-outdoors/` — narrow Lake St. Clair outdoor/water-window decision.
5. `/detroit-sunset-tonight/` — narrow sunset timing and sky-window decision.

The specialist tools remain deeper owners of their broader evidence domains. The Great Lakes Ship Tracker owns lake-wide vessel tracking, Michigan Birding Report owns sightings/hotspots, and Great Lakes Buoys owns station observations.

## Product-to-discovery loop

The intended loop is:

```
specialist engines discover hard-safe opportunities
        ↓
JEV chooses what matters today
        ↓
people reveal which opportunities and handoffs are useful
        ↓
Search Console reveals which query language and landing pages Google tests
        ↓
strengthen the current canonical owner first
        ↓
only a persistent, distinct, underserved decision may become a new canonical
        ↓
measure search acquisition + network amplification
        ↓
repeat
```

More indexed pages are not the objective. The objective is a larger useful discovery space: more distinct relevant queries, more first-impression surfaces, stronger page-one positions, better CTR, and more useful second-step behavior.

## Search ownership

The Tool Network Registry is authoritative.

- `detroit-outdoors` owns the broad Detroit outdoor-today decision.
- `detroit-freighters` owns only the Detroit viewing question. It must not compete with Great Lakes Ship Tracker for generic ship-tracker intent.
- `detroit-birding` owns Detroit weather/migration trip timing. It must not imply sightings or compete with Michigan Birding Report for statewide sightings.
- `lake-st-clair-outdoors` owns the conservative local trip window. Great Lakes Buoys owns observations.
- `detroit-sunset` owns Detroit sunset timing/sky-window intent and must not promise sunset color.

## Measurement sources

### Search acquisition

Use Google Search Console **page × query** data.

For each comparable window capture:

- Detroit cluster impressions and clicks;
- each cluster page's impressions, clicks, CTR and position;
- pages receiving their first impressions;
- pages receiving their first clicks;
- queries and query-family ownership;
- position 4–15 pages/queries worth strengthening;
- unowned query language that may indicate an underserved decision.

Do not compare a 24-hour export to a 7-day or 28-day export as a growth delta.

### Network amplification

Use fixed-label GA4 events:

- `detroit_outdoors_handoff`
- `detroit_growth_handoff`
- `detroit_network_open`

Measure exposures when available so a handoff rate has a real denominator. Do not collect precise user coordinates or free-text search intent for this growth system.

## Durable files

- `benchmarks/detroit-outdoors-growth.json` — targets and guardrails.
- `benchmarks/detroit-discovery-observation.json` — append-only comparable observation snapshots.
- `scripts/report-detroit-discovery.mjs` — current feedback-loop report.
- `benchmarks/tool-network-registry.json` — canonical ownership and durable relationships.
- `benchmarks/tool-network-actions.json` — current observation gate.
- `public/llms.txt`, `public/sitemap.xml` — discovery inventory.
- `scripts/audit-sitemap-canonicals.mjs` — repo-side indexing/canonical audit.

## Current baseline

The September 20 Search Console 7-day export covers September 11–17, before the five-page Detroit cluster launched on September 21.

Site-wide context in that export:

- 611 clicks
- 23,211 impressions
- 321 pages with impressions
- 70 pages with clicks

Those numbers are context only. They are **not Detroit post-launch performance**.

The prelaunch 24-hour export likewise contains no valid Detroit-cluster evidence.

## Observation gate

Observation began September 21, 2026.

Earliest normal expansion review: **October 19, 2026**.

This is not a freeze on product quality. Continue:

- factual corrections;
- safety fixes;
- source reliability work;
- UX improvements;
- JEV/editorial quality improvements;
- performance and accessibility fixes.

Do not create another Detroit canonical merely to create impressions during this observation period.

At review, a new canonical still requires all three:

1. **Search evidence:** recurring distinct query language the current owners cannot answer cleanly.
2. **Network evidence:** related opportunity/handoff behavior demonstrates useful downstream demand.
3. **Cannibalization safety:** one explicit owner, a distinct user decision, and useful network relationships.

When those conditions are absent, improve an existing owner.

## Duplicate-canonical warning triage

Google Search Console emailed the site on September 20, 2026 with the reason **Duplicate without user-selected canonical**.

That warning predates the September 21 Detroit focused-page launch and is not evidence that Detroit caused the issue.

Repo-side triage:

- `public/sitemap.xml` has no exact duplicate `<loc>` entries.
- the five Detroit pages each currently declare a self-referencing canonical and `index,follow`;
- all five are intended sitemap URLs.

Run:

```
npm run audit:canonical-indexing
```

The audit scans sitemap-backed local HTML for missing canonical tags, sitemap/canonical mismatches and multiple sitemap URLs sharing a canonical. It is a repository diagnostic; Google may still classify a URL as duplicate based on rendered/content similarity or another discovered URL that is not in the sitemap.

The exact affected Search Console URLs still need a future indexing-report export if Google does not expose them through the connected evidence available to the agent. Do not guess which URLs Google selected.

## Weekly operating cadence

1. Retrieve a comparable Search Console export.
2. Add one observation snapshot to `benchmarks/detroit-discovery-observation.json`.
3. Add fixed-label GA4 Detroit event counts when available.
4. Run `npm run report:detroit-discovery -- --check`.
5. Review page-one opportunities and emerging query language.
6. Improve current owners first.
7. Do not add a URL unless the observation gate is satisfied.

## Interpretation

A successful pilot does not require `/detroit-outdoors/` itself to dominate every Detroit query.

A stronger result is a healthy constellation:

- broad visitors land on Detroit Outdoors;
- narrow searchers land on the appropriate focused surface;
- focused surfaces hand users to the live board or specialist evidence;
- Google gradually tests more relevant query language;
- useful pages gain impressions and clicks without cannibalizing one another.

That is the mechanism to test before copying the architecture to additional regions.
