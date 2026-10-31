# EXPERIENCE_OS_V1 — execution instructions for coding agents

This package is **research and quality governance, not a public-page template**.

## Trigger automatically

When a task in an adopting repository creates a visitor-facing tool, materially changes user interaction, or redesigns an existing tool, **consult EXPERIENCE_OS_V1 without requiring the owner to name it**. For a tiny defect fix, use only directly relevant guardrails. Apply the owning repository's `AGENTS.md`, release gates, and canonical ownership first.

## Mandatory work order

1. **Locate:** current production URL, owning repo, generated versus source files, visitor journeys, current baseline, sources, and SEO/ads contracts. Read existing `FIELD_GUIDE_V1` / `JOURNEY_ATLAS_V1` where relevant.
2. **Research:** before committing to an interface, read this package's `docs/INSPIRATION_LIBRARY.md`, `docs/INTERACTION_PATTERN_LIBRARY.md`, `docs/ANTI_PATTERNS.md`, `docs/TECHNOLOGY_DECISIONS.md`, and `docs/RESEARCH_SOURCES.md`. For new/major work, investigate at least two relevant **external, credible, currently checked** examples and primary data/rights sources; cite exact URLs and checked dates. Use counterexamples.
3. **Frame:** complete `templates/EXPERIENCE_BRIEF.md` in project docs. State the user's question, what changes when a control is used, two genuinely different concepts, why one was selected, no-data behavior, and evidence requirements.
4. **Build:** implement the least complex practical architecture. No React/Rust/3D mandate. Preserve HTML-first answer, readable sources, accessible and reversible interactions; map tiles + pins + route must be verified, not merely an API 200.
5. **Test:** real browser at 360/390/768 desktop; changed controls with three meaningful scenarios; failed network, stale data, map tiles missing, keyboard, reduced motion, no JavaScript, focus, responsive photos. Use Playwright/Storybook when installed, not as assumed dependencies.
6. **Gate:** complete `docs/QA_SCORECARD.md`. Unmeasured is not passed. Run all existing owning-repo tests and full CI; no merge while red.
7. **Learn:** record a tested pattern or anti-pattern, exact implementation evidence, sources, and what did not work in the research/experience ledger. Do not misrepresent analytics improvements.

## Non-negotiable truths

Never invent live access, open trails, verified routes, measured drive times, scores, sensor freshness, weather certainty, or actual photo provenance. Do not copy other companies' UI assets, licensed map layers, or restricted trail data. No AI-generated place photograph masquerading as the destination. Preserve one canonical intent owner, visible creator identity, search indexing, and existing ads policy. No Redis added. No automatic geolocation or tracking. No unapproved production framework migration.

**Cross-repo limit:** this root-level package is not automatically loaded by agents in sibling repositories. Add a small adopting `AGENTS.md`/supported harness pointer **in the owning repo** before claiming automatic retrieval there. See `docs/MULTI_REPO_ADOPTION.md`.
