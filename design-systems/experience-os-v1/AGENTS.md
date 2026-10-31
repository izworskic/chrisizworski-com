# EXPERIENCE_OS_V1 — execution instructions for coding agents

This package is **research and quality governance, not a public-page template**.

## Trigger automatically

When a task in an adopting repository creates a visitor-facing tool, materially changes user interaction, or redesigns an existing tool, **consult EXPERIENCE_OS_V1 without requiring the owner to name it**. For a tiny defect fix, use only directly relevant guardrails. Apply the owning repository's `AGENTS.md`, release gates, and canonical ownership first.

## Mandatory work order

1. **Locate:** current production URL, owning repo, generated versus source files, visitor journeys, current baseline, sources, and SEO/ads contracts. Read existing `FIELD_GUIDE_V1` / `JOURNEY_ATLAS_V1` where relevant.
**Editorial companion for parks and landscape tools:** before writing or revising visitor-facing descriptions, read [INTERPRETIVE_VOICE_FOR_PLACES.md](docs/INTERPRETIVE_VOICE_FOR_PLACES.md). Write source-grounded, interpretive guidance in a knowledgeable park-guide voice without falsely claiming agency or employee status. Keep the answer visible, the map and plan factual, and actual mobile text readable. This does not apply indiscriminately to traffic or live status engines.

2. **Research:** before committing to an interface, read this package's `docs/INSPIRATION_LIBRARY.md`, `docs/INTERACTION_PATTERN_LIBRARY.md`, `docs/ANTI_PATTERNS.md`, `docs/TECHNOLOGY_DECISIONS.md`, and `docs/RESEARCH_SOURCES.md`. For new/major work, investigate at least two relevant **external, credible, currently checked** examples and primary data/rights sources; cite exact URLs and checked dates. Use counterexamples.
3. **Frame:** complete `templates/EXPERIENCE_BRIEF.md` in project docs. State the user's question, what changes when a control is used, two genuinely different concepts, why one was selected, no-data behavior, and evidence requirements. For substantial multi-surface interactions, also fill [`templates/STATE_MATRIX.md`](templates/STATE_MATRIX.md) and read [`docs/CONNECTED_EXPERIENCE_CONTRACT.md`](docs/CONNECTED_EXPERIENCE_CONTRACT.md): one stable selected ID, source/data/display separation, known unknowns and every critical failure mode.
4. **Build:** implement the least complex practical architecture. No React/Rust/3D mandate. Preserve HTML-first answer, readable sources, accessible and reversible interactions; map tiles + pins + route must be verified, not merely an API 200.
5. **Test:** real browser at 360/390/768/1440px; changed controls with three meaningful scenarios; failed network, stale data, map tiles missing, keyboard, reduced motion, no JavaScript, focus, responsive photos. Explicitly exercise selection A→B→A, a photo-free route, a failed/slow image, units and source precision, first-screen answer/action placement, and map-missing state where relevant. Test semantic correctness, not incidental descriptive label equality. Save and **inspect** changed-state screenshots. Use Playwright/Storybook when installed, not as assumed dependencies.
6. **Gate:** complete `docs/QA_SCORECARD.md`. Unmeasured is not passed. Run all existing owning-repo tests and full CI; no merge while red.
7. **Learn:** record a tested pattern or anti-pattern, exact implementation evidence, sources, and what did not work in the research/experience ledger. Consult [`docs/PILOT_LESSONS_V1_2.md`](docs/PILOT_LESSONS_V1_2.md) before reusing prior park UX patterns. Distinguish implemented, CI/browser verified, production READY, live-public verified and actual visitor outcome measured; never collapse them into one “done” claim. Do not misrepresent analytics improvements.

## V1.2.1 runnable process (substantial work only)

After the experience brief and state matrix, read [V1_2_OPERATING_KIT.md](docs/V1_2_OPERATING_KIT.md) and [GOOSEBERRY_PILOT_20261031.md](docs/GOOSEBERRY_PILOT_20261031.md). Create an intentionally incomplete release record with `scripts/new-experience-os-v1.2.mjs` and fill actual claims, checked sources, six meaningful interaction/failure scenarios, loaded-photo evidence and distinct release stages. Validate with `scripts/verify-experience-os-v1.2.mjs` and, on this central site only, `--check-site`. It is a source-and-evidence **structural** check, never a substitute for the owning repo's actual browser, public API/tile, SEO/ads or live source checks.

For any new canonical central-site tool, plan its Tools card, JSON-LD ItemList **in visible order**, sitemap, registry and directed relationships in the initial PR; don't launch a stranded page. For a conservative short visit, evaluate the full official time range, not simply its lower bound. Test real external map tiles and loaded photography after a real deployment, not only deterministic fixture images.

## Non-negotiable truths

Never invent live access, open trails, verified routes, measured drive times, scores, sensor freshness, weather certainty, or actual photo provenance. Do not copy other companies' UI assets, licensed map layers, or restricted trail data. No AI-generated place photograph masquerading as the destination. Preserve one canonical intent owner, visible creator identity, search indexing, and existing ads policy. No Redis added. No automatic geolocation or tracking. No unapproved production framework migration.

**Cross-repo limit:** this root-level package is not automatically loaded by agents in sibling repositories. Add a small adopting `AGENTS.md`/supported harness pointer **in the owning repo** before claiming automatic retrieval there. See `docs/MULTI_REPO_ADOPTION.md`.
