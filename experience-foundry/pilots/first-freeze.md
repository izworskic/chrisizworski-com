# Foundry pilot 01 — The First Freeze (cross-repository release record)

**Owner implementation:** [phenology-michigan PR #91](https://github.com/izworskic/phenology-michigan/pull/91)  
**Canonical visitor location:** `https://phenology.chrisizworski.com/#first-freeze` (existing homepage, not another URL)  
**Record created:** 2026-11-05  
**Phase (checked 2026-11-07):** PR #91 merged 2026-11-05 at `4ee5f4ad47a0badb5b0eadf81d93d9886e56b6d8`. GitHub merge status verified; current live production and visitor outcomes not independently verified in this workbench review. The old PR body still describes draft-era checks, so it is not a current release-status record.

## Why it exists

The first Foundry production candidate is *not* an isolated generated article or a copy of the existing Michigan natural-year dashboard. It joins existing evidence in a purpose-built decision: choose the stage of the Saginaw Bay seasonal transition, then choose a legally documented viewing area and see the specific access precautions and dated data.

- Four story chapters with distinct interpretive questions; a chapter switch never changes NOAA or bird evidence.
- Four DNR/FWS visitor approaches; selecting one changes the real-world viewing plan, operator reference and dated access caveats.
- Source-qualified NOAA GLERL offshore ice, GLSEA offshore temperature, Bay City forecast and Bay County eBird notable observations. Missing/current-year data is not invented.
- 2026 hunt closures cannot silently become a 2027 access statement.
- Original dark coastal field-journal artwork and mobile journey, **not the generic `field-notes` preview renderer**.
- Existing homepage owns the search intent and ads/creator configuration; no new search-facing route.

## How this relates to Foundry v0.1

Foundry v0.1 currently includes `discover`, `init` and `build` plus two authored review-preview recipes (`field-notes`, `passage-log`). The First Freeze is the first **cross-repo, product-specific implementation using Foundry's operating rules**, not a claim that those two CLI recipes automatically generated Next.js JSX.

The owning repository contains source-aware implementation and tests:
- [Evidence model](https://github.com/izworskic/phenology-michigan/blob/4ee5f4ad47a0badb5b0eadf81d93d9886e56b6d8/lib/first-freeze.mjs)
- [Purpose-built interaction](https://github.com/izworskic/phenology-michigan/blob/4ee5f4ad47a0badb5b0eadf81d93d9886e56b6d8/components/FirstFreezeJourney.js)
- [Source/experience brief](https://github.com/izworskic/phenology-michigan/blob/4ee5f4ad47a0badb5b0eadf81d93d9886e56b6d8/docs/FIRST_FREEZE_FOUNDRY_PILOT.md)
- [Real browser workflow](https://github.com/izworskic/phenology-michigan/blob/4ee5f4ad47a0badb5b0eadf81d93d9886e56b6d8/.github/workflows/first-freeze-browser.yml)

## Transferable Foundry pattern

**Seasonal chapter + site selection + evidence rails + authority handoff.**

A generic templating system would swap the bird labels for ships and clone this layout. **Do not do that.** The reusable pieces are the source-kind contract, dated access decisions, source fallback, selected-state reversibility, artifact proof levels and measurement discipline.

The next maritime pilot should instead have a passage ledger, location sequence and explicitly qualified vessel events/lock status. It should share contracts, not UI hierarchy or illustration.

## Acceptance and result recording

- Source truth: distinct model/forecast/eBird/official access states; no inferred birds or safe ice.
- Interaction: chapter A→B→A and site selection change their own answer, not evidence.
- Access: Ferguson 2026 November 5 closure, no extrapolation in 2027.
- Release: owning `npm test` and `npm run build`, isolated browser at 360/390/768/1440, keyboard, no-JS, screenshot review; Vercel preview then post-merge production smoke.
- Outcomes: do not claim new search clicks or engagement improvement before comparable GSC/first-party event evidence.

**Cross-repo limit:** This Foundry record does not write to or release the phenology repository. Actual release truth is determined by its CI, merged SHA and deployed page. Update this record after independent live and outcome measurement.
