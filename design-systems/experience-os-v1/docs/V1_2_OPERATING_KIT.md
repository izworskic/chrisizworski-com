# Experience OS V1.2 operational kit

**Package:** `EXPERIENCE_OS_V1` · **compatible version:** 1.2.1 · **reviewed:** October 31, 2026 · **scope:** source-only governance and test utilities; no new visitor page, public API, or shared UI skin.

This kit turns the v1.2 research and connected-state standards into **repeatable starting artifacts and executable structural checks**, while leaving product-specific QA in the authoritative owning repository. It does not automatically create or update cross-repository instructions.

## Default workflow for future substantial work

1. **Identify the owner and the decision.** Read the owning repo's `AGENTS.md`; locate canonical URL, original engine, data rights, map access and current release gates. For new or major visitor work, read this package's inspiration, experience lifecycle, interaction patterns, anti-patterns and two fresh credible outside examples.
2. **Write an experience brief and state matrix.** Use `templates/EXPERIENCE_BRIEF.md`, `templates/STATE_MATRIX.md`, and research records. Name a stable selected ID, evidence kinds, actual changed visitor answer, first-screen action and failure mode; reject decorative controls.
3. **Create a dated release-evidence record**, beside the tool's brief, from a deliberately incomplete draft. The script refuses to overwrite an existing file:

   ```bash
   node scripts/new-experience-os-v1.2.mjs \
     --slug gooseberry-falls \
     --ownerRepo izworskic/chrisizworski-com \
     --canonical https://chrisizworski.com/gooseberry-falls/ \
     --pageFile public/gooseberry-falls/index.html \
     --out docs/experience-briefs/gooseberry-falls.release.json
   ```

   A real worked example is `examples/gooseberry-release-record.json`. It is **a dated release snapshot**, not today's park weather/trail state. The sample includes cited research, loaded-media constraints, meaningful decision scenarios, and actual PR/CI/public-smoke evidence.

4. **Implement** the source-backed decision, optional images and optional map. Keep HTML-first answer and DNR/source handoff. A data gap cannot be repaired with an inferred route, invented real-time gauge, unsupported parking point or simulated live trail status.
5. **Run structural checks** on a filled record in its owning repository:

   ```bash
   node scripts/verify-experience-os-v1.2.mjs docs/experience-briefs/gooseberry-falls.release.json
   ```

   For an `izworskic/chrisizworski-com` tool, add `--check-site` to inspect local source HTML, Tools card, ItemList, sitemap, registry and directed relation. That option is intentionally **central-site-specific**; it does not crawl a different tool owner or infer its publication state.

6. **Run original product tests + full CI**, capture real screenshots at 360/390/768/1440, verify loaded photo bytes, real map tiles/pins, A→B→A, no-JS, error and stale cases. Do NOT treat the evidence-record checker as a substitute.
7. **Release with distinct proof levels:** implemented → verified (exact head and CI run) → deployed (READY for merged SHA) → live verified (independent public canonical content/interaction smoke) → outcome measured (comparable post-release evidence). Keep measurement `NOT_MEASURED` until it actually exists.
8. **Log the lesson** with the precise cause, fix, final passing run and a transferable pattern. For Gooseberry, see `GOOSEBERRY_PILOT_20261031.md`.

## Machine-checkable evidence shape

`schemaVersion: "1.2"` and `recordStatus: "draft" | "released"`.

| Field | Required detail | Why |
| --- | --- | --- |
| `project` | Owner repo, canonical, source-page path, actual visitor decision and action | Prevents drift between shiny UX work and owning search intent |
| `claims[]` | Unique IDs, evidence kind, subject, HTTPS official source, checked date, limitation | Distinguishes sourced route rules from forecast/unknown/observed data |
| `decisionState` | Selected ID, source of truth, linked surfaces, unavailable behavior | Selection means one coherent outcome, not just a CSS highlight |
| `scenarios[]` | At least initial, alternative, reverse, no-JS, no-tiles and stale-data | Requires changed answer and source/safety interpretation for each |
| `failures` | Useful no-JS, no-tile, no-image, stale-data alternatives | Avoids an empty map or spinner becoming the page |
| `qa` | 360/390/768/1440 coverage, status and links to actual browser run/screenshots if passed | Makes `PASSED` a claim requiring proof |
| `photos[]` | Depicted subject, author, rights, source, credit and contextual disclosure | A woodland photo must not pose as a photo of an unphotographed waterfall |
| `release` | Per-stage status, checked date and evidence URL; deployed exact SHA, live canonical | READY does not imply live public verification; no unmeasured ranking claims |

### Evidence kinds and hard boundaries

- `official-reference`: stable route/parking guidance, **not** confirmation that an outdoor place is open now.
- `official-notice`: scoped, dated access determination. It requires a named access scope; a region-wide bulletin does not certify every trail.
- `observation`: actual numeric measurement with unit, station ID and timestamp. A USGS *site page* without a continuous series is **not** a live measurement.
- `forecast`: time-limited region or weather signal requiring a `maxAgeMinutes` policy. It cannot become a trail-opening notice or observed river-flow.
- `editorial`, `unverified` and `no-data`: must retain their honest labels. If no safe evidence exists, show a useful path to the source, not a green open badge.

The checker intentionally validates **structure and semantic boundaries, not source truth**. It does not fetch external URLs, prove photography rights, validate raw GPS geometry, measure page performance, execute JavaScript or inspect real-world conditions. Those require separate primary-source review, actual browser QA and public smoke tests.

### Failure tests that matter

- Simulate selection A→B→A, then a delayed image response from A; B's title/credit may never be replaced by the stale A.
- Block the tile domain as well as test a real provider. HTTP status alone does not prove rendered map tiles; after deployment independently verify that tiles appear and the map has attribution.
- Test missing NWS data without hiding the DNR map or falsely inferring park closures.
- Compare *current* accessible route and timing with conservative typical time bands. A 45–90-minute loop is not a safe default for someone who has exactly 60 minutes.
- Validate SEO metadata lengths, canonical Person identity, Tools card, ItemList count/order, sitemap and registry in the **same owning-repo release**. A working page with no catalog entry is not a complete discovery rollout.
- Check keyboard focus and announcement of meaningful status changes. W3C WCAG 2.2 includes focus-not-obscured AA and status-message AA requirements; `aria-live` alone is not evidence of correct focus and semantics. Sources reviewed 2026-10-31: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ and https://www.w3.org/WAI/WCAG22/Understanding/status-messages .
- Screenshot stability can be controlled by Playwright's disabled-animation option, but inspect the actual resulting screenshot, including loaded media. https://playwright.dev/docs/test-snapshots (reviewed 2026-10-31).

## How this integrates with other repositories

The central root `AGENTS.md` already routes substantial visitor-facing work to Experience OS. A separate authoritative tool repo **does not inherit that pointer**. Add the compact adoption pointer from `docs/MULTI_REPO_ADOPTION.md` when authorized, without deleting local instructions. Copy the small validator/scaffold or consume a reviewed revision via an explicit dependency in that repo; the central validator cannot read an inaccessible owner repository. Log adoption evidence in its own PR.

## What is deliberately not included

No forced React, Rust, MapLibre, 3D, animations, templates for every tool's page layout, new telemetry, Redis, blanket repo rewriting, automated fake source verification or automatic cross-repo deployment. Use the simplest implementation that improves the visitor's decision. A source-only package cannot claim visitor conversion lift or universal agent activation.
