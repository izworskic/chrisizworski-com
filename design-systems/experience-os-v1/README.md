# EXPERIENCE_OS_V1 — research-led interactive experience operating system

**Version:** 1.0.2 · **Research reviewed:** 2026-10-31 · **Status:** source-only governance; no public route, production component, or deployment change.

## Why this exists

The site already has `FIELD_GUIDE_V1` (photo-led editorial quality) and `JOURNEY_ATLAS_V1` (trip-aware choices). They are reusable systems, but requiring the owner to recall and invoke them loses ideas between sessions. **EXPERIENCE_OS_V1 is the default design-research and experience-review process** for every new user-facing tool, major interaction feature, and substantial redesign. It makes useful research durable without forcing every tool into a common design or framework.

**Success is not "a prettier card grid."** A visitor can understand the place or event, see a timely, properly sourced answer, manipulate meaningful inputs, compare alternatives, and act confidently. The page remains useful on a slow phone and when maps, APIs, or JavaScript fail.

## Mandatory reading sequence

1. Read the owning repository's `AGENTS.md`, identify the original implementation and canonical URL, and honor existing production/SEO gates.
2. Read [this package's AGENTS.md](AGENTS.md), [lifecycle](docs/EXPERIENCE_LIFECYCLE.md), [pattern library](docs/INTERACTION_PATTERN_LIBRARY.md), [interpretive voice for parks](docs/INTERPRETIVE_VOICE_FOR_PLACES.md), [inspiration library](docs/INSPIRATION_LIBRARY.md), [technology choices](docs/TECHNOLOGY_DECISIONS.md), [anti-patterns](docs/ANTI_PATTERNS.md), and [scorecard](docs/QA_SCORECARD.md).
3. Examine prior `FIELD_GUIDE_V1` and `JOURNEY_ATLAS_V1` specs **when applicable**, not as compulsory page templates.
4. For substantial work, research appropriate external examples and fresh source evidence, write an experience brief from [template](templates/EXPERIENCE_BRIEF.md), then implement, test, and record the outcome. Minor bug fixes are not burdened with a new brief.

## Core commitments

- Start with the **specific visitor decision** and information required to make it. Don't start with a library, hero photo, or technology.
- Research at least **two credible external experience examples** for significant projects and confirm their actual affordances. Do not copy layouts, copyrighted assets or vendor code.
- Distinguish verified access and observations from forecasts, simulations, editorial suggestions, and unknowns. Display source issue time, retrieval time, timezone and stale-state behavior where relevant.
- For parks, outdoor destinations and field guides, consult the [source-first interpretive voice standard](docs/INTERPRETIVE_VOICE_FOR_PLACES.md) so visitor copy explains what to notice, why it matters, and how to explore responsibly; never impersonate park staff.
- Design for one coherent core interaction, with HTML-first answers, genuine site-specific photography where appropriate, and a working no-JS path.
- Design mobile first, including keyboard access, reduced-motion support, screen readers, map fallback and contrast. Check rendered screenshots, not just source.
- Do not alter AdSense, Redis policy, canonical ownership, existing tool data contracts, or other repositories' production code without required authorization and owner-specific testing.
- Treat React, Rust, TypeScript, D3, Motion, MapLibre, deck.gl and Three.js as **conditional implementation choices**. Default to the least complex approach that meets the user need.
- Extract a validated lesson or component after each substantial release, including failed experiments, to improve future work.

## Applicability

| Change | Required |
| --- | --- |
| New tool, destination engine, field guide, major redesign | Full research → brief → alternatives → UX tests → scorecard → lesson |
| New interactive mode/map/timeline or substantial usability work | Focused brief + relevant research + full changed-surface UX tests |
| Content correction, minor accessibility fix, dead link, SEO metadata repair | Apply relevant guardrails; avoid ceremonial new research/brief |
| Extracted tool repository | Use owning repo's `AGENTS.md`; adopt portable pointer there in a separate reviewed change; central instructions do **not** propagate automatically |

## Portable package contents

- `docs/RESEARCH_SOURCES.md`: date-checked sources, primary materials, cautions.
- `docs/INSPIRATION_LIBRARY.md`: outside-product examples, transferable principles, limits.
- `docs/INTERACTION_PATTERN_LIBRARY.md`: named patterns with triggers, input changes, fallback and test.
- `docs/TECHNOLOGY_DECISIONS.md`: decision tree for libraries, map resilience, performance and gradual adoption.
- `docs/EXPERIENCE_LIFECYCLE.md`: stage gates and learning loop.
- `docs/QA_SCORECARD.md`: 100-point evaluated acceptance + hard gates.
- `docs/ANTI_PATTERNS.md`: failures explicitly to avoid.
- `docs/MULTI_REPO_ADOPTION.md`: scope, entry points and portable instructions.
- `templates/`: experience brief, source record and release review.
- `tests/experience-os.test.js` at repository root: ensures this package remains readable, linked, versioned and has the core safety contracts.

## First verified implementation

The first full pilot, **Tahquamenon Falls Visit Planner**, has been implemented and merged in its authoritative tool repository. See the [source-backed lessons, screenshot evidence and release limits](docs/TAHQUAMENON_PILOT_20261031.md). It validates photo → selected place → existing map → original plan synchronization, a complete non-map source-linked place browser, real keyboard/mobile browser QA and a compact failure fallback **without introducing a new framework**.

**Next appropriate adoption:** Porcupine Mountains Explorer once its current underlying route/parking development is complete. Do not interrupt the owning repo, assume its verified trail geometry is ready, or imply the Tahquamenon design is a reusable visual page template. Transfer research methods and tested interaction contracts, not a cloned layout.

## What this does NOT do

It does not dynamically inject instructions into every ChatGPT conversation, automatically update other repositories, ensure a coding agent actually read a file, or replace actual human browser evaluation. The repository is the durable source of truth; use repository-scoped agent instructions and explicit cross-repository adoption. Read [multi-repo rollout](docs/MULTI_REPO_ADOPTION.md).
