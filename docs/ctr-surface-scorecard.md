# CTR surface scorecard

Re-runnable: `npm run benchmark:ctr` for the report, `npm run benchmark:ctr -- --check` to gate.
Baseline: `benchmarks/ctr-surface-baseline.json`. Personas: `docs/search-personas.md`.

## What it measures and what it does not

It scores the part of the search result you control from source: the title, the description, the
canonical, sitemap presence, and inbound internal links. It weights each page by its share of
measured impressions, so the score only moves when work happens where traffic already is. A
perfect score on an orphan page cannot lift it.

It does NOT measure CTR. There is no Search Console credential in session and no GSC API access.
The `expectedCtrCurve` in the baseline is a modeled blended curve used as a relative yardstick for
sizing headroom. Do not quote it as a fact about this site.

## Reading the two pools

**Measured pages** carry GSC rows and are impression weighted. **Seasonal watchlist** pages have no
GSC history, so they are scored on hygiene only and are not weighted. Forecasting their impressions
would mean inventing numbers.

## Zero-click risk

Each measured page carries a `zeroClickRisk` of high, medium, or low, which discounts its modeled
expected CTR. This exists because a page can have a perfect snippet and still earn no clicks when
the SERP answers the query inline. A page marked `high` should not receive snippet work; if its CTR
matters, the page has to compete for a different query.

## Baseline reading, 2026-08-06

| pool | score | note |
|---|---|---|
| Measured pages, impression weighted | 99.5% | Aug 3 remediation holds. Nothing left to fix. |
| Seasonal watchlist (16 fall color pages) | 63.7% | 16 of 16 failing at least one gate. |

Largest gaps at baseline: 12 titles over 60 characters, all of them fall color; descriptions
running to 231 characters; trailing-slash convention mismatch on canonicals and sitemap entries.

Modeled clicks at risk across the 171 day window: 150, of which 123 sit on `/soo-locks/`. That
page passes every snippet gate, so its gap is intent, not snippet, and it is blocked on a
query-level GSC export.

## Registering the gate

Add to `verify:all` once Phase 0 lands. This matters: `benchmark:seo` was historically missing from
`verify:all`, which is how an automated pass stripped the brand byline from four pages and still
reported green. A benchmark that is not in the gate does not protect anything.
