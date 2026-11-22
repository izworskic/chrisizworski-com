# Michigan Winter Trails Decision Desk: Experience Investment / Foundry review

Date: 2026-11-22
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/michigan-winter-trails/
Scope: one existing indexable page, its existing map/filter assets, a progressive-enhancement controller, and tests. No new route, API, server function, ad logic, data source, or visitor tracking.

## Visitor question

Which of the already documented Michigan winter trail systems fits my activity, region and effort, and what must I independently verify before driving there?

### Baseline and friction

The guide contains 15 fully source-linked trail-system dossiers and 50 named loops, credited place photography, rules for mixed winter use, and a geographic map. The primary decision was buried below a long editorial introduction, trail-etiquette lessons and closure text. The four-axis existing filter selects a list but does not let a visitor compare two choices above the fold. The mapped pins are general areas, not verified winter arrival points.

## Two candidate approaches

A. **Decision desk with compared trail dossiers (selected).** Lead with a compact activity/region/effort decision, a two-option comparison drawn from the existing canonical dossiers, per-route winter cautions and original manager links. A deliberate action transfers the same filters to the complete existing field guide and map. First phone view: choose the activity; the two-option comparison follows. Missing match: say none rather than infer a route. Pros: reliable source reuse, crawlable fallback, no new model or service. Tradeoff: no automated trail-opening verdict.

B. **Live snow-map-first navigator (deferred).** Lead with real-time snowpack overlays, route polylines, grooming and cleared parking layers. First phone view: a map and freshness-qualified source legend. The available research-only hiking/snowshoe lab can check some selected routes, but it cannot certify actual winter lot/road/trail clearance. The 15 feature systems are not all verified against complete official trail geometry or live groomer feeds. Promoting it to a positive readiness recommender would violate existing evidence gates.

A is not a repainted Snow Totals interface: the primary interaction compares *documented place choices* with visible route-specific cautions, not ranked snowfall inches. The existing interpretive field-guide photography and narrative remain intact. It differs from the Snow Depth map because the first action is activity/region/effort selection, and it differs from the cross-country ski condition tool because it covers four kinds of recreational travel without inventing grooming reports.

## Implementation

- Added a first-screen decision desk with accessible labels, 15-system provenance and no-JavaScript example comparison.
- The browser controller reads the existing 15 HTML dossiers, rather than maintaining a second unchecked trail catalog. A pure shortlist/pair function allows deterministic Node regression tests.
- Changing activity, region, effort or documented-route preference recomputes matches. Two matches are visible at a time; Next rotates through eligible places. Zero matches cannot enable the map action.
- Each compared route surfaces its source status, complete winter caution in a disclosure, official source and a link to its existing full field notes. The map action applies these filters to the underlying map and fits visible destinations.
- Independent handoffs link to existing regional snow-depth, ski reports and lake-effect tools. Snow data is *not* fetched and projected as trail readiness.
- Exact public URL, canonical, Person, AdSense Auto ads loader, photo credit/licensing, the 15 source dossiers and 50 loops remain. Source-review date in the footer stays October 28, not falsely restamped. Page modification and sitemap updated November 22.

## Technology fit

- Semantic HTML/CSS: chosen for first answer, static evidence, no-JS resilience, and mobile layout.
- Browser JavaScript ESM: chosen for filtering, comparing, focus recovery and synchronized map actions. Reuses local Leaflet.
- Existing Node backend: not expanded. Source repositories already own separate snow / hiking research.
- Python Intelligence OS: considered for validated offline snow/route statistics, but unnecessary for a sourced editorial comparison; live model would require calibrated ground truth and manager access provenance.
- Rust/WASM: no measured numerical bottleneck. Rejected for this task.
- Java/JVM: no integration or operational need. Rejected for this task.
- New storage, Redis, Supabase, visitor location and extra Vercel functions: none.

## Safety and acceptance

The desk does not claim open trails, measured trail-specific snow, grooming, plowed parking or navigable entrances. If route-specific manager evidence conflicts with old page prose, the source dossier needs a separate editorial correction. General coordinate map pins remain area-only. The existing noindex research lab is NOT promoted or linked as a ready-to-go trail selector.

Regression coverage: deterministic empty/single/two/many comparison cases; activity/region/effort/official-source matches; filter/map and field-note handoffs; static fallback, source and SEO/ads guardrails.

Execution: this branch can be reviewed with GitHub CI and Vercel preview. A third-party browser preview was attempted but blocked by an insufficient-credit tool error, so real-browser acceptance is NOT VERIFIED as of this record. Re-run Playwright at 360, 390, 768, 1280 and 1440 px, inspect actual images, map tiles and Google Auto ads, exercise keyboard, no-JS, blocked-image and absent-map states, and run the owner's full npm run verify:all before merging. Do not describe source tests as visual proof.

## Foundry completion signal and future gate

The intended before/after visitor scenario is changing from *read a 15-place article before finding comparison* to *choose a mode and see two documented choices, switch to another region and see a different pair, then inspect one caution and its land-manager source*. This interaction has implementation-level tests but no Foundry improve/assess/prove replay or observed browser evidence yet; no visitor lift is claimed.

The follow-on investment is a true conditions panel and official GIS trail geometries for independently matched routes, but only after source age, access permission, exact route identity, manager parking and grooming evidence are verified. A NOAA grid depth must never be labeled trail surface or opening status.
