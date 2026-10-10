# Million Impressions + Revenue Playbook

**Owner-approved direction:** October 9, 2026 · **Status:** Active operating plan  
**Primary business objective:** Profitable, useful, nationally discoverable decision tools.  
**Search growth objective:** **1,000,000 Google Search impressions per rolling 28 days, at a target 5% CTR (50,000 organic clicks per 28 days).**  
**Financial milestones:** **$50/day → $100/day → $300/day** in total site/tool revenue.  
**Parallel, non-negotiable objective:** Protect and strengthen the legitimate **Chris Izworski** name SERP and author/entity graph.

> **Read this document and [the growth session log](docs/GROWTH_SESSION_LOG.md) at the start of every search, growth, or monetization development session. Update the log when the session ends.** This is the cross-context-window project handoff, not an instruction to open endless projects or publish thin content.

## 1. What success actually means

| Metric | Long-term goal | Important definition |
| --- | ---: | --- |
| Google Search impressions | **1,000,000 / 28 days** | Search Console, Search type **Web**, same property and comparable 28-day windows |
| Organic search CTR | **5% overall target** | Clicks / impressions; also report **non-branded CTR** separately |
| Organic Google clicks | **50,000 / 28 days** | Result of 1m impressions × 5% CTR, not a separately proven forecast |
| Total business revenue | **$50/day**, then **$100/day**, then **$300/day** | Measured earned revenue, not hypothetical impressions or estimates |
| Personal name SERP | Protect primary branded site and build durable independently earned results | Governed by `docs/NAME_SERP_MOAT.md`, not by page-count growth |
| User value | Accurate, working, specific decision tools | Real usefulness, speed, repeat utility, traceable data sources and clear limitations |

**Historical starting point:** approximately **48,000 Google Search impressions in a prior late-September 2026 28-day period** was discussed with the owner. This is a *historical, conversation-reported reference*, **not a verified October 9 live baseline**. Replace it with a dated GSC export before claiming current growth, CTR, clicks or gains. The ratio from 48,000 to 1,000,000 is approximately **20.8×**. Current CTR, revenue and page-level results remain **unverified in this file**.

**The 5% CTR is a strategic target, not an SEO guarantee.** High-volume early-ranking queries often have low CTR; branded search has a different distribution. Report query and page segments and do not manipulate averages to show success.

### Revenue reality check

Impressions do not pay by themselves. A *purely illustrative* case:

- **1,000,000 impressions × 5% CTR = 50,000 organic clicks / 28 days**.
- If every click produces **1.5 pageviews**, this is **75,000 pageviews** from those clicks.
- At **$10 page RPM**, that traffic makes approximately **$750 / 28 days (~$27/day)** in display ads, **not $300/day**.
- **$300/day for 28 days = $8,400**. At the same $10 page RPM, display-only economics would require about **840,000 monetized pageviews / 28 days**, or a different revenue mix.

These are **scenarios**, not the site's measured conversion rates, actual ad RPM or forecasts. Total monetizable traffic also includes direct, returning, referral and other organic visits. Other revenue sources require separate validation (relevant affiliates, disclosed sponsorships, or other business models). Track direct revenue and operating cost; do not chase 1m impressions at the expense of profit.

## 2. Three coordinated missions, one website

**A. Discoverability:** Grow non-branded search visibility and qualified organic clicks with authoritative national and local decision-engine networks.

**B. Monetization:** Grow sustainable revenue *per useful visit* without breaking performance, accessibility, integrity, ad policies or the actual decision interface. Prioritize revenue and user value over a vanity impression target when they conflict.

**C. Chris Izworski SERP:** Keep `https://chrisizworski.com/` the primary branded result, `https://chrisizworski.com/chris-izworski/` the primary identity surface, and `https://chrisizworski.com/#person` the consistent Person identifier. Use genuine authorship, visible attribution and accurate `author`/`creator`/`publisher` relations. Do **not** stuff the author's name into intent-first headings, claim unrelated properties as `sameAs`, create cloned profile pages, or assume multiple URLs on one root domain create multiple branded SERP slots.

**The search-growth and name-SERP programs are complementary but not interchangeable.** A million non-branded impressions cannot be treated as proof that the Chris Izworski branded SERP improved. Track both independently.

## 3. Opportunity priorities (hypotheses, not proven demand)

| Cluster | Reason to consider | Current decision |
| --- | --- | --- |
| **Fall color, Michigan → national regions → specific places** | Existing Michigan Search Console ranking evidence; one reusable timing, elevation and visit-decision architecture | **Pilot complete; measure before replicating** |
| **Gardening: planting, frost, crop timing, zone/local decisions** | Large perennial range of distinct decisions and scalable location logic | **Candidate for demand, competition and revenue validation** |
| **Winter: snow, ice, access, outings** | Seasonal search demand and existing relevant tools | **Candidate; focus on decisions not generic forecasts** |
| **Higher-commercial-intent utilities** (e.g. house affordability, useful travel planning) | May produce more revenue per visitor even with fewer impressions | **Evaluate using actual demand and monetization evidence** |
| **Existing near-page-one tools** | Better snippets, use and linking can be more efficient than creating URLs | **Prefer eligible winners where GSC supports a change** |

Do not invent search volumes or claim rank difficulty has been validated. Keyword tools, actual GSC queries and competitor evidence must substantiate any demand forecast.

**Selection rule:** prioritize opportunities combining (1) demonstrable search demand; (2) realistic ranking pathway; (3) unique decision value; (4) quality of evidence/data; (5) achievable implementation and operating cost; (6) business monetization; and (7) legitimate contribution to the broader authority network. The authoritative search portfolio's governance and scoring rules remain in force; this document does not silently replace them.

## 4. Standard context-window mission: finish one small slice

1. **Read the handoff:** this playbook, `docs/GROWTH_SESSION_LOG.md`, the repo's `AGENTS.md`, and the current search/entity governance. Identify the tool's **authoritative owning repository** before editing.
2. **Measure before:** record the exact URLs, 28-day GSC impressions/clicks/CTR/position, important query families, branded vs non-branded, GA4 use and confirmed AdSense revenue if available. If unavailable, explicitly write **NOT AVAILABLE** rather than guessing.
3. **Select a manageable set:** typically **one region and two specific destination pages**, or 1–3 existing related pages/tools. There is **no requirement to create new pages** if the primary canonical can satisfy the intent.
4. **Research distinct needs:** searcher questions, competitor gaps, official sources, unique data/decisions, access and temporal limits. Do not duplicate search intents or publish thin location variants.
5. **Implement in the owner repo:** informative initial HTML, truthful date/confidence states, clear decision UX, evidence, relevant links, accurate title/H1/metadata, correct canonical, useful structured data, and true creator/Person identity. Do not sacrifice working features or successful SEO treatments.
6. **Verify:** focused functional, mobile, metadata, indexability, sitemap, internal link, ad-policy and source-freshness checks. Run the repository's required full CI gate. Do not merge over a failing required check.
7. **Deploy and check production:** verify exact commit, READY state, canonical URLs, rendered content and main user paths. **Never write 'deployed' merely because a PR or build exists.**
8. **Record and observe:** append results and commit/PR/deploy details to the session log, including failures. Recheck comparable 7-, 14- and 28-day observations. Seasonal changes and other site changes may confound attribution; no causal claim without evidence.
9. **Set exactly one next action:** pick the next small, evidence-backed task with an explicit definition of done and named source of truth.

**Definition of done:** no orphaned work, no unfinished functionality, no unsupported ranking claim. PR/test/deployment status must be stated precisely. A completed coding session may precede a completed measurement window.

## 5. Permanent protective gates

- **SEO:** preserve crawlability, proper canonical ownership, robots rules, content uniqueness, valid structured data, indexable initial HTML, working sitemap discovery and user performance. The strongest canonical intent page comes before adjacent keyword pages.
- **Chris name SERP:** use the verified `Person` identifier, credible visible authorship and accurate relationships; protect branded homepage and biography, distinct external profiles and earned third-party authority. Respect `docs/NAME_SERP_MOAT.md` and `benchmarks/name-serp-governance.json`.
- **Revenue:** do not break AdSense setup, put misleading ads inside decision flows, manufacture ad intent or assume an ad loader proves monetization. Respect `config/in-article-ads.json` and `docs/AUTO_ADS_NETWORK.md`. Validate changes to ad setup against measured RPM, bounce/engagement and Core Web Vitals.
- **Reliability:** clearly distinguish live observations, modeled typical timing, source outages and unknown access. Do not invent current road, foliage, airline or other live conditions.
- **Ownership:** the `chrisizworski-com` repository is the site shell for extracted products. Work in the relevant owning repository (for national fall color: `izworskic/national-fall-color`), not an outdated mirror.
- **No invented SEO effect:** deployed = shipped, not indexed, ranked, clicked or profitable.

## 6. Measurement and decision ledger

For every completed pilot, record the following in [the session log](docs/GROWTH_SESSION_LOG.md):

- UTC/local date and exact site URLs; owning repo, branch, PR, merge commit and deploy verification.
- Intended query intent, user decision fixed, sources, title/canonical/structured-data changes and reasons.
- **Before**: GSC 28-day window, impressions, clicks, CTR, average position, relevant query segments. Distinguish verified from remembered.
- **After**: same set and comparable windows; index status if known.
- **Money**: attributable/ad-reported revenue where technically supported, site-wide AdSense earnings, pageviews, page RPM, cost and any non-ad income. If the attribution isn't supported, don't pretend.
- Quality: functionality, mobile usability, source trust, ad delivery/cost, known bugs.
- Decision: protect / revise / extend / rollback / no evidence yet.
- One precise next move, and what would constitute success.

**Reporting cadence:** check when new GSC/GA4/AdSense data is available, emphasize a same-length 28-day decision window, and separately disclose the special effect of fall/winter/spring seasonality. Do not compare a three-day new page to a full 28-day historical winner.

## 7. Pilot ledger — start

### Pilot 001 · Smokies three-page improvement · 2026-10-09

**Owning repository:** `izworskic/national-fall-color`  
**Completed PR:** [#30 — Smokies SEO pilot](https://github.com/izworskic/national-fall-color/pull/30)  
**Merged commit:** `eaf60f7c8a68571733b556f74a8e9762fec3226d`  
**Pages:**
- [Great Smoky Mountains](https://chrisizworski.com/fall-color/great-smoky-mountains/)
- [Cades Cove](https://chrisizworski.com/fall-color/great-smoky-mountains/cades-cove/)
- [Newfound Gap Road](https://chrisizworski.com/fall-color/great-smoky-mountains/newfound-gap-road/)

**Change:** refreshed Smokies regional 2026 title, clearer NPS-backed elevation and destination choice, substantially more specific Cades Cove and US-441 planning/road checks, useful initial HTML, contextual cross-links, freshness metadata and regression tests. Existing Michigan engine untouched.

**Verification at completion:** source repository tests passed; Vercel production deployment reported READY; updated production content was observed on the canonical site. **No post-change click, impression, rank or revenue increase has been established.**

**Known follow-up:** audit national-page JSON-LD for a *fully defined* consistent Chris Izworski Person node, rather than only a reference. This is an entity-consistency quality task, **not evidence of a penalty**; change only after inspecting the actual emitted HTML and existing schema.

**Next action:** capture a verified GSC baseline for these exact three URLs and national fall-color competitors; then choose the next pilot on evidence rather than publishing more pages by default.

## 8. Source of truth and process ownership

- **Search strategy:** [`docs/SEARCH_STRATEGY.md`](docs/SEARCH_STRATEGY.md)
- **Entity/SERP moat:** [`docs/NAME_SERP_MOAT.md`](docs/NAME_SERP_MOAT.md), [`benchmarks/name-serp-governance.json`](benchmarks/name-serp-governance.json)
- **Portfolio/governance:** [`docs/SEARCH_AUTHORITY_PORTFOLIO.md`](docs/SEARCH_AUTHORITY_PORTFOLIO.md), `benchmarks/search-authority-portfolio.json`, `benchmarks/growth-experiments.json`
- **Ad governance:** `docs/AUTO_ADS_NETWORK.md` and `config/in-article-ads.json`
- **Current operating handoff:** [`docs/GROWTH_SESSION_LOG.md`](docs/GROWTH_SESSION_LOG.md)
- **Live measurement:** Google Search Console (search impressions, clicks, CTR and position); GA4 (behavior); AdSense (earnings, ad RPM, subject to its attribution coverage); source-linked revenue/cost documentation.

**Rule:** every growth or monetization implementation session updates the log, and updates this playbook when a goal, principle, or priority materially changes. These files must not be used to bypass any existing repository test, content, ad or SEO protection.
