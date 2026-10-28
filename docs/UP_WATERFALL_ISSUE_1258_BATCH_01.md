# U.P. waterfall build — Issue #1258 · Batch 01

**Base:** main 621de21c69279ac5ab8497952e73fb8681aa43b2 · **Branch:** feature/up-waterfall-issue-1258-batch01-20261028 · **Review date:** 2026-10-28

## Completed
- Recovered Greenstone Falls (state GIS #98), Nonesuch Falls (#108) and Little Union Gorge Falls (#117) from old PR #1226 without merging stale branch changes.
- Independently cross-checked the visitor route against Michigan DNR park maps and park guides. Park-wide DNR winter vehicle closure from Dec. 1 remains explicit.
- Kept Superior Falls and the 37 current main entries; now 40 curated destinations (39 child guides plus Tahquamenon specialist canonical). Scott Falls and Silver River remain research-only; closed falls retain closure status.
- Added five-source-axis evidence, HTML-first arrival decisions, map cards, structured data, sitemap, new regressions and a 161-GIS-feature candidate ledger with unverified sites explicitly gated.
- No AdSense, unrelated canonical, map-theme or unrelated tools modified.

## Unresolved / next batches
- The named state GIS extract is 161 candidates but not the universe of all falls. Alias and identity reconciliation is pending for unmatched OIDs. The ledger retains ambiguous matches separately.
- All source entries require source-age/land-manager refresh before a claim of current opening; never publish from GIS geography alone.
- Next batch: focus on the Ontonagon/Gogebic cluster and identify duplicate/alias or access-blocked candidates in manageable batches. Preserve every source candidate.

## Release gates
- Focused tests: pending CI. Full 59-stage verification, live browser smoke and Vercel preview required on exact head before merge. Do not merge old #1226.

## Key sources
- DNR park: https://www.michigan.gov/recsearch/parks/porkies
- DNR Union Mine trail length: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf
- DNR park map: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf
- DNR visitor guide: https://www.michigan.gov/-/media/Project/Websites/dnr/Documents/PRD/Misc/PMWSP_VisitorLR.pdf
