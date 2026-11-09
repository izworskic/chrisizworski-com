# Experience Foundry 0.3 — diagnose, build and demonstrate tool improvements

**Owner:** `izworskic/chrisizworski-com`  
**Status:** Development infrastructure. No public route, new canonical, ad modification, direct external fetch, content publication, or cross-repository mutation.  
**Standards:** The canonical [Experience OS v1.2.1](../design-systems/experience-os-v1/README.md), [Tool Network Registry](../docs/TOOL_NETWORK_REGISTRY.md), and applicable Python Intelligence OS.

## Purpose

Create *different* user experiences around real visitor decisions while reusing existing evidence, quality gates, and tool relationships. A wildlife journal should not look or behave like a freighter passage ledger. The Foundry shares validators and offline discovery but **does not share a compulsory page skin**.

This is an **executable starting platform**, not yet a general-purpose natural-language AI website builder. New interaction families need a purpose-written recipe, credible source adapters and actual browser review. Never claim keyword volume, legal access, live conditions, model skill, media rights, or production deployment merely because a preview compiles.

## Automatically audit Circle Tour compatibility when a tool is built

The independent Lake Superior Circle Tour integration is an optional downstream **catalog consumer**, not a new owner of any specialist tool, data engine, API or canonical URL.

At the end of **every new tool release**, inspect whether the visitor intent and verified geographic coverage justify a Circle Tour stop handoff:

~~~bash
node scripts/experience-foundry.mjs connections --owner YOUR_REGISTRY_ID
node scripts/build-circle-tour-network.mjs --audit
~~~

The audit discovers *candidates*, but a candidate **never** appears on the site. Do not build or rewrite an existing specialist tool merely to make it connect. Only a verified, published tool qualifies for the optional metadata below in its existing benchmarks/tool-network-registry.json node:

~~~json
"circleTour": {
  "approval": "approved",
  "productionVerifiedAt": "2026-11-08",
  "stopIds": ["8"],
  "theme": "parks",
  "decision": "Choose a suitable Keweenaw stop for my trip.",
  "caveat": "Verify current trail access and parking with the source."
}
~~~

The date is the actual independent verification of the destination's live canonical URL, **not** a guessed publication date. A build-time compiler verifies approved metadata, known stop IDs, unique registry ownership, safe first-party URLs and a distinct visitor decision. On the next site build, the new specialist is included in public/assets/circle-tour-tool-catalog.json automatically. Run npm run circle-tour:network and npm run benchmark:circle-tour locally; the full npm run verify:all gate remains mandatory. For a candidate awaiting independent verification, use approval: candidate or leave metadata absent. The original tool stays untouched.

The Circle Tour runtime reads only the generated allowlisted catalog and existing CircleTourPage events. It carries optional trip date, interest and stop via namespaced URL parameters, opens old tools in a **new tab** and offers a return-link copy; it **does not** claim the specialist understands the URL context, can accept it back or that any road/park is currently open. No automatic new pages, search canonicals, personal storage, live closures or cross-repo mutation.

Owner instructions, QA, scope and source limits: [Circle Tour integration contract](../docs/CIRCLE_TOUR_INTEGRATION_ARCHITECTURE_2026_11_08.md).

## Improve an existing tool (the default workflow)

Foundry is an agent-operated improvement system. The agent investigates the visitor problem, compares credible alternatives and implements the chosen experience. The CLI captures the actual baseline, checks the assignment for missing decisions, executes the same behavioral adapter before and after, and reports gains, regressions and stale proof. It does not pretend to autonomously research or judge creativity.

```bash
node scripts/experience-foundry.mjs improve --slug rocket-improvement \
  --owner rocket-launch-usa \
  --question "Can a visitor continue planning the launch they selected?" \
  --files public/assets/rocket-flight-desk.js
# Follow IMPLEMENT.md through diagnosis, design AND implementation.
node scripts/experience-foundry.mjs assess \
  --run experience-foundry/drafts/rocket-improvement/run.json
# After completing the assignment and implementing a reviewed replay adapter:
node scripts/experience-foundry.mjs prove \
  --run experience-foundry/drafts/rocket-improvement/run.json \
  --out build/experience-foundry/rocket-improvement-proof-1
node scripts/experience-foundry.mjs assess \
  --run experience-foundry/drafts/rocket-improvement/run.json \
  --proof build/experience-foundry/rocket-improvement-proof-1/proof.json
```

An incomplete assessment or undemonstrated change exits nonzero with the next unresolved action. The system requires an evidence-backed diagnosis, three investigated opportunities, two viable concepts for the selected opportunity, explicit visitor outcomes and a distinguishable completion signal. It does not assign invented benefit scores. A plan, filled form, extra source link or green existing tests alone cannot establish a new visitor capability.

`prove` runs a **reviewed local Node adapter with local process privileges**, once against the committed baseline and once against the current captured scope. It never reads shell commands from the manifest. Outputs retain exact source snapshots, the adapter, actual observations and SHA-256 hashes. Every candidate scenario must pass, a declared improvement must change from unmet to met, and preservation cases must pass in both versions. Source, adapter or assignment drift invalidates an earlier proof. A failed harness is an error, not a convenient failing baseline.

[Improvement cycle contract and schema](docs/IMPROVEMENT_CYCLE.md) explains new files, dependencies, honest proof scope and release boundaries. The [Rocket diagnostic example](examples/rocket-improvement.mjs) reproduces the selected-mission handoff defect at PR #1565 without modifying Rocket. It deliberately cannot claim completion while that outcome remains unmet. [The 0.3 review](docs/REVIEW_2026_11_08.md) records what this system does and does not establish.

## Plan a new research packet

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

The dedicated `rocket-foundry-pilot.yml` workflow runs both commands, checks the five-file research packet and safe custom recipe, executes the owning launch decision tests, benchmarks the tool network and uploads the isolated packet as an artifact. The custom product pilot extends the existing mission-selected Flight Desk with one source-qualified next verification. **The CLI did not generate or publish the production rocket UI**; authored code, owning-repository CI and production proof govern that release. There is no third generic preview renderer, no new public URL or live-status claim. The Seaway Follow the Freighter pilot is tracked separately in PR #1564.

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

## Second-pass Foundry acceptance: connected decisions without generic interfaces

The [Rocket Launch Live second pass](pilots/rocket-launch-live-second-pass.md) exposed four reusable defects in conventional planning: a superficially different but implausible competing design, a query string counted as connected state, an access-verification loop that never advanced with new evidence, and clicks counted as a successful visitor journey.

All new plan packets now require:
1. **Two plausible, safe designs:** compare first screen, meaningful choice, changed answer, map/media/evidence coupling, phone experience and costs. Neither can be a knowingly unsafe straw-man countdown. The best choice may preserve a distinctive existing product identity.
2. **Loaded-state continuity:** enumerate linked and return journeys. One selected identifier must agree with actual destination data. Track missing IDs and A→B→A; a query string or click alone does not establish restoration.
3. **Evidence progression:** explicitly model what changes when an unknown becomes supported, stale, conflicted or closed. Distinguish an original published rule from event-specific status. End perpetual "verify access" loops when a more useful supported question can be posed, without inventing evidence.
4. **Privacy-safe measured actions:** separate the new primary action from older links, handoff attempt from destination-confirmed restoration, and both from an actual completed visitor decision. Use bounded categories rather than IDs, URLs or coordinates. Record no baseline as NOT AVAILABLE, not zero conversion.
5. **Honest releases:** implementation, owner CI, inspected browser runs/screen widths, exact commit, preview, deployed SHA, independent public smoke and outcomes are separate approvals. A passing structural checker cannot claim CTR, revenue, safety, map availability or completion.

These are **shared quality questions**, not a mandatory Pad/Shore/Sky interface. Mission-specific priorities, source rules and visuals remain in Rocket Launch Live; future tools should invent their own decision and composition.

## Completion boundaries

Version 0.2 established the bounded preview workbench: discovery, custom planning packets, schema-v2 initialization, validation, deterministic preview builds, source-context displays and automated browser acceptance. It does **not** dynamically invent a design from any arbitrary question, gather primary observations, run agentic research, render third-party maps, publish, or measure traffic.

The First Freeze pilot has merged in its owning repo (see the dated pilot record). Rocket Launch Live is now the second owner-selected Foundry pilot, using custom product code and actual Foundry planning rather than pretending the existing preview recipes created a national launch viewer. The Seaway Follow the Freighter pilot subsequently merged in PR #1564; inspect its actual implementation before proposing additional maritime work. Do not create a parallel AIS engine or a new URL to demonstrate Foundry. The [audit and completion record](docs/REVIEW_2026_11_07.md) separates implementation, test and release evidence.

## Optional Place & Story improvement opportunity

For physical destinations where the visitor needs more than a location name, the [Place & Story improvement pathway](docs/PLACE_AND_STORY.md) governs researched, exact-place images and concise interpretation. It is an **optional** opportunity within `improve`, not a fixed recipe or new global page renderer. Use the [Experience OS standards](../design-systems/experience-os-v1/docs/PLACE_AND_STORY.md); test matching selection, source rights, photo-outage fallback and actual browser views. The Circle Tour [pilot](../docs/experience-briefs/circle-tour-place-story-2026-11-09.md) is the first bounded adoption.
