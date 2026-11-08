# Experience Foundry 0.2 — from visitor question to tested implementation handoff

**Owner:** `izworskic/chrisizworski-com`  
**Status:** Development infrastructure. No public route, new canonical, ad modification, direct external fetch, content publication, or cross-repository mutation.  
**Standards:** The canonical [Experience OS v1.2.1](../design-systems/experience-os-v1/README.md), [Tool Network Registry](../docs/TOOL_NETWORK_REGISTRY.md), and applicable Python Intelligence OS.

## Purpose

Create *different* user experiences around real visitor decisions while reusing existing evidence, quality gates, and tool relationships. A wildlife journal should not look or behave like a freighter passage ledger. The Foundry shares validators and offline discovery but **does not share a compulsory page skin**.

This is an **executable starting platform**, not yet a general-purpose natural-language AI website builder. New interaction families need a purpose-written recipe, credible source adapters and actual browser review. Never claim keyword volume, legal access, live conditions, model skill, media rights, or production deployment merely because a preview compiles.

## Start with the visitor decision

```bash
node scripts/experience-foundry.mjs plan --slug seaway-next-passage \
  --question "Which documented Seaway passage should I follow from shore, and what remains unknown?" \
  --owner st-lawrence-seaway
```

This produces `plan.json`, `discovery.json`, `brief.md`, `state-matrix.md` and `IMPLEMENT.md` in an isolated draft folder. The packet includes the selected canonical owner and its existing network relationships, but leaves the implementation repository unverified until inspected. Omit `--owner` if ownership is unresolved. Omit `--recipe` for a custom experience: the two renderers are demonstrations, not the boundaries of what agents can build. The agent reads `IMPLEMENT.md`, completes research and compares two concepts, then implements in the authoritative repo under its release rules. This CLI does not run an AI agent itself.

## Run (Node 22; core CLI needs no install or infrastructure)

```bash
# Find possible overlapping existing owners; lexical match, NOT SEO demand.
node scripts/experience-foundry.mjs discover --query "Saginaw Bay bird migration"

# Create a safe, deliberately INCOMPLETE draft specification.
node scripts/experience-foundry.mjs init \
  --recipe field-notes --slug saginaw-seasonal-notes \
  --place "Saginaw Bay, Michigan" \
  --out experience-foundry/drafts/saginaw-seasonal-notes.json

# List available preview interactions and diagnose a completed specification:
node scripts/experience-foundry.mjs recipes
node scripts/experience-foundry.mjs validate --spec experience-foundry/examples/saginaw-field-notes.json

# After completing sources and comparisons, build a local review preview:
node scripts/experience-foundry.mjs build \
  --spec experience-foundry/drafts/saginaw-seasonal-notes.json

# These two no-data examples demonstrate purposefully different UI recipes:
node scripts/experience-foundry.mjs build --spec experience-foundry/examples/saginaw-field-notes.json
node scripts/experience-foundry.mjs build --spec experience-foundry/examples/seaway-passage.json

# Structural tests; owning-repo verify:all is still required before merge.
node --test tests/experience-foundry.test.js
```

Builds write only to `build/experience-foundry/<slug>/` and refuse to overwrite a prior run. Each includes `index.html`, the exact `spec.json`, and `review.json`; open the HTML locally for a preview. The output includes a noindex directive and a conspicuous development warning. For a second build, remove the intentionally disposable preview folder manually or choose a different preview slug; the CLI never deletes or overwrites an output. The author must never move these previews straight into `public/`.

## What the two recipes actually do

- **`field-notes`**: Source-linked, dated field journal with record-type filtering and a useful no-data message. A forecast is never called a sighting or known onset.
- **`passage-log`**: Selectable maritime event ledger, coordinated focus panel, dates, endpoints only if source-supplied, and a permanent readable record list without JavaScript. It does not simulate AIS, ETA, a lock schedule, or a route map.

Both deliberately contain no demo claims of present wildlife or vessel movement. The two example specs list existing tool *owners* as navigation sources, not as observation evidence, and contain zero records. Real records must be researched, sourced and checked.

## Specification contract

`schemaVersion: 2` for new work (`1` remains readable and is explicitly labeled legacy in the report); `recipe`; lowercase `slug`; `title`, `question`, `place`; `mode` = `enhance-existing` or `candidate-only`; `intentOwner` for enhancements; `closestTools` with **two real, different Tool Network Registry IDs**; `distinctiveness` with **at least two substantive dimensions** (`decision`, `hierarchy`, `interaction`, `interpretation`), with documented reasons; `sources[]` HTTPS links with descriptive labels; `records[]` with `id`, `title`, `summary`, `kind`, timezone-aware `issuedAt`, and a `sourceUrl` that appears in `sources[]`.

- Version 2 sources additionally require `publisher`, `checkedAt`, `scope`, `rights` (the specific reuse basis) and `limitation`. These are author-supplied declarations, not independently verified rights. Empty records are valid and never establish a working real-data integration.
- `observation` additionally requires `maxAgeHours` and, in v2, `observedAt` separately from publication time; time-expired records are identified as stale, not current.
- `forecast` additionally requires a timezone-aware `validUntil`; expired forecasts receive an expired warning.
- `official-notice` additionally requires a named `scope` and, in v2, `validUntil`; do not invent an expiry for an indefinite notice, use a source-qualified `official-reference` instead; an official reference does not prove current trail or lock access.
- `from` and `to` on maritime records are optional, authored textual endpoints. They are not geocoded or used to infer a line.
- `conflictsWith: [recordId]` explicitly flags unresolved conflicts. Both linked records get a warning; the renderer never picks a winner. This is authored conflict information, not automatic conflict detection.
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

## First cross-repository pilot

[The First Freeze source/experience record](pilots/first-freeze.md) links the authoritative `izworskic/phenology-michigan` implementation and real browser acceptance. It validates the shared source/time/access/interaction process with a **different, purpose-built JSX interface**, not by pretending the v0.1 `field-notes` CLI recipe generated a Next.js product. Continue to respect the owning repo's CI and live-release evidence.

## Second pilot: Rocket Launch Live (November 8, 2026)

The owner selected [Rocket Launch Live](pilots/rocket-launch-live.md) to run through the actual Foundry development pipeline. The national rocket page and six regional viewing owners previously existed but were missing from the central Tool Network Registry. The reviewed network correction permits the genuine `discover` and `plan --owner rocket-launch-usa` commands to resolve one canonical intent owner with six specialist lawful-access handoffs.

The dedicated `rocket-foundry-pilot.yml` workflow runs both commands, checks the five-file research packet and safe custom recipe, executes the owning launch decision tests, benchmarks the tool network and uploads the isolated packet as an artifact. The custom product pilot extends the existing mission-selected Flight Desk with one source-qualified next verification. **The CLI did not generate or publish the production rocket UI**; authored code, owning-repository CI and production proof govern that release. There is no third generic preview renderer, no new public URL or live-status claim. The maritime passage pilot remains a separate future investment.

## Reproducible acceptance and safe output

Use `--as-of 2026-11-07T12:00:00Z` on `validate` or `build` to replay time-sensitive states. One clock governs validation, every rendered qualification and the report. `review.json` records the evaluation time plus SHA-256 fingerprints of the supplied spec and registry; it does not prove source authenticity. Previews visibly say they are static snapshots. Rebuild to reassess freshness. Both recipes expose issue/observation/expiry times and v2 source limitations.

Unknown flags, malformed collections, invalid calendar dates, future issue/check dates, duplicate record IDs, invalid conflict references and truthy non-boolean safety flags fail with diagnostics. Output is restricted to draft/build directories, rejects symlink traversal, and never replaces prior runs. These checks assume a trusted local workspace, not a hostile process racing filesystem mutations.

```bash
node --test tests/experience-foundry*.test.js
# Isolated Playwright 1.58.2 + Chromium needed for browser acceptance:
NODE_PATH=/path/to/isolated/node_modules CHROME_PATH=/path/to/chrome node scripts/verify-foundry-browser.cjs
npm run verify:all
```

The dedicated `Experience Foundry acceptance` PR workflow runs populated, empty, stale, expired, conflict and hostile-text scenarios for both recipes at 360/390/768/1440px; verifies selection/reversal, keyboard, no-JS, reduced-motion mode, overflow and script errors; and retains screenshots plus `results.json`. **Fixtures are explicitly synthetic.** They test mechanics, not current ships, wildlife or provider availability. Inspect screenshots and independently review real-data claims before releasing any product. Core unit tests are included in the existing full repo gate via `tests/*.test.js`.

## Completion boundary and next product

Version 0.2 completes the bounded development workbench: discovery, custom planning packets, schema-v2 initialization, validation, deterministic preview builds, source-context displays and automated browser acceptance. It does **not** dynamically invent a design from any arbitrary question, gather primary observations, run agentic research, render third-party maps, publish, or measure traffic.

The First Freeze pilot has merged in its owning repo (see the dated pilot record). Rocket Launch Live is now the second owner-selected Foundry pilot, using custom product code and actual Foundry planning rather than pretending the existing preview recipes created a national launch viewer. A **real-data maritime passage experience** remains a distinct prospective pilot in its owning repository, after auditing the live Seaway build. Do not create a parallel AIS engine or a new URL to demonstrate Foundry. The [audit and completion record](docs/REVIEW_2026_11_07.md) separates implementation, test and release evidence.
