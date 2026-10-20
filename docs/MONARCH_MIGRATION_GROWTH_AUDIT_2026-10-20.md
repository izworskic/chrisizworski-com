# Monarch Migration Live — Million Impressions quality audit

**Date:** 2026-10-20  
**Canonical:** https://chrisizworski.com/national-tools/monarch-migration-live  
**Owning repository:** [izworskic/monarch-migration-live](https://github.com/izworskic/monarch-migration-live)  
**Merge:** [PR #12](https://github.com/izworskic/monarch-migration-live/pull/12), `59c93ee79dfcd6b29a4de32e20075792c10e5440`  
**Production:** Vercel `dpl_3NRcM6dkArYCbR9ZPya3HM1nDaYv` — `READY` on matching SHA  
**Release verification:** [GitHub Actions run 39467998400](https://github.com/izworskic/monarch-migration-live/actions/runs/39467998400) — test and production smoke both passed.

## Tool-quality checklist — source HTML

The checks below were run against the owning repository's `public/index.html` using the conditions and deduction weights from `scripts/tool-quality-factory.mjs` on `feature/tool-quality-factory-v1`. This was a one-off **source-HTML evaluation**, not an invocation of the pending shared GitHub Actions workflow; production HTTP headers and rendered browser behavior are not included in this numerical score.

| | Before | After |
| --- | ---: | ---: |
| Initial-HTML quality score | **72/100 · FAIL** | **100/100 · PASS** |
| Blocking errors | 1 | 0 |
| Warnings | 2 | 0 |
| Title length | 75 | 54 |
| Visible creator attribution | Missing | `Built by Chris Izworski` |
| Canonical Person identifier | Missing | `https://chrisizworski.com/#person` |

Previously flagged: `person-id` (error), `visible-creator` (warning), `title-length` (warning). All three are fixed in the merged source.

After-change checks: title `Monarch Migration Map Today: Recent Sightings & Timing`, description 164 characters, one H1, 1,081 initial-main words, 16 discoverable links, one valid WebApplication JSON-LD block with author/publisher Person identifier, one image with an alt attribute, expected canonical, no noindex directives in HTML.

**Protected:** No modifications to AdSense code/settings, map, model, sources, source licensing rules, Pictured Rocks-style reading layout, or location controls. The page and location-guide production smoke test passed.

## Search measurement

- **Search Console 28-day Web property totals:** NOT AVAILABLE — no dated native GSC snapshot provided to this review.
- **Monarch URL 28-day impressions, clicks, CTR, average position, query families:** NOT AVAILABLE in a verifiable current report.
- **AdSense page revenue / RPM:** NOT AVAILABLE.
- **Indexing/ranking/click lift:** NOT VERIFIED. Technical quality is not a ranking prediction.
- **Goal:** 1,000,000 sitewide impressions in 28 days, 5% CTR (50,000 clicks); these are targets, not observed outcomes.

## Shared framework status and next action

Monarch's production URL has been added to `config/tool-quality-pilots.json` on `feature/tool-quality-factory-v1`, which retains **manual-only** `workflow_dispatch` / explicit `workflow_call` triggers. No every-merge, push, PR or cron trigger is introduced. This feature branch has **not** been merged to site main, and its Github Actions workflow has **not** been dispatched here. The present report is not the workflow's combined JSON/Markdown artifact.

**Exactly one next action:** Validate and release the shared Growth & Quality Hub feature branch, then invoke its one-off manual GitHub Actions audit against Monarch's public HTTPS URL with a finalized 28-day GSC snapshot when available.
