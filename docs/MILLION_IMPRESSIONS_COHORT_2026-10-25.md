# Million Impressions / 5% CTR: six-page priority cohort and winter discovery

**Decision date:** 2026-10-25 (America/Detroit)  
**GSC property:** `sc-domain:chrisizworski.com`  
**Measured 28-day interval:** 2026-09-25 through 2026-10-22, including both endpoints  
**Measurement:** Google Search Console page totals accessed through connected Windsor.ai. GSC search impressions are *not* organic visits or AdSense revenue.  
**Operating mode:** ship-and-observe; no active growth-experiment freeze.  
**Scope:** inspect existing URLs, document decisions, and perform a read-only production technical audit; do not auto-rewrite titles or merge this PR into production.

## Site-level reference
- Web performance as supplied by connected Search Console: **138,175 impressions**, **3,263 clicks**, **2.36% CTR** across 28 finalized daily reports.
- The six candidate pages: **42,763 impressions**, **386 clicks**, **0.90% cohort CTR**, equal to about **31%** of site impressions. These are historical measured data, not results of this PR.
- A 5% CTR for the six pages would be about 2,138 clicks **at unchanged impressions**, an illustrative upper-level target rather than a traffic projection or evidence that all query families could achieve that result.
- Search Console page aggregations can vary from query drilldowns because not every query is disclosed; do not equate disclosed-query sums with page totals.

## Run order and findings

| Order | URL | 28-day impressions | Clicks | CTR | Position | Next evidence-backed treatment |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `/northern-lights-michigan/` | 19,892 | 200 | 1.01% | 7.50 | **PROTECT title/canonical.** Approved title already matches tonight intent. Inspect actual mobile first answer, dynamic-data fallback and Google snippet composition, then improve genuinely useful region handoffs if evidenced. |
| 2 | `/great-lakes-freighter-tracking/` | 9,119 | 142 | 1.56% | 7.25 | **PROTECT primary live tracker.** Title explicitly says ship tracker; confirm AIS loading and mobile map usability before considering a snippet rewrite. Connect relevant freighter stories without adding rival tracking URLs. |
| 3 | `/mackinac-bridge-live/` | 5,285 | 20 | 0.38% | 8.60 | **PUSH open-today answer.** The initial HTML already asks whether the bridge is open. Verify official-source fallback, mobile placement and visible answer. Check SERP competition for the direct “open today” query before title treatment. |
| 4 | `/mackinac-bridge-tolls/` | 5,699 | 13 | 0.23% | 8.36 | **DIAGNOSE zero-click intent.** Page already leads with verified $4 passenger toll/$8 normal round trip; do not churn title or official prices without a competitor/search-feature review. Check whether Google answers the price directly in its result. |
| 5 | `/national-tools/white-christmas/forecast/` | 1,614 | 3 | 0.19% | 3.93 | **PRIORITY: SERP answer mismatch investigation.** “Will it snow for Christmas?” receives high position but hardly any clicks. Distinguish historical likelihood from a truly actionable 2026 forecast. Implementation belongs in `izworskic/national-white-christmas`. |
| 6 | `/michigan-snow-totals/` | 1,154 | 8 | 0.69% | 8.51 | **WINTER CONNECT.** Initial HTML says it uses NWS measurements, map, 24-hour/7-day/season totals. Validate actual observed date/freshness, town search and links to distinct snow/ice recreation decisions. |

### Actual disclosed query opportunities, 2026-10-09 through 2026-10-22
- `northern lights michigan tonight`: 320 impressions, 1 click, average position ~8.12.
- `great lakes ship tracker`: 536 impressions, 5 clicks, average position ~6.88.
- `is the mackinac bridge open today`: 227 impressions, 0 clicks, average position ~8.49.
- `mackinac bridge toll`: 212 impressions, 0 clicks, average position ~10.03.
- `will it snow for christmas`: 356 impressions, 0 clicks, average position ~3.29.
These are samples, **not** exhaustive query results and not sufficient to prescribe new titles by themselves.

## Winter discovery cohort

The same on-demand workflow inspects HTTP status, noindex, canonical, initial HTML, and minimum search-visible content for these **11** canonical routes:

1. `/national-tools/snow/` — extracted national snow owner.
2. `/lake-effect-snow/` — Great Lakes snowbelt outlook; distinct from reported snowfall.
3. `/michigan-snow-depth/` — current snow on the ground and snow-finder decisions.
4. `/michigan-ice/` — state ice discovery.
5. `/michigan-ice/regions/saginaw-bay.html` — Saginaw Bay ice-specific conditions.
6. `/michigan-ice-caves/` — distinct access and ice-formation decisions.
7. `/michigan-cross-country-skiing/` — XC planning.
8. `/michigan-ski-hills/` — downhill decision.
9. `/snowmobile/` — snowmobile conditions.
10. `/mackinac-ice-bridge/` — season rollover, not a declaration of safe ice.
11. `/great-lakes-freighter-winter-layup/` — distinct layup chronology and ship stories; not the same intent as the live tracker.

These eleven routes are **technical discovery checks**, not proof of search demand, indexation or forecast quality. Any missing route or faulty canonical becomes an explicit issue; extracted-product fixes must go through the appropriate owning repository. The separate `/winter-hike-snowshoe-lab/` remains a **noindex research preview**, per its source, and must not be mistaken for a missing public indexed page. Public release requires its own verified winter-parking/access and production gates.

## Audit outputs and boundaries

- `.github/workflows/million-impressions-cohort.yml` runs when explicitly dispatched, and once on the PR changing the narrowly scoped audit definition. **It does not run on every normal merge.**
- `scripts/audit-million-impressions-cohort.mjs` inspects Northern Lights first, then the other five measured pages, followed by eleven winter URLs.
- The artifact `million-impressions-cohort-20261025` preserves `artifacts/million-impressions-cohort-20261025.json`, reporting page status, detected canonical, title, description, H1, initial HTML length, declared creator and actual technical errors.
- Main's pre-existing agent branch verifier runs its full `npm run verify:all` gate on PRs. Do not merge if that or the cohort audit is red.
- HTTP/HTML diagnostics **cannot** prove Google indexing, selected snippets, live API accuracy, mobile interactions, actual CTR uplift or AdSense revenue. Separate browser and Search Console confirmation is required.
- The known initial HTML of Northern Lights, freighter tracking, bridge live, bridge tolls and snow totals already has titles, single self-canonicals, first H1s and Chris's canonical Person reference. **Do not claim these checks show a cause of weak CTR.**
- White Christmas forecast is maintained by the extracted national owner and was not available as a static file in the site-shell repo. The audit must test its **published URL**, not assume it is a missing published page.

## Release decision
This PR is a **measurement/audit implementation only**. It is not an SEO title change, published tool enhancement, deployed content release, or evidence that impressions improved.

**Exactly one next action after reports:** inspect the first cohort audit artifact and turn the highest-confidence user-visible problem into a small, owning-repository fix with a clean before/after measurement window.
