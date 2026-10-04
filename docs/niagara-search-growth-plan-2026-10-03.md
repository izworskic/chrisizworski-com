# Niagara search growth plan — 2026-10-03

Goal: increase impressions and CTR without weakening the live crossing decision engine.

## Search architecture

- `/niagara-border-crossing/` owns broad intent: Niagara border wait times, Niagara Falls border wait times, which Niagara bridge should I take, live Niagara border crossing cameras.
- Dedicated substantial pages own bridge-selected intent:
  - `/peace-bridge-wait-times/`
  - `/rainbow-bridge-wait-times/`
  - `/lewiston-queenston-bridge-wait-times/`
  - `/whirlpool-rapids-bridge-crossing/`

The dedicated pages are not alternate decision engines. They expose the authoritative wait for that crossing and hand cross-bridge choice back to the canonical Niagara decision tool.

## Mackinac-derived principles

1. Match the literal search question in title/H1 before asking for interaction.
2. Put current official status/wait ahead of explanation.
3. Keep cameras and concrete crossing guidance close to the live answer.
4. Build substantial intent pages for tolls/rules/vehicle/crossing questions instead of forcing one page to rank for everything.
5. Keep source hierarchy and uncertainty visible without making methodology the hero.

## Main-page changes

- Title: `Niagara Border Wait Times Live | Peace, Rainbow & Lewiston`
- H1: `Niagara Border Wait Times Live`
- Supporting line keeps the differentiated product question: which bridge should you take right now?
- Hide the scenic hero photo on small screens so direction/traveler controls and the live decision arrive earlier.
- Add a bridge-intent navigation strip near the top with exact bridge-search language.
- Add crawlable bridge-specific headings and links to dedicated pages.
- Add visible high-intent Q&A without FAQPage structured-data inflation.
- Expand JSON-LD with WebSite/Person/BreadcrumbList/ItemList and the four bridge intent URLs while retaining honest WebApplication markup.

## Hard constraints

- CBSA remains Canada-bound authority; CBP remains U.S.-bound authority.
- Operator traffic is never relabeled as customs wait.
- Whirlpool remains NEXUS-only and lower-confidence/context-only where official real-time technology is unavailable.
- No route-time or total-trip prediction is invented.
- No bridge-selected landing page may independently choose a different crossing; it links to the flagship decision engine for that decision.
