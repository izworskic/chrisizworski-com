# Working agreement for coding agents

This repo is the live personal hub for Chris Izworski. It auto-deploys to production
on merge to `main`. There is no staging step between a merge and real traffic.

Read this file before making any change.

## 0. Extracted tool repositories are authoritative

This repository still contains deployment mirrors for some national tools and Isle Royale so
existing production URLs remain intact during routing cutover. **Do not develop those products
here.** Their authoritative implementation sources are:

- `izworskic/national-outdoor-core` — shared national geocode/location and freshness/source contracts
- `izworskic/national-outdoor-tools-hub` — national tools landing and navigation/search hubs
- `izworskic/national-aurora`
- `izworskic/national-rivers`
- `izworskic/national-frost`
- `izworskic/national-planting`
- `izworskic/national-fall-color`
- `izworskic/national-coastal-water`
- `izworskic/national-snowpack-melt`
- `izworskic/national-white-christmas`
- `izworskic/isle-royale-outdoors`

If work is requested on one of those products, make the implementation change in its owning
repository first. Changes in this repo are limited to site-shell integration, routing, canonical
URL preservation, deployment composition, or an explicit mirror sync. Never introduce new
tool-specific business logic into the mirror.

The current public paths remain canonical during the migration. Repo extraction is an
implementation boundary, not permission to change URLs.

## 1. Run the full gate before you open a PR

```
npm run verify:all
```

That runs the repository tests, source verification, and every product/search
benchmark registered in `package.json`, including the site-wide search strategy
and holistic search-authority portfolio governance gates.

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

Before any search-facing change, read `docs/SEARCH_STRATEGY.md`,
`docs/SEARCH_AUTHORITY_PORTFOLIO.md`, `benchmarks/search-strategy-governance.json`,
and `benchmarks/search-authority-portfolio.json`. Then check the current measured
state in `benchmarks/search-growth-engine-2026-08-15.json`, the experiment
ledger in `benchmarks/growth-experiments.json`, the canonical intent owners in
`benchmarks/tool-network-registry.json`, the owned-property graph in
`benchmarks/owned-domain-network.json`, and branded governance in
`benchmarks/name-serp-governance.json`.

The authority portfolio is the operating backlog. Every active tool/property
resolves to one of these actions: `PROTECT`, `PUSH`, `EXPAND`, `CONNECT`,
`REPAIR`, `BUILD_NEXT`, or `RETIRE`. Priority and permission are separate: a
high-opportunity page under a running experiment remains `PROTECT` until its
measurement window closes.

Use this order when deciding what to build or change:

1. Protect crawl/index/canonical integrity, factual accuracy, structured data and usability.
2. Protect active experiment windows.
3. Check the current portfolio action before touching the surface.
4. Improve meaningful-impression pages already near page one before creating adjacent keyword URLs.
5. Strengthen the existing canonical intent owner before creating a supporting page.
6. Create a new indexable URL only when it passes the new-canonical gate: distinct decision, documented evidence or unique utility, cannibalization safety, network fit, entity integrity, discovery and measurement.
7. Connect important pages into the contextual tool/authority network.
8. Reinforce the Chris Izworski entity and legitimate branded SERP occupancy without causing non-branded cannibalization.

Do not create doorway pages for keyword, city, county or date variants merely to
increase index count. A new canonical needs materially distinct user value.

Run both search governance gates for search-strategy work:

```
npm run benchmark:search-strategy -- --check
npm run benchmark:search-authority -- --check
```

Both are enforced by `npm run verify:all`.

## 2. Never weaken the name

"Chris Izworski" is the entity this whole site is built around. The branded
search objective is twofold: keep `https://chrisizworski.com/` as the strongest
candidate for position #1 when it is already winning, and earn as much
legitimate top-10, top-20 and top-30 result occupancy as possible with distinct
owned properties, controlled profiles and independent third-party authority.

`https://chrisizworski.com/chris-izworski/` remains the primary identity surface
for entity clarity, but do not force it to displace a winning homepage. It should
reinforce the canonical Person entity and add a distinct branded authority
surface.

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

`benchmark:serp-length` enforces both limits on every page. Two things about it:

**It measures the rendered string, not the source.** `&amp;` is five characters
in the file and one on the SERP; `&#x27;` is six and one. Count what Google
renders or you will chase titles that were never over.

**Count before you rewrite.** Three "over limit" findings in the August 25 pass
were entity-encoding artifacts, not real overages. Measuring first is cheaper
than reverting.

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

## 6b. Changing a page that is inside an experiment

`benchmarks/growth-experiments.json` and the per-experiment files record a
`status`, a `releaseDate` and an `evaluationWindow`. Before you decide a page is
untouchable, read those three fields, because they mean different things.

**`pending-clean-window` with `releaseDate: null` means the clock has NOT
started.** Nothing is being measured yet. This is the cheapest possible moment to
fix a defect: correct it now and the window opens on the corrected page, still
single-variable. Deferring a fix here buys nothing and costs a worse page for
28 days. On 2026-08-25 three descriptions were trimmed in exactly this state and
recorded under `preWindowContentChanges`.

**`status: running` with a live `evaluationWindow` means the clock IS running,**
and if the page carries a `freeze` list you must not touch anything on it. The
description, title and first answer are usually the treatment itself, so editing
them does not contaminate the measurement, it *replaces* the thing being
measured, and the 28 days are spent.

So the rule is not "never touch an experiment". It is:

| state | do |
| --- | --- |
| `pending-clean-window`, no release date | fix it now, record under `preWindowContentChanges` |
| `running`, page not in a `freeze` list | fix non-treatment defects, record under `midWindowContentChanges` |
| `running`, field is in the `freeze` list | wait for the window, and make the wait expire on its own |

**Before opening an experiment at all, check the power floor.** A page qualifies
for a CTR freeze only if its 28-day baseline clears BOTH 4,000 impressions and
80 clicks (`measurementProtocol.minimumBaselineImpressions` and
`minimumBaselineClicks`). Below that, a 28-day window cannot resolve even a 50%
relative CTR change, so freezing the page costs shipping speed and buys nothing.
Measured across all 21 experiments on 2026-09-01: only `/northern-lights-michigan/`
and `/soo-locks/` cleared it, while the rest needed between 2,229 and 77,988
impressions per arm against baselines of 30 to 5,479. For pages under the floor,
measure average position and impressions — far more data, and they move first —
or ship and watch rank.

**A window may be closed early when the remaining days cannot change the
decision.** Aurora was read at 18 of 28 days because the detectable difference
only moved from 0.44pp to 0.39pp over the remaining ten. Record `readType:
partial-window` with the elapsed days and the detectable difference at read time.
This is not licence to peek and stop when the number looks good: decide the read
date before you look at the data.

**Window length does not protect a seasonal or event-driven page.** Aurora
impressions are driven by geomagnetic storms and news cycles, fall pages by the
season itself. Check the daily impression curve for spikes before trusting any
aggregate, partial or complete. Waiting longer does not average that away.

That last row is the one worth getting right. `/tools/` has a 160-character
description against a 158 limit, and its window runs to 2026-09-21 with
`metaDescription` frozen. Two characters are not worth a 28-day measurement, so
it is exempt in `scripts/benchmark-serp-length.mjs` — but the exemption carries
`until: "2026-09-21"` and the gate starts failing on 2026-09-22. **Schedule the
fix, do not forgive it.** An exemption with no end date is just a hidden failure.

## 6c. Never let a gate see input that was not committed

Two wrapper scripts, `verify-source-with-circle-tour.mjs` and
`check-freshness-with-circle-tour.mjs`, rewrote page HTML, the sitemap and
`verify-source.mjs` itself on disk, ran the real gate against the doctored files,
then restored the originals in a `finally` block. `npm run verify:all` exited 0
while the real verifier exited 1 with seven failures, and eight routes were
exempted from drift detection with no declaration visible anywhere in the repo.
Both scripts are deleted. Do not reintroduce the pattern under any name.

If a gate fails on honest input there are exactly two legitimate moves:

1. **Fix the code** so the assertion passes.
2. **Fix the assertion** if it is measuring the wrong thing, in a commit that says
   so. The Circle Tour NOAA check was reading `index.html` after the water-level
   request had moved to `public/assets/lake-superior-circle-tour.js`. The product
   was correct the whole time; the gate was reading the wrong file. That is a
   one-line fix to the gate, not a reason to fake the input.

If a page legitimately differs from the live snapshot, declare it in
`intentionalChanges` **in the committed file**, where a reviewer can see it.

## 6d. A missing field is not a passing check

`stamp-freshness.mjs` used to `continue` past any page with no `dateModified`. A
page with no stamp can never be reported as stale, so removing the field removed
the page from the freshness system entirely. `/connect/` lost its `dateModified`
in a revert on 2026-08-24 and sat 14 days stale with every gate green.

The check now fails when a **sitemap-listed** page carries no `dateModified`.
Unlisted pages may still have none, because their `lastmod` has nothing to
disagree with.

Same class of bug in the sitemap sync: `SITEMAPS` listed three files while
`robots.txt` declared seven, so `sitemap-fall.xml`, `sitemap-manistee.xml` and
`sitemap-winter.xml` drifted unchecked, and `sitemap-winter.xml` shipped eleven
URLs with no `<lastmod>` at all. **If you add a sitemap to `robots.txt`, add it
to `SITEMAPS` in the same commit.**

When you write a check, ask what it does with an absent value. Skipping is the
wrong answer more often than it looks.

## 7. Open a PR, do not push to main

Merges are Chris's call. Put the gate results in the PR body.
