# Four established CTR candidates: production and search audit

Owner: Chris Izworski. Repository: `izworskic/chrisizworski-com`.
Goal: 1,000,000 Google Web impressions per rolling 28 days and 5% CTR (50,000 clicks), with real revenue and the canonical Chris Izworski identity preserved.

## Plan and completion criteria

1. Read `AGENTS.md`, `MILLION_IMPRESSIONS_PLAYBOOK.md`, the session log and search/entity governance. Confirm main is green and identify the latest changes.
2. Audit only `/northern-lights-michigan/`, `/mackinac-bridge-tolls/`, `/great-lakes-freighter-tracking/`, `/mackinac-bridge-live/`. Check normal production responses, metadata, canonical, linked creator credit, JSON-LD, sitemap, ads and primary browser interactions.
3. Retrieve the latest complete 28-day GSC Web window. Capture top non-branded queries for each exact canonical; preserve page totals separately from visible-query totals. Record unavailable data explicitly.
4. Distinguish source commit, successful deployment, live HTML, search snapshot, Google-selected canonical and measured post-change performance. These are separate facts.
5. Choose exactly one improvement supported by the audit, verify it, open a PR and record one next action.

No new tools, indexable pages, title churn, mass publishing, changes to fall-color winners or changes to ad placements are authorized by this mission.

## Verified production outcome

Inspected October 11, 2026, approximately 11:42 AM–12:05 PM EDT. Baseline checkout: `3e75eccc126e5bc21fbe8b348327854ba42ccd2d` (PR #900). GitHub's Vercel commit status is `success`, "Deployment has completed": https://vercel.com/izworski-gmailcoms-projects/chrisizworski-com/29eQV9sQHsSFD4Cns8BwAQB9Mr2Y . Agent branch verification on this commit is successful. Direct Vercel inspection is unavailable through this connection (deployment-list 403 and resource 404); an independently retrieved READY value is therefore **NOT AVAILABLE**. Public production readback is verified.

All four normal URLs returned HTTP 200, the intended self-canonical, no noindex, valid JSON-LD, one fully defined `https://chrisizworski.com/#person`, linked "Built by Chris Izworski" and one emitted AdSense loader. Loader presence does not prove ad revenue or delivery. All four routes appear in the production sitemap.

| Candidate | Browser result | Current production title |
| --- | --- | --- |
| Northern Lights Michigan | NOAA/solar wind live values loaded; region selector switched to Bay City; API degraded=false | Northern Lights Michigan Tonight: Live \| Chris Izworski |
| Mackinac Bridge Tolls | Passenger car $4; car + 2-axle trailer $8; 2-axle motorhome + 2-axle passenger auto $14 | Mackinac Bridge Toll 2026: $4 for a Passenger Car |
| Great Lakes Freighter Tracking | Map and corridor switching worked; Saginaw Bay had eight recent reports; SAM LAUD position popup opened; nearby NOAA data loaded | Great Lakes Ship Tracker Live Now \| Chris Izworski |
| Mackinac Bridge Live | Official open status loaded; RV/southbound controls responded; both direction camera images and radar loaded; four forecast windows rendered | Mackinac Bridge Conditions Today: Live Status & Wind |

The AIS API returned 298 vessels in the first HTTP audit and 300 recent vessels in the later audit. Counts are time-specific observations, not constant assertions. Aurora and bridge APIs also returned HTTP 200 with degraded=false. Public VAPID-key read succeeded; background push subscription/delivery and cron transitions were not exercised. No notification permission was granted. Mobile browser emulation was unavailable in this environment; desktop behavior and existing responsive checks were verified, not a real-device mobile signoff.

## Search baseline

Source: Windsor.ai, `sc-domain:chrisizworski.com`; explicit `search_type=web`; worldwide; September 12–October 9, 2026 inclusive (28 days). Dated query rows were checked to be within that exact range. The attached machine-readable snapshot stores each page's top 20 non-branded queries, brand rule, visible-query totals and site daily totals. Explicit Web extraction supersedes preliminary requests without the search_type field that returned different aggregates.

Site: **120,622 impressions; 3,033 clicks; 2.51% CTR; impression-weighted position 7.91**. This is a baseline before October 11 releases, not evidence of their effect.

| Page | Impressions | Clicks | CTR (clicks / impressions) | Position | Leading non-branded query |
| --- | ---: | ---: | ---: | ---: | --- |
| Northern Lights Michigan | 15,929 | 179 | 1.12% | 7.34 | northern lights michigan tonight: 448 impressions, 4 clicks |
| Mackinac Bridge Tolls | 6,505 | 18 | 0.28% | 8.24 | mackinac bridge toll: 781 impressions, 1 click |
| Great Lakes Freighter Tracking | 9,125 | 141 | 1.55% | 7.34 | great lakes ship tracker: 1,168 impressions, 8 clicks |
| Mackinac Bridge Live | 4,773 | 16 | 0.34% | 8.71 | mackinac bridge conditions today live: 431 impressions, 1 click |

Brand exclusions: Chris/name variants, chrisizworski.com and Freighter View Farms. All leading queries above are non-branded. Page CTR includes all queries; query sums exclude anonymized queries and must not be substituted for page totals. U.S.-only performance is not measured in this snapshot. Actual page AdSense revenue/RPM and GA4 engagement are **NOT AVAILABLE** in this audit; no revenue or rank uplift is claimed.

## Are recent changes appearing in search?

The October 11 CTR commit `38113d2a` changed aurora, freighter, bridge-live and Michigan border waits. This mission audits the owner's four established candidates, which include tolls instead of border waits. Tolls retains its existing cost-first title; PR #900 updated identity markup, not its title. Do not claim all four titles were rewritten today.

| Page | Retrieved search snapshot | Evidence state |
| --- | --- | --- |
| Aurora | "Northern Lights Michigan Tonight: Aurora \| Chris Izworski", canonical host | Current "Live" title adoption unconfirmed |
| Freighter | "Great Lakes Ship Tracker: Live AIS Map \| Chris Izworski", picturedrocks subdomain | Older title/alias surfaced; current canonical title adoption unconfirmed |
| Bridge live | "Mackinac Bridge Conditions Today: Live Status & Cameras", picturedrocks subdomain | Older title/alias surfaced; current "Wind" title adoption unconfirmed |
| Tolls | "Mackinac Bridge Toll 2026: $4 for a Passenger Car", picturedrocks subdomain | Existing title surfaced; canonical-host adoption unconfirmed |

These are search-provider snapshots retrieved October 11, not direct Google SERP or URL Inspection results. Some crawl dates precede today's release. The aliases need a later canonical-ownership inspection; their appearance alone does not prove Google canonical drift, a penalty or deindexing. Google's selected canonical, recrawl dates and adoption of the latest title/snippet are **NOT AVAILABLE** here. Historical GSC impressions prove prior search visibility, not current snippet text.

## Exactly one selected improvement

**Make production verification repeatable and fail on stale normal-URL output.** Evidence: multiple prior log entries stop at production NOT VERIFIED, and the existing toll smoke workflow prints CLEAN_URL_UPDATED=false without failing; only its cache-busted response is mandatory. That can miss the stale page normal visitors/search crawlers actually receive.

Added `scripts/audit-ctr-production.mjs` and a manual GitHub Actions workflow covering these four normal URLs. It checks current titles against the committed source, canonical/indexability, schema/creator credit and one ad loader, and records public upstream states separately. It does not subscribe to push, create data, change production pages, publish anything or call paid AI. Upstream outages are reported as degradation rather than mislabeled zero traffic/open conditions. Browser interactions remain a separate requirement; HTTP success is not an end-to-end UX pass.

Run after production deployment completes:

```bash
node scripts/audit-ctr-production.mjs
```

The manual workflow avoids racing an in-progress deployment. Tests cover stale title rejection, missing/invalid metadata and correct acceptance of the existing FAQPage WebPage subtype. No URLs, page content, titles, links, schema nodes or sitemap entries are added or removed.

## Measurement continuation and next action

**One next action:** Once GSC includes October 11 onward, inspect the four exact URLs' Google-selected canonicals/last crawl/title adoption and collect the first comparable post-release Web page/query observation; make one PROTECT/REPAIR/PUSH decision. First checkpoints: October 18, October 25, November 8, subject to reporting completeness. The 28-day window October 12–November 8 is the first full calendar window after the release date; use actual release/recrawl timing and record later indexing separately. These are manual observation dates, not a configured recurring automation or freeze.

Preserve the fresh title treatments until evidence warrants revising them. Bridge and toll queries have very low CTR, but immediate repeated rewrites cannot diagnose a treatment released hours ago. Check query/device/country/position mix, storm-driven aurora demand, seasonality, search appearance and actual revenue before attributing a change to snippets. Any verified breakage can be repaired immediately.

## Reusable execution prompt

```text
@codex — Execute the four established CTR candidate audit in izworskic/chrisizworski-com toward 1,000,000 GSC Web impressions / rolling 28 days, 5% CTR and growing real revenue.

Read AGENTS.md, MILLION_IMPRESSIONS_PLAYBOOK.md, docs/GROWTH_SESSION_LOG.md, docs/CTR_CANDIDATE_AUDIT_2026-10-11.md and current search/entity governance first. Check main CI and preserve the exact canonical Chris Izworski identity: domain https://chrisizworski.com; profile https://chrisizworski.com/chris-izworski/; Person https://chrisizworski.com/#person.

Only audit /northern-lights-michigan/, /mackinac-bridge-tolls/, /great-lakes-freighter-tracking/, /mackinac-bridge-live/. No new tools, new indexable pages, mass publishing, changes to fall-color winners or speculative title rewrites.

Run node scripts/audit-ctr-production.mjs after the intended production deployment completes. Verify core browser interactions and mobile independently; a 200 or loader is not proof of a working tool or earnings. Record degraded source states honestly and never infer open/zero traffic from unavailable data.

Get the latest complete 28-day GSC Web baseline for exact canonical URLs and top non-branded queries, with explicit dates, search type, country/device scope and brand exclusions. Preserve page totals separately from visible query totals. Save observed data or NOT AVAILABLE. Record Google-selected canonical, last crawl and current search title/snippet adoption only from direct evidence; search-provider snapshots and source metadata do not establish Google adoption.

Select one evidence-backed improvement. If today's treatment is working and post-change data is absent, preserve it and improve the demonstrated reliability/measurement gap. Implement only in the owning repository, run focused checks and npm run verify:all, and open a PR with actual results. Respect owner merge policy; do not claim deployed from a branch or PR.

Update docs/GROWTH_SESSION_LOG.md with PR/SHA/CI/production status, data limits, measured revenue or NOT AVAILABLE, and exactly one next action. Done means four recorded production audits, four top-query baselines or explicit reporting blockers, honest search-adoption states, one justified improvement/decision, green required checks and a durable handoff. Never claim impressions, CTR, indexing or revenue improved merely because code shipped.
```
