# Experience Foundry v0.1 — executable, review-only experience workbench

**Owner:** `izworskic/chrisizworski-com`  
**Status:** Development infrastructure. No public route, new canonical, ad modification, direct external fetch, content publication, or cross-repository mutation.  
**Standards:** The canonical [Experience OS v1.2.1](../design-systems/experience-os-v1/README.md), [Tool Network Registry](../docs/TOOL_NETWORK_REGISTRY.md), and applicable Python Intelligence OS.

## Purpose

Create *different* user experiences around real visitor decisions while reusing existing evidence, quality gates, and tool relationships. A wildlife journal should not look or behave like a freighter passage ledger. The Foundry shares validators and offline discovery but **does not share a compulsory page skin**.

This is an **executable starting platform**, not yet a general-purpose natural-language AI website builder. New interaction families need a purpose-written recipe, credible source adapters and actual browser review. Never claim keyword volume, legal access, live conditions, model skill, media rights, or production deployment merely because a preview compiles.

## Run (Node 22; no install or infrastructure required)

```bash
# Find possible overlapping existing owners; lexical match, NOT SEO demand.
node scripts/experience-foundry.mjs discover --query "Saginaw Bay bird migration"

# Create a safe, deliberately INCOMPLETE draft specification.
node scripts/experience-foundry.mjs init \
  --recipe field-notes --slug saginaw-seasonal-notes \
  --place "Saginaw Bay, Michigan" \
  --out experience-foundry/drafts/saginaw-seasonal-notes.json

# After completing sources, comparisons and approval fields, build local review preview:
node scripts/experience-foundry.mjs build \
  --spec experience-foundry/drafts/saginaw-seasonal-notes.json

# These two no-data examples demonstrate purposefully different UI recipes:
node scripts/experience-foundry.mjs build --spec experience-foundry/examples/saginaw-field-notes.json
node scripts/experience-foundry.mjs build --spec experience-foundry/examples/seaway-passage.json

# Structural tests; owning-repo verify:all is still required before merge.
node --test tests/experience-foundry.test.js
```

Builds write only to `build/experience-foundry/<slug>/` and refuse to overwrite a prior run. Each includes `index.html` and `review.json`; open the HTML locally for a preview. The output includes a noindex directive and a conspicuous development warning. For a second build, remove the intentionally disposable preview folder manually or choose a different preview slug; the CLI never deletes or overwrites an output. The author must never move these previews straight into `public/`.

## What the two recipes actually do

- **`field-notes`**: Source-linked, dated field journal with record-type filtering and a useful no-data message. A forecast is never called a sighting or known onset.
- **`passage-log`**: Selectable maritime event ledger, coordinated focus panel, dates, endpoints only if source-supplied, and a permanent readable record list without JavaScript. It does not simulate AIS, ETA, a lock schedule, or a route map.

Both deliberately contain no demo claims of present wildlife or vessel movement. The two example specs list existing tool *owners* as navigation sources, not as observation evidence, and contain zero records. Real records must be researched, sourced and checked.

## Specification contract

`schemaVersion: 1`; `recipe`; lowercase `slug`; `title`, `question`, `place`; `mode` = `enhance-existing` or `candidate-only`; `intentOwner` for enhancements; `closestTools` with **two real, different Tool Network Registry IDs**; `distinctiveness` with **at least two substantive dimensions** (`decision`, `hierarchy`, `interaction`, `interpretation`), with documented reasons; `sources[]` HTTPS links with descriptive labels; `records[]` with `id`, `title`, `summary`, `kind`, timezone-aware `issuedAt`, and a `sourceUrl` that appears in `sources[]`.

- `observation` additionally requires `maxAgeHours`; time-expired records are identified as stale, not current.
- `forecast` additionally requires a timezone-aware `validUntil`; expired forecasts receive an expired warning.
- `official-notice` additionally requires a named `scope`; an official reference does not prove current trail or lock access.
- `from` and `to` on maritime records are optional, authored textual endpoints. They are not geocoded or used to infer a line.
- Other supported kinds: `historical`, `official-reference`, `editorial`, `unverified`. Each is explicitly qualified.
- `constraints` must retain `noNewCanonical`, `noPublicRoute`, and `doNotInferLiveStatus` set to true.

The local validator checks structure, URLs and time requirements. It **does not fetch sources, independently prove claims, verify rights, benchmark actual usability, or decide whether a new tool deserves its own canonical URL**. The `status: review-ready` input only means the draft fields are filled, not that the visitor experience is approved for release.

## Intent ownership and originality

`discover` ranks token overlap against the central registry's known tools. It is deliberately a possible-conflict finder; it does not substitute for GSC demand, competitors, full portfolio inventory, owning-repo inspection, or the search strategy's canonical gate.

Every preview records its two closest comparators and at least two visitor-serving distinctions. **This is a declaration, not independent visual proof.** The final Experience OS hard veto still requires real side-by-side screenshots and a reviewer who can reject generic cloned experiences. One static data card layout with swapped headings is not an acceptable new recipe.

## Extending the Foundry

1. Research a new decision and identify its owning tool repository and original data contracts. Check the central registry and active experiments. Use two relevant external experiences as design research.
2. Compare two genuinely different interaction concepts and build one **new purpose-specific renderer** in `experience-foundry/recipes/`. Register it in `lib/foundry.mjs` only after user-decision and originality review.
3. Add a source adapter in the **authoritative owning repository**, only with compatible rights and timestamps. Prefer its existing Python/Node engine and output artifacts. Do not duplicate modeling logic, add Redis/Supabase, or scrape restricted feeds.
4. Add tests for missing/stale/conflicting records, injection, reversibility, and screen-reader/keyboard/no-JS use. Do a visual Playwright review at 360, 390, 768 and 1440px, and log failures. Do not describe structural tests as browser QA.
5. Where a real release is requested, implement in the owning repo under Experience OS, register discovery/SEO exactly once, pass full CI, inspect production, and measure comparable search/visitor outcomes. **Generated `index.html` is never automatically promoted.**

## Limitations and follow-on milestone

V0.1 has two authored renderers, a CLI, registry-based collision discovery, structural truth/originality checks and a review report. It does **not** dynamically invent a design from any arbitrary question, gather primary observations, run agentic research, render third-party maps, publish, or measure traffic.

The next milestone is the **first evidence-backed integration** into an existing authoritative tool: one Saginaw Bay field event feed with recorded timestamps, source rights, missing-data rules and a browser-tested action. Then implement a genuinely different maritime integration to demonstrate repeatability with real data, without requiring a generic shared surface.
