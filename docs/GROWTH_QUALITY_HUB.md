# Million Impressions — Growth & Quality Hub

**The single operating entry point for SEO, search growth, and tool-quality triage.**

Goal: **1,000,000 finalized Google Web Search impressions in 28 days at 5% CTR** (50,000 organic clicks at that impression and CTR level). These are targets, NOT observed results or forecasts. Protect user value, accuracy, profitability and the legitimate Chris Izworski Person entity.

## One process — not three competing programs

1. **Inspect a tool:** `scripts/tool-quality-factory.mjs` evaluates the meaningful HTML delivered without JavaScript, metadata, canonical/robots, links, structured data and creator identity. This is the technical layer.
2. **Assess the portfolio:** The **existing** `lib/gsc/collector.mjs` and `lib/gsc/classify.mjs` define authoritative Google Search Console 28-day totals, page-level cohorts and position-sensitive CTR headroom. This is the measurement layer.
3. **Prioritize improvements:** `scripts/growth-quality-hub.mjs` integrates both into a single JSON + Markdown scorecard. Technical blockers rank P0; the native GSC classifier CTR opportunities follow after source and search-intent review.
4. **Improve only in the owning repository:** Read `docs/TOOL_NETWORK_REGISTRY.md`, `docs/SEARCH_STRATEGY.md` and `docs/EXPERIENCE_LAYER_STANDARD.md`. Preserve distinct canonical intent, source confidence, existing successful snippets and Person ID.
5. **Verify and release:** Every product's existing browser/mobile/data-specific tests and the owning repository's required `npm run verify:all` remain mandatory before merge. This quick reporting workflow does NOT call a Vercel build.
6. **Measure effects:** Observe comparable finalized 7-, 14- and 28-day GSC windows. Avoid causal uplift claims from before/after alone. Record findings and the next single action in `docs/GROWTH_SESSION_LOG.md`.

## How to run one scorecard

At the website repository root, using only Node 22:

```bash
node scripts/growth-quality-hub.mjs \
  --manifest=config/tool-quality-pilots.json \
  --out=growth-quality-report.json \
  --markdown=growth-quality-report.md
```

To inspect any public HTTPS URL without deploying or rebuilding:

```bash
node scripts/growth-quality-hub.mjs --url=https://chrisizworski.com/northern-lights-michigan/
```

To include actual GSC performance, pass an existing complete, finalized native collector report:

```bash
node scripts/growth-quality-hub.mjs \
  --manifest=config/tool-quality-pilots.json \
  --gsc=path/to/finalized-gsc-report.json
```

The input is the full JSON produced by `collectGscAnalytics({persist:false})` or by the site's current GSC collection mechanism, with fields `siteUrl`, `windows.current`, `totals.current`, `pages.top` and `pages.ctrOpportunities`. Site totals MUST come from the Search Console property-level total query; never add partial page rows and claim they equal whole-site traffic. CTR in the raw totals must be a fraction (0.05 = 5%). GSC opportunity rows already have percent-unit CTR values. Reject mismatched properties, non-28-day windows and contradictory totals. Stale snapshots are clearly labeled.

**Missing GSC inputs are shown as NOT AVAILABLE.** The workflow does not request Google credentials or secretly assume the GSC collection endpoint is healthy. Its source data must be supplied via an approved, functioning integration. There is no automatic ingestion of production GSC data in this v1.

**A good technical score is not a Google ranking prediction.** It also does not prove the JavaScript maps, location search, source updates, responsive UI, live answers or actual search intent work.

## Single GitHub workflow

`.github/workflows/tool-quality-factory.yml` retains its existing stable workflow filename, but is now titled **Million Impressions — Growth & Quality Hub**. It checks out the caller repository, the central implementation, runs focused Node tests and produces the combined `growth-quality-report.json` and `growth-quality-report.md` artifacts. No npm install, web scraping, Vercel build or paid data APIs. Manual run also supports a single `url` and optional `gsc_snapshot` file path. No current Google credentials needed.

A separate tool repository can call it:

```yaml
name: Growth and tool quality
on:
  workflow_dispatch:
  pull_request:
    paths: ['public/**', 'config/tool-quality-pilots.json']
permissions:
  contents: read
jobs:
  audit:
    uses: izworskic/chrisizworski-com/.github/workflows/tool-quality-factory.yml@main
    with:
      manifest: config/tool-quality-pilots.json
      fail_on: error
```

Create the manifest in that repository; use full public URL entries for SSR sites lacking generated HTML. Pin the reusable workflow to a tested immutable SHA or tag when it is proven and released. Be aware GitHub Actions minutes may still be billable; this workflow does not invoke the Vercel build pipeline.

## Data and outcome boundaries

- **Technical first-response HTML:** automate deterministic checks and report failures. No automated title rewrite, invented source data or thin location-page generation.
- **Search outcomes:** imported finalized Google Search Console Web numbers, not inferred traffic. Compare true property totals, not incomplete page subsets. Segment non-branded CTR separately when query-level evidence supports it.
- **Prioritization:** reuse native `pages.ctrOpportunities` and its modeled potential-click heuristic. This is NOT guaranteed extra traffic. Review content intent, existing experiment protections and seasonality before changing anything.
- **Author/entity:** keep `https://chrisizworski.com/#person`, true attribution, owning canonicals, and no doorway pages or manufactured branded results.
- **Release:** site `npm run verify:all` and the owning tool's tests still govern production; do not disable or weaken them. Never merge a failing required gate.
- **Revenue:** respect AdSense policy and existing revenue instrumentation; neither impressions nor hypothetical clicks determine real revenue.
- **Cost:** routine audit checks are tiny and do not run the heavyweight full site build. Do not add separate redundant CI build triggers.
- **What is not built yet:** complete headless-browser/carto/map/phone interaction audits, automatic GSC ingestion in this workflow, and an interactive live dashboard. They are follow-up integrations, not current capabilities.

**Files:** `MILLION_IMPRESSIONS_PLAYBOOK.md` is the goal and governance source; `docs/SEARCH_STRATEGY.md` directs prioritization; `docs/TOOL_NETWORK_REGISTRY.md` defines canonical intent and links; the current GSC collector/classifier owns measured outcomes; `docs/GROWTH_SESSION_LOG.md` is the working handoff. This document specifies how those pieces run together—not a replacement for them.
