# CTR and SERP plan: the 2026 fall window

Written 2026-08-06. Horizon: now through 2026-11-30.
Companion artifacts: `docs/search-personas.md`, `scripts/benchmark-ctr-surface.mjs`,
`benchmarks/ctr-surface-baseline.json`.

---

## 1. The arithmetic this plan is bound by

Current measured state, from `benchmarks/growth-100x-baseline.json`:

| | value |
|---|---|
| Impressions, current 28 days | 21,335 |
| Clicks, current 28 days | 284 |
| CTR | 1.33% |
| Average position | 11.94 |
| Top 2 pages share of impressions | 45.8% |

A correction worth carrying forward: the figure "roughly 9,700 impressions per month" that has
been repeated in planning is the 171 day average, not the current run rate. The current 28 day
run rate is 21,335, which is 2.2x that. Planning against the stale number understates where the
site actually is.

**The gate.** The first meaningful ad tier is Journey by Mediavine at roughly 10,000 sessions per
month. At 1.25 pageviews per Google click, that needs about 8,000 clicks per month. The site has
284. That is a factor of 28.

A factor of 28 cannot come from CTR alone; the realistic ceiling on CTR improvement is about 3x.
It cannot come from impressions alone at the current build rate. It needs both, roughly 6x
impressions and 4x CTR, and that is a 12 to 18 month arc, not a quarter.

**What that means for this plan.** AdSense is worth turning on now: no minimum, it validates the
plumbing, and the Pro plan already makes it legitimate. The revenue will be single digit dollars.
The honest goal for autumn 2026 is not a revenue tier. It is one clean, attributable, 2x to 3x
impression month, measured properly, so that the 2027 plan is built on evidence instead of
inference.

---

## 2. What the benchmark found

`npm run benchmark:ctr` scores the controllable snippet surface, weighted by impression share.

**Pages that already earn impressions: 99.5% weighted score.** The Aug 3 remediation pass worked.
Titles are 49 to 57 characters, descriptions 143 to 155, canonicals correct, internal linking
strong. There is essentially nothing left to fix on the snippet surface of the ranked pages.

**The 16 fall color pages: 63.7%, with all 16 failing at least one gate.** Specifically:

- 12 of 16 titles exceed 60 characters, up to 71. Every single title over 60 on the entire
  166 page site is a fall color page. The migration imported them wholesale and regressed the
  site's own standard.
- Descriptions run 155 to 231 characters. Most lose their second half in the SERP.
- Canonicals and sitemap entries omit the trailing slash while the other 150 pages use it. The
  pages resolve either way, so this is a split signal rather than a break, but it is inconsistent
  on exactly the pages that need clean signals in five weeks.
- `/fall-color-northern-lights-michigan/` has 3 inbound links against a network standard of 4,
  and its title carries no persona trigger.

**Internal linking is not the problem, which is worth stating because it was the assumed problem.**
Measured inbound links: `/fall-color/` has 19, the planner and drives map 14 each, against 10 for
the aurora page and 14 for Soo Locks. Fall color is already better linked than the pillars.

---

## 3. The reversal: what I now think was wrong in the last plan

**3.1 The enhancement list from the previous session was feed-led, not demand-led.**
It was derived from a 171 row data feed inventory, and every item on it targets a property with
almost no impressions: iNaturalist into birding (111 impressions), deer harvest into whitetail
(launched Jul 24, no history), gage cameras into trout (a separate property, and off-season),
Notice to Mariners into the gazette, DNR alerts into outdoor weekend (launched Jul 22), ECCC into
the north shore blind spot. Together those touch roughly 1 to 3% of network impressions. None of
them touch the pages carrying 45.8%, and none of them touch the season that starts in five weeks.
The list answers "what data could we add." The question was "where are the clicks."

**3.2 Tomatoes and frost dates were mis-diagnosed, by me, twice.**
They were called the site's worst CTR underperformers with the largest snippet headroom. Their
snippets already pass every gate and were already optimized on Aug 3, after which CTR did not
recover. The cause is that both queries are single facts that the SERP now answers inline. After
a zero-click discount the modeled recoverable pool is about 5 clicks a month combined. They should
be dropped from the priority list, not worked harder.

**3.3 The power outage tool should not be built.**
It was ranked the top new property last session on demand alone. Three things make that wrong:
the head term "dte outage map" is owned by the data owner and cannot realistically be outranked
by a third party; there is no supported API, so it is scrape-dependent; and a scraper that breaks
on a live-status page is the worst possible failure mode for a site whose whole value is being
trustworthy about current conditions. High demand for a query you cannot win is not an opportunity.

**3.4 Smoke and air quality is the right idea in the wrong month.**
It fills the July and August gap. Building it in August means it indexes in mid September, after
the gap has closed. Build it in March, ship it in May.

---

## 4. The plan

### Phase 0. Fall color snippet repair. Ship by Aug 13. One PR.
The highest value work available, and it is mechanical.
- Rewrite 12 titles to 60 characters or fewer, preserving the head term and the year.
- Trim descriptions to 158 or fewer, front-loading the peak-timing answer.
- Normalize canonicals and sitemap entries to the trailing slash convention used by the other 150 pages.
- Add 1 inbound link to `/fall-color-northern-lights-michigan/` and give it a persona trigger in the title.
- Gate: `npm run benchmark:ctr -- --check` must reach 100% on the watchlist.

### Phase 1. Indexation and freshness. Ship by Aug 20.
Everything that has to be true before Google's pre-season crawl.
- IndexNow submission for all 16 fall color URLs. Reaches Bing and Yandex only.
- Google Search Console submission. This is the one step Claude cannot do; no GSC credential exists.
- Verify truthful `lastmod` on the fall color block of the sitemap.
- Verify the fall color daily writer actually fires on Sept 1. It currently answers
  `{"skipped":"off-season"}` by design, which is correct but untested against a real September date.
- **Pull a GSC query-level export for `/soo-locks/`.** This is the only way to resolve the intent
  split described in persona 2, and it costs nothing. Without it, any Soo Locks work is a guess.

### Phase 2. Freeze. Aug 20 to Sept 20. Ship nothing.
This is a deliberate instruction, not an absence of one.

On Aug 4 changes shipped and CTR appeared to jump 5x the same day. That number could not be
attributed to anything, because the migration, the aurora work, and the Soo Locks routing all
landed together, and Google's most recent days of data are provisional. Continuing to ship during
the traffic event guarantees the same problem at a larger scale.

Freezing for the peak buys a readable result: one set of changes, then a clean season, then an
attributable answer. That answer is worth more than any single additional feature shipped in September.

Exception: production breakage. Nothing else.

### Phase 3. Seasonally timed enhancements. Sept 20 to Oct 31.
Only the two items from the previous list whose season is actually next:
- Deer harvest dashboard into the whitetail report. Michigan firearm season opens Nov 15;
  the query builds through October.
- DNR park alerts and closures into outdoor weekend. Directly useful to the fall color audience
  and it gives that property a reason to exist during the one season it can earn traffic.

Everything else on that list waits for its own season: gage cameras into trout in March,
iNaturalist into morel in April, Notice to Mariners into the gazette in the shipping season.

### Phase 4. New property decision. November.
Decide once, with the season's data in hand, rather than now. The candidates, pre-argued:
- **Michigan apple and cider harvest timing.** Best fit to the franchise shape: a named Michigan
  thing, live data (MSU Enviroweather growing degree days), a hard seasonal spike, and an audience
  that overlaps fall color exactly. Must be a harvest-timing model, not an orchard directory, or
  it is thin content. 2027 payoff.
- **Smoke and air quality.** Build March, ship May.
- **Power outage.** Recommend against, per 3.3.

Kill criterion for whatever gets built: if it is not indexed and earning impressions within 90
days, it folds into an existing property as a section instead of surviving as a project. The
network is at 36 properties. It does not need a 37th that does not earn.

---

## 5. What is deliberately not in this plan

- Any further work on the brand-name SERP. It is won and it returns no revenue.
- Any new subdomain. Consolidation onto the root domain is the standing pattern; the root already
  carries 95% of page impressions.
- Snippet changes to `/northern-lights-michigan/`. It outperforms its modeled CTR. Leave it alone.
- The remaining 8 thin identity stubs. Cheap to consolidate, worth roughly nothing either way.
  Do it in the freeze if idle, not before Phase 0.
