# Tool Quality Factory — reusable HTML and search-readiness gate

> The technical audit is now one layer of the [Million Impressions — Growth & Quality Hub](GROWTH_QUALITY_HUB.md). Use `scripts/growth-quality-hub.mjs` for the unified technical/GSC/priority report; `scripts/tool-quality-factory.mjs` remains its reusable implementation detail. The GitHub Actions workflow has the unified title but keeps its original filename for compatibility.

**Repository:** izworskic/chrisizworski-com
**Purpose:** Machine-checkable standards for multiple apps without replacing their specialized tests or triggering Vercel builds.

This extends AGENTS.md, MILLION_IMPRESSIONS_PLAYBOOK.md, docs/TOOL_NETWORK_REGISTRY.md, docs/EXPERIENCE_LAYER_STANDARD.md and existing creator, canonical, CTR, data-source and release rules. It does not rewrite any live product.

## Checks in v1

The audit examines the HTML in the initial server response, without executing JavaScript. It checks HTTP status, noindex, title, description, canonical, H1, language, viewport, human-readable initial content, crawlable links, JSON-LD syntax/presence, image alt, and optional Chris Izworski attribution.

Errors block a strict run (missing title, description, H1 or canonical; incorrect canonical; invalid JSON-LD; noindex; bad HTTP status; almost empty initial HTML; missing required creator Person ID). Warnings invite a human review (short/long title and description, thin initial content, missing discoverable links or schema, missing alt, mobile viewport, language, or visible attribution).

The displayed score is a reproducible checklist: 100 minus 18 for each error and 5 for each warning (minimum zero). It is NOT a Google ranking prediction, a Lighthouse score, a Googlebot simulator, a rich-results guarantee, or a substitute for user testing. Word-count thresholds are heuristics, not Google standards. Do not create generic text just to satisfy a threshold.

## Use against any tool

Run at the owning repository root:

    node scripts/tool-quality-factory.mjs --manifest=config/tool-quality-pilots.json --out=tool-quality-report.json
    node --test tests/tool-quality-factory.test.js

Or inspect the initial HTTP response of any HTTPS tool:

    node scripts/tool-quality-factory.mjs --url=https://chrisizworski.com/northern-lights-michigan/ --out=tool-quality-report.json

Default blocking: --fail-on=error. More restrictive: --fail-on=warning. Report-only: --fail-on=never. Missing or unreachable inputs are INCOMPLETE, never a pass.

An example manifest entry is:

    {"name":"Michigan Aurora","file":"public/northern-lights-michigan/index.html","canonical":"https://chrisizworski.com/northern-lights-michigan/","identity":"chris-izworski"}

The initial pilot manifest includes Aurora, Niagara Border Crossing and Holiday Travel. For a repository built with client-side routing or SSR, audit its actual rendered server response (URL mode) or a generated static HTML artifact, not a JavaScript source file.

## Onboarding new tools

1. Resolve the canonical URL and the authoritative owning GitHub repository first. Deployment mirrors are not product owners.
2. Add a manifest entry using either file or url plus the expected canonical. Use identity: chris-izworski when relevant.
3. Run the audit. Fix failures and independently review warnings. Do not overwrite a protected title, invent data freshness, or inject unsupported schema.
4. Run product-specific browser and data checks: user input actually changes results, map icons and zoom work, 390px mobile overflow, live data fallbacks, source freshness, year rollover, keyboard/touch interactions, real image permissions and honest uncertainty.
5. Preserve existing AGENTS.md release gates. Confirm production and measure 28-day Search Console Web impressions, CTR, clicks, rankings and query cohorts after release.

## GitHub Actions: one shared workflow

This repository includes .github/workflows/tool-quality-factory.yml. It supports:
- Manual workflow dispatch: enter one HTTPS URL, or audit the manifest.
- Factory-only pull-request checks on changes to the shared engine and its documents.
- Cross-repository workflow_call: each tool's owning repository checks out its own files and calls the central shared quality workflow.

An owning tool repository may add this workflow:

~~~yaml
name: Tool quality baseline
on:
  pull_request:
    paths: ['public/**', 'config/tool-quality-pilots.json']
  workflow_dispatch:
permissions:
  contents: read
jobs:
  tool-quality:
    uses: izworskic/chrisizworski-com/.github/workflows/tool-quality-factory.yml@main
    with:
      manifest: config/tool-quality-pilots.json
      fail_on: error
~~~

Create a matching manifest within that caller repository. Once stable, pin the reusable workflow to a tagged release or immutable SHA. GitHub Actions runs this small Node audit without npm install, Vercel builds, paid APIs or secrets. The output JSON is uploaded as an artifact.

## Boundaries and future expansion

The first version does NOT run JavaScript, prove Google indexed a page, test CSS overflow, confirm links resolve, simulate location buttons/maps, or detect inaccurate data. Next: an optional targeted rendered-browser comparison (server HTML versus hydrated DOM), mobile and runtime smoke tests, and GSC experiment tracking. Keep those as explicitly controlled jobs rather than making every PR expensive.

Only create new landing pages when search intent and distinct decision utility justify them. The site's objective remains 1,000,000 rolling 28-day Web impressions and 5% CTR, but no checklist can guarantee either outcome.
