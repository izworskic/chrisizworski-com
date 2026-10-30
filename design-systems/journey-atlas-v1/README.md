# JOURNEY_ATLAS_V1 · Experience-first, trip-aware travel intelligence

**Stable ID:** `JOURNEY_ATLAS_V1`  ·  **Version:** `1.0.0`

**One-line invocation:** **Use JOURNEY_ATLAS_V1 for [destination, route or region].**

This reusable layer works alongside `FIELD_GUIDE_V1`. The Field Guide brings authentic photography, precise sense of place, and a reliable early map. Journey Atlas answers the visitor's decisions: *what kind of experience, what time budget, what stretch of the route, which canonical specialist tool, what is the sensible alternative if access does not work?*

## Where it lives
- Reusable implementation and rules: `design-systems/journey-atlas-v1/`
- Exact deployed runtime copies: `public/assets/journey-atlas-v1.{js,css}`
- First integration: `/lake-superior-circle-tour/#journey-atlas` (section in existing canonical, **no new indexable URL**).
- Starter: `starter/index.html` for local visual/functional demonstration.

## Contract
1. HTML-first cards each contain a real stop/destination, experience, why-go, route link, official source, time-band, alternative, and specialist handoff if available.
2. JavaScript progressively filters by shore, interest and qualitative time budget, with a reset/no-match state and keyboard-accessible controls.
3. It ranks **editorially**, never as a fabricated safety, public-access, weather or drive-time score.
4. A selected existing Circle Tour stop can be added to that planner via its original add button. The planner, ferry engines, weather engines and park access truth remain with their existing owners.
5. Source dates and closures are never silently turned into live guarantees. Sources are checked at their destination tools. Unverified seasonal access must be described as unverified.
6. License and credit each image and retain the `FIELD_GUIDE_V1` hard gates.
7. Existing AdSense code and formats are untouched.

## Reuse in another destination
Copy the two starter assets, add `data-journey-atlas` to a section, and author static cards with `data-ja-place`, `data-ja-region`, `data-ja-interests`, `data-ja-times`, `data-ja-order`. Provide within the section selects with `data-ja-region`, `data-ja-interest`, `data-ja-time` and status/controls with `data-ja-result`, `data-ja-more`, `data-ja-empty`, `data-ja-reset`. The starter HTML demonstrates the complete interface. `data-ja-add-stop` is optional and only applies when an existing Circle Tour stop planner is present.

Use the owning site's existing map instead of embedding another one. For a new map, follow `FIELD_GUIDE_V1/docs/MAP_AND_TRUTH.md`.

## Next layers, deliberately not claimed in v1
- Route-aware distance/ETA scoring and nearby suggestions (requires grounded origin/route graph).
- Real-time operator/park access status (requires official feeds, freshness and failure tests).
- Automatic replanning when an access source changes (requires source adapters with explicit permissions and safe defaults).
- Offline packs and a personal journey journal (separate privacy and caching design).

Read `AGENTS.md`, `docs/DECISION_CONTRACT.md`, and `docs/QA_SCORECARD.md` before a release. Run `node --test tests/journey-atlas-standard.test.js`, `npm run benchmark:circle-tour`, and `npm run verify:all` on the owning repo.
