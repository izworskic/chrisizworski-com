# Michigan Outdoors Now Growth System

Updated: August 28, 2026

Michigan Outdoors Now is now managed as one part of the broader Chris Izworski search operating system.

The system has three layers:

1. **Acquisition in Michigan Outdoors Now** — quality-gated location-intent pages and current planner surfaces create qualified search entry points.
2. **Behavior in Michigan Outdoors Now** — fixed-label Vercel events measure whether those entries turn into planning, comparison, commitment, and directions.
3. **Portfolio governance in ChrisIzworski.com** — this repository controls canonical intent ownership, experiment windows, entity integrity, expansion permission, and contextual network promotion.

## Division of responsibility

### Michigan Outdoors Now owns

- the 54 qualified location-intent pages;
- planner and semantic funnel instrumentation;
- the privacy boundary for product analytics;
- page/query opportunity scoring;
- family expansion scoring;
- the weekly Search Console collection workflow;
- the noindex machine-readable growth contract at `/growth-manifest.json`.

### ChrisIzworski.com owns

- the canonical Chris Izworski Person entity;
- Tool Network Registry ownership;
- Search Authority Portfolio action/permission;
- the growth experiment ledger;
- cannibalization boundaries;
- the owned-property graph;
- cross-tool promotion and authority distribution.

The two repos should not create independent SEO strategies.

## Current release

The acquisition launch is 54 pages across 11 Michigan starting cities in five families:

- family day trips
- hiking
- paddling
- dog-friendly outdoors
- lower-barrier outdoors

The launch deliberately excludes beach, freighter, and birding city variants because those search intents have stronger existing canonical owners elsewhere in the network.

No additional location-intent family should launch during the first complete attributed measurement window unless a factual/crawlability defect requires repair.

## Measurement loop

### Weekly

Use leading indicators only:

- Search Console indexing/canonical anomalies
- emerging page × query impressions
- position bands
- CTR gaps
- planner-start and completion rates
- comparison/commitment/directions counts
- runtime/source regressions

Weekly data can identify a problem. It does not declare a winner.

### Complete 28-day window

Join Search Console and product-funnel evidence.

The tool-side report classifies page/query opportunities as:

- `PUSH_CTR`
- `BUILD_AUTHORITY`
- `UX_REPAIR`
- `PROTECT`
- `HOLD`

A family only earns `EXPAND_FAMILY` when it has at least:

- 250 Search Console impressions
- 5 clicks
- 10 completed plans
- 3 directions opens

Passing this family gate still does not create a page automatically. Every proposed URL must pass the central new-canonical gate and cannibalization review.

If a family reaches at least 500 impressions and 100 landing views but fewer than 2% of those views start the planner, the system blocks expansion and calls for product/intent repair.

## CTR and impression growth are separate jobs

### CTR work

Prioritize pages already getting meaningful impressions near page one.

Work in this order:
1. query/title alignment;
2. snippet/first-answer alignment;
3. preview/image treatment;
4. SERP intent clarity;
5. only then broader changes.

### Impression/rank work

When Google is testing the page but position is the constraint:
1. deepen the canonical answer;
2. improve destination evidence;
3. add useful contextual inbound links;
4. connect the page to the appropriate authority owner;
5. do not create an adjacent keyword clone.

## Chris Izworski branded growth

Michigan Outdoors Now supports the Chris Izworski entity through real project ownership, not keyword repetition.

Measure branded visibility separately from non-branded Michigan outdoor acquisition.

The tool remains a supporting controlled property for the branded query family while the homepage and canonical Chris identity page remain the central entity owners.

## Source of truth

Machine-readable contract:
- `benchmarks/outdoors-now-growth-system.json`

Tool implementation contract:
- `https://michiganoutdoorsnow.chrisizworski.com/growth-manifest.json`

Central governance:
- `docs/SEARCH_STRATEGY.md`
- `benchmarks/search-authority-portfolio.json`
- `benchmarks/tool-network-registry.json`
- `benchmarks/tool-network-actions.json`
- `benchmarks/growth-experiments.json`
- `benchmarks/name-serp-governance.json`
- `benchmarks/owned-domain-network.json`

The operating rule is **measure → diagnose → improve the canonical owner → hold a clean window → decide → expand only with evidence**.
