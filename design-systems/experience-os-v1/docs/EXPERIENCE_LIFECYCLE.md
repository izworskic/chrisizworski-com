# Lifecycle: research → distinct experience → verified release → reusable lesson

Use this for **new tools and substantial interaction changes**. For a one-line defect or factual correction, run relevant checks and skip the research ceremony.

## Stage 0 — Locate and preserve

- Identify exact owning repo, URL, generator, source files, released product status, current screenshots and existing interaction.
- Read root and nested `AGENTS.md`; inspect `FIELD_GUIDE_V1`, `JOURNEY_ATLAS_V1` if germane. Preserve canonicals, SEO/person graph, analytics/ads, route and data contracts.
- State the factual/UX problem and the visitor's actual question. Collect baseline signals when available: pages, queries, form abandonment, click paths, support complaints. No made-up analytics.

## Stage 1 — Evidence and inspiration

- Find **at least two external credible product examples** relevant to this actual visitor task, one comparable and one different way to solve it. Note observed interface affordances, what not to adopt, official source URLs and review dates.
- Review at least one primary data/source owner for each live assertion, including licensing for imagery and map services. Verify freshness behavior and official public-access restrictions.
- Consult `docs/INSPIRATION_LIBRARY.md`, `docs/INTERACTION_PATTERN_LIBRARY.md`, `docs/RESEARCH_SOURCES.md`, `docs/ANTI_PATTERNS.md` and previous site patterns. Add new references to the library when they improve the portfolio.
- Where a design choice is uncertain, explicitly say unknown and make a reversible prototype.

## Stage 2 — Make an experience brief

Use `templates/EXPERIENCE_BRIEF.md` with **two substantially different approaches**; state the visitor's decision, one most useful action, causal input/output change, source evidence, conditions and unknowns, responsive composition and failure states.

Every proposed interactive control must pass a simple test: **"If the user changes X, what meaningfully changes in the answer?"** If nothing, remove it.

**v1.2 selection contract:** for substantial multi-surface work, fill [`templates/STATE_MATRIX.md`](../templates/STATE_MATRIX.md) before building and follow the [`connected experience contract`](CONNECTED_EXPERIENCE_CONTRACT.md): a stable selected ID, source/display units, user-visible map/photo/details invariants, explicit unavailable states and A→B→A behavior.

Select one anchor interaction and a coherent visual hierarchy. Do not graft on an excessive tool catalog. Primary answer + next action appear near the top, not hidden under oversized editorial imagery.

## Stage 3 — Implement intentionally

- HTML-first main answer, source links, canonical metadata and readable fallbacks before client hydration.
- Progressive enhancement for maps, time sliders, filters, optional 3D/animation. Choose tools via `TECHNOLOGY_DECISIONS.md`.
- Separate verified source values, update times and warnings from visual presentation; prevent stale results from being described as present conditions.
- Image rights, real-place match, credits, dimensions, responsive crops, fallbacks. Avoid heavy third-party embed initialization before the answer.

## Stage 4 — Quality and safety

- Test 360px, 390px, 768px, a typical desktop and touch/keyboard. Inspect actual viewport and deep-scroll renders.
- Test three different user journeys including an alternative, invalid input/empty set, map without tiles and no data/expired observation. Ensure map and cards share state and have direct list fallback.
- Test JavaScript disabled, keyboard-only, focus visible, screen-reader labels, reduced motion, accessible click alternatives to dragging, and color contrast.
- Inspect **loaded and failed** image/photo compositions, linked credits and async A→B race states. Record first useful answer/action location on phone; hero height is contextual, not an arbitrary global fixed limit.
- Assert verified facts and IDs exactly, but test descriptive captions semantically; preserve real “not mapped” and “unverified” text instead of rewriting it to satisfy a brittle assertion.
- Confirm source units remain authoritative while displayed units round correctly for users, including total round trips and mode segments.
- Measure lab CWV and compare to baseline if available. Record field data separately; never claim lab checks equal real-user p75.
- Complete QA scorecard with evidence; run owning-repo full verification and actual production smoke **after** allowed release.

## Stage 5 — Deliver responsibly

- In PR: link evidence, design brief, filled state matrix, current screenshots, scorecard, test results, intended source/canonical/ads impact and rollout/rollback.
- Report distinct statuses: source implemented, verified CI/browser head, production deployment READY for correct merged SHA, independently fetched live HTML, and visitor outcome measured. Omit no step; **NOT VERIFIED** is valid when a public smoke cannot be performed.
- A failing or incomplete test is not a pass. Never merge under a red owning-repo gate. Repository rules and explicit owner constraints supersede this guide.
- This system being added as source-only requires no site deployment or new URL.

## Stage 6 — Learn across projects

- After verified release, update `INSPIRATION_LIBRARY.md` or `ANTI_PATTERNS.md` with exactly what worked/failed and a relevant demo/PR link. Track whether users accomplished the intended decision, not only page views.
- Revisit active references every 90 days or before significant reuse; source dates are check dates, not publication dates.
- Keep a compact decision log: hypothesis, intervention, evidence, learning, next small change. Never assert causal SEO lift from one release without suitable measurement.

## Fast-path exception

A metadata bug, typo, fact correction, source update, accessibility bug, broken link, or simple map-key repair can skip the new inspiration brief; document relevant tests and restore the intended interaction without widening scope.
