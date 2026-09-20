# Search Click + Chris Izworski Authority Execution Prompt

## Mission

Increase organic clicks from search impressions already being earned by chrisizworski.com while strengthening the **Chris Izworski** entity graph. Preserve the live utility that is already winning.

The operating target is not raw impression growth alone. It is:

1. more useful clicks per 1,000 search impressions,
2. stronger first-screen answers for the query that produced the impression,
3. a consistent, truthful publisher/author connection to the canonical Chris Izworski profile,
4. no regression to live tool behavior, mobile UX, canonical ownership, indexing, or AdSense usability.

## Current measured baseline

Use `benchmarks/search-click-authority-2026-09-20.json` as the starting ledger.

Site baseline from the September 20, 2026 Search Console last-24-hours export:

- 3,233 impressions
- 65 clicks
- 2.01% CTR
- 20.1 clicks per 1,000 impressions

Priority pages:

- `/soo-locks/`: PROTECT. 372 impressions, 34 clicks, 9.14% CTR, position 4.42.
- `/fall-color/`: PUSH. 352 impressions, 5 clicks, 1.42% CTR, position 7.33.
- `/great-lakes-freighter-tracking/`: PUSH. 350 impressions, 3 clicks, 0.86% CTR, position 7.59.
- `/northern-lights-michigan/`: PUSH. 257 impressions, 0 clicks, position 7.51.
- `/mackinac-bridge-tolls/`: PUSH. 251 impressions, 0 clicks, position 8.37.
- `/mackinac-bridge-live/`: PUSH. 184 impressions, 1 click, 0.54% CTR, position 8.66.

## Success target

Move the site from **20.1 to at least 40 organic clicks per 1,000 Google impressions** over comparable multi-day windows.

Do not claim causal uplift from a single day.

## Hard constraints

- Do not change a canonical URL.
- Do not add noindex, block crawling, or weaken sitemap discovery.
- Do not break a live data feed, map, calculator, route, JEV decision flow, or mobile layout.
- Do not remove or alter the canonical Person ID: `https://chrisizworski.com/#person`.
- Do not create thin Chris Izworski doorway pages.
- Keep the homepage strong for the exact-name query while using `/chris-izworski/` as the primary identity/profile surface.
- Do not stuff the name into unrelated copy.
- Do not change a title/H1 merely because CTR is low if the current title already matches the measured query and was recently changed. Prefer additive improvements and observation.
- Do not increase ad density as part of this sprint.

## Execution order

### 1. Protect the winner

Treat `/soo-locks/` as the control pattern. Preserve its query-first title, live answer, AIS utility, canonical, and first-screen hierarchy.

### 2. Fix high-impression, low-click pages before building adjacent URLs

For each PUSH page:

- confirm the current title matches the actual query family,
- confirm the meta description promises what the page immediately delivers,
- confirm the first screen answers the decision without requiring a long scroll,
- preserve one canonical owner for the topic,
- strengthen internal links from semantically related pages,
- connect the visible publisher attribution to `/chris-izworski/`.

### 3. Strengthen name SEO without cannibalizing tool intent

Every priority tool must retain:

- a visible Chris Izworski publisher/byline signal,
- a crawlable link to `/chris-izworski/`,
- the canonical Person `@id`,
- truthful authorship/publisher structured data.

The profile page remains a distinct identity surface. Do not replace tool titles with branded titles when that would weaken the non-branded query.

### 4. Measure before rewriting titles again

Titles already matching the query should be protected until a comparable post-change window exists. Revisit only when:

- impressions remain meaningful,
- position remains roughly comparable,
- CTR remains materially below the portfolio benchmark,
- the current snippet does not clearly express the page's unique utility.

### 5. Keep ads subordinate to the tool

AdSense is allowed to learn. Do not use this sprint to add more ad slots. First-screen decision value must remain visually dominant.

## Benchmark

Score 100 points:

- Search intent and snippet fidelity: 25
- First-screen decision value: 20
- Entity/authorship clarity: 20
- Canonical/indexability integrity: 15
- Mobile UX and ad restraint: 10
- Measurement/regression protection: 10

Pass threshold: **92/100**, with no hard veto.

## Loss function

`L = 10*hardVeto + 5*breakage + 4*canonicalOrIndexingRegression + 3*entityDrift + 2*intentMismatch + 2*mobileUxRegression + 1*adIntrusion`

Minimize loss while increasing click yield.

## Release gate

Before merge:

1. run `npm run verify:all`,
2. confirm the priority titles, H1s, canonicals and live logic were not unintentionally changed,
3. confirm each priority page has a crawlable link to `/chris-izworski/`,
4. confirm the profile still defines a `ProfilePage` whose `mainEntity` is `https://chrisizworski.com/#person`,
5. inspect mobile rendering for any page whose visible markup changed,
6. merge only on green gates.
