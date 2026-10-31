# JOURNEY_ATLAS_V1 — reusable build instructions

**Invocation:** "Use JOURNEY_ATLAS_V1 for [destination, route or region]."

1. Read this package's README, docs/DECISION_CONTRACT.md and docs/QA_SCORECARD.md. Also use the established FIELD_GUIDE_V1 photo, map, licensing and accessibility standard.
2. Identify the existing canonical itinerary and destination tools; preserve their ownership, URLs, sources, and logic. Do not create a duplicate planner, weather API, ferry engine, or duplicate near-identical search pages.
3. The visitor must be able to browse useful, source-linked HTML cards with JavaScript off. The JavaScript only filters and progressively reveals cards.
4. Every experience records a verified parent stop or point, region, eligible time bands (qualitative only), interests, actual primary-source URL, specialist tool when present, dated access caveat and safe alternative or honest unknown. No automatically computed driving times or unsafe trail/ferry recommendations.
5. "Worth the detour?" is an editorial comparison, never a fake 0–100 ranking, measured customer preference or live-safety decision.
6. If access evidence is stale, closed, unavailable or contradictory, do not claim the route is open. Prefer a source-verification link and appropriate alternative.
7. Photographs require exact-place identification, independent reuse rights, visible credit, responsive crop and real image QA. Never invent a photograph or imply current conditions from archival imagery.
8. The shared runtime is in starter/journey-atlas.js and starter/journey-atlas.css. The site deploy uses exact copies in public/assets. Keep synchronized and run tests.
9. No ads configuration changes, Redis, new personal tracking, precise-location collection or unwarranted geolocation permission. User-selected region is sufficient.
10. Run unit tests, owning-repo full CI and visual QA at mobile and desktop widths. If red, stop before merging or deploying. State exactly what was verified.

See also design-systems/field-guide-v1/AGENTS.md.
