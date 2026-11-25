---
name: search-demand
description: "Pick what to build, fix or retire from real Search Console evidence, and clean up 404s and sitemap errors. Use when choosing the next page or tool for search, when Search Console reports 404s, indexing or sitemap problems, when asked where search traffic is, or before creating pages to capture search demand."
---

# Search demand: decide from evidence, then clean up

The owner's search targets (MILLION_IMPRESSIONS_PLAYBOOK.md) are targets, not achievements. Demand claims need dated Search Console evidence or they are NOT MEASURED. This skill turns that evidence into a ranked list of actions and keeps the index clean. Page-level integrity (titles, canonical, Person, schema) stays with `web-quality-seo`.

## 1. Get the evidence, read-only

- First source: the private growth summary. When `GROWTH_AGENT_TOKEN` is set in your environment, fetch it before ranking anything:

  ```bash
  curl -fsS -H "Authorization: Bearer $GROWTH_AGENT_TOKEN" "https://chrisizworski.com/api/growth-command-center?view=agent"
  ```

  It reads the stored daily snapshot (no live Google call) and returns `topEarners`, `topImpressions`, `ctrGaps`, `risers` and `fallers` against the prior 28 days, the sitewide `revenueTrend`, and each source's `state`. If `stale` is true or a source is not `ok`, that source is NOT MEASURED, not zero.
- If the token is not set, the request fails (401, 404 or 503) or the host is unreachable, say once that the growth summary is unavailable and fall back to the next source. Never ask for the token's value, print it or write it anywhere.
- Fallback: Search Console, search type Web, the property that owns the URL. Use an owner-supplied export, or a read-only API credential (`webmasters.readonly` scope) that the owner set up. Never invent, estimate or back-fill numbers; a missing window is NOT MEASURED, not zero.
- Do not connect agents to a Search Console tool that can submit or delete sitemaps or load remote instructions at run time.
- Compare equal windows (28 days against the previous 28, or the same 28 days last year for seasonal tools). Record the dates and the property.
- Read `docs/SEARCH_STRATEGY.md`, `docs/GROWTH_SESSION_LOG.md` and the tool network registry (`benchmarks/tool-network-registry.json`) before proposing anything.

## 2. Rank the opportunities

| Pattern | Evidence | Action | Hand to |
| --- | --- | --- | --- |
| Close to page one | Positions 5 to 20, many impressions, low CTR | Improve the answer in the HTML and the snippet | web-quality-seo |
| Query with no owning page | Impressions landing on a page not built for that decision | Candidate for a new tool or section, after the registry owner check | opportunity-scout |
| Two pages on one query | Both pages earn impressions for the same query | Consolidate into the owner; canonical or redirect the other | web-quality-seo |
| Seasonal lead | Last year's same window shows a ramp | Ship 6 to 8 weeks before the ramp | opportunity-scout |
| Declining page | Equal-window drop with stable position | Check freshness and the answer before rewriting | freshness-watch |

In the growth summary, `ctrGaps` feeds the first row and `fallers` the last. A page in `topEarners` is an earning experience to protect: change it only for a clear defect, and never trade its answer for more pages.

Never create pages per city, county, date or keyword variant unless each page has materially unique information and a distinct decision to serve (AGENTS.md and the Search Strategy both forbid doorway pages).

## 3. Clean up 404s and the sitemap

For each URL Search Console reports as not found or as a sitemap error:

1. Restore it if the page should exist and was lost by mistake.
2. Redirect it to the page that now owns the decision if it moved. A redirect in `vercel.json` is static configuration and adds no function, but it is a routing change: its own PR, checked with `vercel-cost-guard`.
3. Leave it gone if the content was retired on purpose, and remove it from every sitemap.

Then confirm every sitemap URL returns 200 and matches its canonical (`scripts/audit-sitemap-canonicals.mjs`). If a sitemap is added to `robots.txt`, add it to `SITEMAPS` in the same commit (AGENTS.md 6d).

## Figures stay private

The repository is public. Clicks, impressions, CTR, position, earnings, RPM and GA4 views or sessions never go into commits, PRs, PR or issue comments, docs, skill files or `docs/GROWTH_SESSION_LOG.md`, rounded, as ranges or as percent changes. Cite the page path and its direction or pattern instead: rising, falling, flat, top earner, CTR gap, NOT MEASURED. Figures may be shown to the owner only in the private working session.

## Output

A ranked table: query or URL, page, window dates, pattern, direction, proposed action and the skill that takes it. In the private session it may add the figures; anything committed or posted to GitHub carries page paths and direction only. Anything without evidence is NOT MEASURED. No ranking, traffic or revenue promise.

## Boundaries

Preserve canonical and Person identity, the named priority pages' titles and bylines (`benchmark:seo`), existing indexed answers and Auto ads. Ship-and-observe mode applies; no causal uplift claims. Do not auto-merge.

## Sources

Google Search Console Search Analytics and URL Inspection data, read-only. A third-party GSC MCP server (surendranb/google-search-console-mcp, MIT) was reviewed and not adopted: it exposes sitemap submit and delete tools, sends telemetry and loads playbooks from GitHub at run time.
