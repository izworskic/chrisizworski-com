# November 9, 2026 — Search Growth Sprint 1: protect winners, remove friction

## Objective

Convert existing Google visibility to more useful visits before commissioning new tools. Avoid title churn and invented results. This sprint changes **no** AdSense placement, canonical, robots directives, official pricing formulas, API models, NOAA thresholds, or live AIS handling.

Data source: the owner-private Google Sheet, "ChrisIzworski.com — Growth Command Center — 2026-11-09", copied from Search Console export `sc-domain:chrisizworski.com`; daily Chart coverage February 17–November 7, 2026. The Queries and Pages tabs are **full available export coverage**, not latest 28-day query or page totals. Query totals have GSC privacy/anonymization omissions and cannot be reconciled to page totals. Google Search web property, not ad revenue.

## Cross-site reference

- Latest 28 completed daily rows, October 11–November 7: **2,133 clicks / 107,507 impressions / 1.98% CTR**.
- Previous 28 completed daily rows, September 13–October 10: **3,045 / 122,072 / 2.49%**.
- Latest 7 rows, November 1–7: **409 / 25,473 / 1.61%**; preceding 7: **380 / 20,100 / 1.89%**.
- This includes the end of fall-color season, an important confound. The page/query data below cover a longer interval and cannot be interpreted as November gains.

## Four page-family decisions

| Canonical / query | Export evidence (longer period) | Decision shipped or deliberately held |
| --- | --- | --- |
| `/national-tools/white-christmas/forecast/` — `will it snow for christmas` | Disclosed query: 2,305 impressions, 0 clicks, rank 5.91 | **Protect, no title change.** The ambiguous query also refers to the 1996 French film. The dedicated `izworskic/national-white-christmas` owner has already shipped a city/ZIP-first weather decision and a separate Christmas snowfall-vs-snow-cover explanation in October. Preserve its title and season transitions until weather-qualified query data confirm a true failure. No copy made in the shell. |
| `/great-lakes-freighter-tracking/` — `great lakes ship tracker` | Disclosed query: 2,930 impressions, 24 clicks, CTR 0.82%, rank 7.6; page: 26,286 impressions, 355 clicks, CTR 1.35%, rank 8.35 | **Keep the existing live tracker title.** Provide a direct first-screen jump into the real ship-name search input, not another track-a-ship page. Preserve AIS freshness thresholds, map interactions, Soo/Duluth/Welland passage links, and attribution. |
| `/mackinac-bridge-tolls/` and `/mackinac-bridge-live/` | `mackinac bridge toll`: 1,594 impressions, 1 click, rank 9.6; `mackinac bridge conditions today live`: 1,374, 9 clicks, rank 8.54 | **Protect separate intents.** The existing toll search title already leads with verified $4; do not reset its October 26 title test. On live conditions, add a direct contextual handoff to the separately maintained toll calculator. The fee does not imply crossing permission; official closure and wind data remain authoritative. |
| `/northern-lights-michigan/` — `northern lights michigan tonight` | Disclosed query: 1,329 impressions, 10 clicks, CTR 0.75%, rank 8.78; page: 61,493, 785, CTR 1.28%, rank 8.64 | **No title churn.** Fix misleading initial loading copy: the first HTML was claiming "Forecast currently unavailable" before the async request had completed. Say the NOAA forecast is loading; retain explicit "unavailable" when the latest required sources truly fail, go stale, or are missing. Never fabricate a verdict or tonight's sky. |

## Readback gates

- No change to four canonical/robots/title strings, or JSON-LD/person authorship.
- No changes to price schedule, AIS feed, regional space-weather or winter forecast data.
- First task available within the existing page: named freighter search, separate toll lookup, regional aurora status.
- Existing file-based `tests/november-search-growth-sprint.test.js`, `npm test`, `npm run verify:all`, `npm run build:site` and public audit must pass on reviewed PR SHA.
- Preview checks of all changed routes at mobile (~360 px) and desktop (~1440 px), with actual click-through, should be completed if the deployment browser is available. Code/tests and a READY deployment alone do not prove manual UX verification.

## Measurement and decision rule

1. Record release commit and production HTML readback. This is not yet Google indexing or a measured CTR result.
2. When post-release GSC data mature, examine **exact canonical page + query** for `great lakes ship tracker`, `mackinac bridge conditions today live`, `northern lights michigan tonight`, and weather-qualified queries such as `will it snow on christmas 2026`. Do not judge winter weather CTR by the ambiguous movie-title query alone.
3. Compare 7-day and 28-day fully finalized **non-overlapping** windows for query-family impressions/clicks/CTR and average rank. Report the denominators and Google-selected canonical separately; adjust for search features, position and seasonality.
4. Inspect measured visitor usage of the new links before attempting further UX changes. `data-growth-cta` attributes are hooks, not proof of GA4 event delivery.
5. If CTR rises and average position is stable, continue; if ranking or qualified visits deteriorate, revert that page-specific intervention. Never claim a revenue improvement without a correctly scoped AdSense period.

## Backlog deliberately **not** included

- No new tools or programmatic pages; no wholesale meta rewrite; no unrelated website changes.
- Do not treat a Google Sheets historical export as live, or assign per-page AdSense income based on GSC impressions.
- Do not alter the independently owned White Christmas implementation or its published route from the shell.
