# Working agreement for coding agents

This repo is the live personal hub for Chris Izworski. It auto-deploys to production
on merge to `main`. There is no staging step between a merge and real traffic.

Read this file before making any change.

## 1. Run the full gate before you open a PR

```
npm run verify:all
```

That runs the repository tests, source verification, and every product/search
benchmark registered in `package.json`, including the site-wide search strategy
and holistic Search Authority Portfolio governance gates.

**Every gate must pass.** They are merge gates, not advisory output. If any one of
them fails, fix the cause or explain why the expectation itself should change —
do not merge past a red gate.

`benchmark:seo` (`scripts/measure-discovery.mjs`) is the brand guardrail. It
fails if the `<title>` of these pages does not contain "Chris Izworski":

- `/soo-locks/`
- `/northern-lights-michigan/`
- `/great-lakes-gazette/`
- `/great-lakes-freighter-tracking/`

It also pins the canonical URL on those pages. Both checks exist because a
previous pass silently stripped the byline from all four.

## Search strategy operating system

Before any search-facing change or proposal for a new indexable build, read:

- `docs/SEARCH_AUTHORITY_PORTFOLIO.md`
- `benchmarks/search-authority-portfolio.json`
- `benchmarks/search-console-snapshot-2026-08-21.json`
- `docs/SEARCH_STRATEGY.md`
- `benchmarks/search-strategy-governance.json`
- `benchmarks/search-growth-engine-2026-08-15.json`
- `benchmarks/growth-experiments.json`
- `benchmarks/tool-network-registry.json`
- `benchmarks/name-serp-governance.json`
- `benchmarks/entity-surface-baseline.json`
- `benchmarks/citation-baseline.json`

The Search Authority Portfolio is the **opportunity-cost layer**. The page-level
SEO strategy tells you how to make a search change safely; the portfolio tells
you whether that page or build deserves the next unit of effort at all.

Classify meaningful search work using the portfolio action classes: `protect`,
`protect-then-push`, `push-rank`, `repair-serp-conversion`, `diagnose-zero-click`,
`expand-authority`, `connect`, `seasonal-build`, `launch-gated`, or `deprioritize`.
Do not invent a new priority system in a one-off PR when the portfolio already
contains the relevant asset or cluster.

Use this order when deciding what to build or change:

1. Protect crawl/index/canonical integrity, factual accuracy, structured data and usability.
2. Protect active experiment windows.
3. Compare the proposed work against the P0/P1 Search Authority Portfolio and its opportunity cost.
4. Improve meaningful-impression pages already near page one before creating adjacent keyword URLs.
5. Strengthen the existing canonical intent owner before creating a supporting page.
6. Create a new indexable URL only when it passes the new-canonical gate: distinct decision, documented evidence or unique utility, cannibalization safety, network fit, entity integrity, discovery and measurement.
7. Connect important pages into the contextual tool/authority network and strengthen the relevant topical cluster.
8. Reinforce the Chris Izworski entity and grow legitimate branded SERP occupancy through real work and independent authority without causing non-branded cannibalization.

A new build must beat the opportunity cost of improving an existing near-page-one
asset. Prefer a new build only when it serves a distinct decision or unique
first-party utility, fits a cluster, has a measurement plan, and normally connects
to at least two useful portfolio nodes.

Do not create doorway pages for keyword, city, county or date variants merely to
increase index count. A new canonical needs materially distinct user value.

Run both of these for portfolio/search strategy work:

```
npm run benchmark:search-strategy -- --check
npm run benchmark:authority-portfolio -- --check
```

Both are also enforced by `npm run verify:all`.

## 2. Never weaken the name

"Chris Izworski" is the entity this whole site is built around. The branded
search objective is to keep a first-party `chrisizworski.com` surface at position
#1 and earn as much legitimate top-10, top-20 and top-30 result occupancy as
possible with distinct owned properties, controlled profiles and independent
third-party authority.

Fresh Search Console evidence currently shows the exact-name query at average
position 1.0 and the homepage at average position 1.59. **Do not force the deep
biography page to replace a homepage that is already the stronger first-party
navigational result.** `/chris-izworski/` remains the canonical deep biography
and entity-reference surface; the homepage may remain the #1 branded landing
surface while observed evidence supports it.

This branded objective is intentionally different from non-branded query
ownership. For a subject query, preserve one clear canonical owner. For the
exact and close-name query family, multiple genuinely distinct Chris Izworski
surfaces are desirable when each has independent value. Do not create thin
clones, doorway pages or duplicate sites just to increase result count.

On every page, the name must survive in all three places:

1. **JSON-LD.** Every page carries a `Person` node whose `@id` is exactly
   `https://chrisizworski.com/#person`. Content pages reference it via `author`
   and `publisher`. Identity pages carry it as the subject. A bare
   `{"@id": "...#person"}` reference is **not enough on its own** — the node must
   also be defined in that page's graph, or the reference dangles.
2. **Visible byline.** Header brand link and footer `© <year> Chris Izworski`.
3. **`<title>`, when it fits.** See the length rule below.

Before changing any `<title>`, `<h1>`, canonical, indexability rule, internal
identity link, or JSON-LD block, check what the change does to both the canonical
Person signal and the branded-result footprint. Do not weaken a distinct useful
branded surface merely because another Chris-owned result also ranks for the
name.

The explicit branded occupancy targets live in
`benchmarks/name-serp-governance.json`. Treat them as a standing search goal,
not an excuse to violate the distinct-value or non-branded cannibalization rules.

Independent authority matters more than another owned clone. Legitimate
association, government, employer, author, conference, podcast, news and
professional surfaces that corroborate Chris and his work are part of the
portfolio. Never fabricate or mass-create low-authority profiles for backlinks.

## 3. Length rules

- **`<title>` ≤ 60 characters.** Google truncates around there. A byline that
  gets clipped is paid characters with zero brand benefit.
- **`<meta name="description">` ≤ 158 characters.**

Prefer shortening the descriptive middle over dropping the byline. The pattern
that works: pick the longest variant that still fits.

```js
const candidates = [
  `${base}: Waves, Water & Alerts | Chris Izworski`,
  `${base}: Waves & Water Temp | Chris Izworski`,
  `${base} | Chris Izworski`,
  `${base}: Waves & Water Temp`,
  base,
];
return candidates.find((c) => c.length <= 60) || base;
```

Query-first titles are welcome — "Soo Locks Schedule Today", "Northern Lights
Michigan Tonight", "How Deep Is Saginaw Bay?" all outperform a bare topic. Just
keep the byline when it fits, and keep the title consistent with the page's H1
and URL slug.

## 4. Generated files

The 50 beach detail pages under `public/great-lakes-beaches/*/` are **generated**
by `scripts/generate-beach-pages.mjs`. Edit the generator and re-run
`npm run generate:beaches`.

The 10 ice pages under `public/michigan-ice/` are **generated** by
`scripts/ice/gen_site.py` (Python, run manually via `npm run generate:ice`; the
output is committed, so Vercel never needs Python). Titles, descriptions and the
`/michigan-ice` base path all live in `scripts/ice/gen_chrome.py` and
`gen_site.py`. The `BASE` constant and the hardcoded `href="/michigan-ice/..."`
strings must agree; there is an assertion at the bottom of `gen_site.py`.

Editing generated output files directly gets wiped on the next regeneration.

## 5. Pinned expectations to keep in sync

Titles are asserted in several places. Change a title and you must update all of
them in the same commit:

- `tests/growth-static.test.js`
- `tests/gazette-daily.test.js`
- `tests/freighter-tracker.test.js`
- `scripts/benchmark-growth.mjs`

`scripts/verify-source.mjs` hashes every page against a clean live snapshot. When
you intentionally change a page, add its route to the `intentionalChanges` Set.
If the route already has a pinned hash in `committedDriftHashes`, repin that hash
instead — that preserves drift detection for future unintended edits.

## 6. Additive by default

Do not rebuild or restructure existing tools. Add pages and blocks. If a change
removes content, links, or schema nodes, say so explicitly in the PR body with
before/after counts.

Watch specifically for:
- internal links into the `/chris-izworski-*` identity cluster (roughly 450 across the site)
- sitemap URL count
- third-party embeds: `loading="lazy"`, never `eager`

## 7. Open a PR, do not push to main

Merges are Chris's call. Put the gate results in the PR body.
