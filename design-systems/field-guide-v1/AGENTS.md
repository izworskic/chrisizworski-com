# FIELD_GUIDE_V1 — reusable system instructions

When asked to **"use my Field Guide design standard"**, **"FIELD_GUIDE_V1"**, **"Michigan Adventure Finder design"** or **"that photo-led travel look"**, treat this directory as the authoritative design reference. Do not ask the owner to write code or manage a photo spreadsheet; research, build, verify and deliver it.

1. Read `README.md`, `docs/DESIGN_STANDARD.md`, `docs/PHOTO_STANDARD.md`, `docs/QA_SCORECARD.md`, `docs/IMPLEMENTATION.md` and, for a map, `docs/MAP_AND_TRUTH.md`.
2. Inspect the owning tool's current repository and current live page before editing. Respect its own AGENTS.md and CI/merge boundaries. Do not assume all tools are in the central site repo.
3. Compose a fresh trip or discovery experience from real destination photography and the actual user's decision. Reuse tokens/components *not* the source page's text, region list or repetitive layout.
4. Verify every place and every image: exact location, original source, commercial reuse rights, attribution, accessible alt, subject-aware crop, working image URL. No AI-generated destination images, placeholders masquerading as photography or invented live conditions.
5. Render the main answer, cards, sources and direct links in HTML before JS. Progressive filters/map enrich rather than define the page.
6. For maps, follow `docs/MAP_AND_TRUTH.md`, serve Leaflet CSS locally, use the existing Vercel public-key configuration endpoint where supported, and prove multiple tiles and pins render at desktop/mobile sizes; an API "success" string is insufficient.
7. Do not edit AdSense/ad settings without separate explicit permission. Design around real observed ad behavior and disclose overlap honestly; do not inject special ad code.
8. Preserve source ownership, canonical URL, search intent boundaries, privacy and site identity. Don't promise SEO uplift.
9. Run the portable `npm test`, the target repo's full CI, and browser QA with loaded images, at least 390px mobile and 1366px desktop. Review failures rather than merge red.
10. Report changed files, screenshot findings, source licenses, tests, PR, merge/deployment status and one concrete next action. Do not claim a build was merged/deployed unless confirmed.

This system is opt-in by user request and not a blanket mandate to reskin every page.
