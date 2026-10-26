# Northern Lights Michigan — search-intent and CTR refinement
**Date:** 2026-10-26 (America/Detroit)  
**Canonical:** https://chrisizworski.com/northern-lights-michigan/  
**Owner:** site shell `izworskic/chrisizworski-com`  
**Mode:** ship-and-observe (the experiment ledger has no active experiment freeze)

## Source-of-truth demand, not invented upside
Google Search Console Web search via connected Windsor.ai, property `sc-domain:chrisizworski.com`. Finalized comparable baseline: September 27–October 24, 2026 inclusive (28 days).

- Canonical page total: **19,251 impressions**, **182 clicks**, **0.95% CTR**, **7.54 average position**.
- `northern lights michigan tonight`: **518 impressions**, **1 click**, **7.80 position**.
- `northern lights in michigan tonight`: **205 impressions**, **5 clicks**, **6.83 position**.
- `can you see the northern lights in michigan tonight`: **170 impressions**, **0 clicks**, **9.10 position**.
- `are the northern lights visible in michigan tonight`: **154 impressions**, **0 clicks**, **9.38 position**.
- GSC query-level rows do not reconcile to total page impressions because of disclosure/filtering; do not extrapolate these counts to all impressions.
- Aurora/search storm activity changes day to day; October 8–11 was an impression spike. Position, SERP features, search result rewriting and mobile click opportunity all affect observed CTR. No causal CTR uplift is asserted.

## Treatment: improve the existing canonical rather than make more pages
- **Retain** exact approved title: `Northern Lights Michigan Tonight: Can You See Them?` (current query-first title; changing it is unnecessary ranking risk).
- Rewrite only the HTML meta description to begin with the user query as a question and describe the *existing* NOAA aurora, NWS cloud, local best-hour and viewing-area utility. Within the 158-character governance limit. Google may choose another snippet.
- Rewrite only the HTML first visible subtitle immediately below the unchanged H1. It makes the question, regional picker action, three sky factors and visibility uncertainty understandable before JavaScript resolves the real-time conditions.
- No fabricated statewide yes/no, live Kp claims, fixed viewing hour, pre-filled storm alert or static condition verdict. The live result is still driven by `/api/aurora`.
- Do not change the URL, H1, canonical, JSON-LD Person, OG/social metadata, maps, regional destination pages, schema, `data-no-ads` controls or ad configuration; no new indexable URL.
- Page is already dateModified 2026-10-26 and winter/site sitemap freshness uses the same day; do not manufacture a new date for a same-day refinement.
- Preserve static original `aurora-static-answer` as a real explanation even when scripts are not available.

## Release gate and measurement
1. Run focused `tests/aurora-regions.test.js`, `tests/aurora-ctr-intent-20261026.test.js`, plus the unmodified full `npm run verify:all`, production build, source drift, sitemap, Person/entity, desktop/mobile public audits on final PR SHA.
2. Merge only when branch head is current and **all required checks pass**. The change is search-facing but minimal.
3. Inspect deployed page HTML and code. Google's indexed/selected canonical and actual snippet may require Search Console URL Inspection; HTML self-canonical is not the Google selection. Do not claim submission/indexing.
4. Compare finalized **7-day and 28-day GSC Web** page and query family metrics after actual deployment against the above dates, controlling qualitatively for Aurora storm interest, position and mix. Focus on exact "tonight" and "can you see" family; don't infer a CTR improvement from an immediate crawl or today's tiny sample.

**Single next action after merge:** measure the first settled 7-day Google Search Console data, then determine whether any further change is justified. 
