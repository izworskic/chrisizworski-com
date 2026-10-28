# Upper Peninsula waterfalls — issue #1258 batch ledger

Reviewed: October 28, 2026. Branch: `waterfalls-1258-inventory-ledger-batch-01`.

## Batch 00: recover interrupted guides

Checked current default branch rather than blindly merging stale #1226 or #1223. Greenstone Falls, Nonesuch Falls, and Little Union Gorge Falls already exist as HTML files, curated records and sitemap entries. Source files are byte-identical to the #1226 versions at inspected refs. Superior Falls also exists. **Recovery conclusion: no duplicate cherry-pick necessary.** This observation verifies repository presence, not current production deploy, fresh closure status or full CI.

## Batch 01: geographic reconciliation ledger

Added `data/up-waterfall-reconciliation.json` with all 161 named Michigan GIS research features, using the original GIS object ID, county, waterway and point coordinates. It matches to 43 existing curated destinations by exact GIS object ID only: **35 matched**, **126 awaiting individual reconciliation**, and **8 curated destinations have no exact GIS ID match**. The eight are Tahquamenon, Wagner, Miners, Mosquito, Elliot, Bridalveil, Rapid River (Delta County), and Yellow Dog. The nonmatch count is not a count of unique undiscovered falls. Published visitor records are not reclassified from coordinate matching.

No waterfall maps, guides, canonical URLs, structured data, sitemap, AdSense, or visitor-facing design are changed in this batch. The ledger is source research, **not a publishable guide list**. Existing access labels must be separately reevaluated under `docs/UP_WATERFALL_SOURCE_GATE.md`; null evidence fields in this ledger mean **not separately evaluated in this pass**, not evidence of closure or private ownership.

## Next independent work batches

| Batch | Reconciliation scope | Required output |
| --- | --- | --- |
| 02 | Dickinson and Menominee river-system candidates, including Misicot / Sand Portage | Resolve identities/aliases and public approach using official land-manager and parking/trail evidence; leave unknowns research-only |
| 03 | Gogebic / Iron / Ontonagon candidates | Compare names and river positions to curated Porcupine Mountains, Black River and other western U.P. guides; distinguish same-name features |
| 04 | Houghton / Keweenaw / Baraga candidates | Verify land tenure, trailhead/public parking, access restrictions, and match with existing Keweenaw guides |
| 05 | Marquette / Alger / Delta / Schoolcraft candidates | Separate NPS/state park signed approaches from private, road-edge and nonvisitor features |
| 06 | Remaining eastern U.P. counties and unmatched curated records | Resolve source coverage and independent locations; record out-of-scope/duplicate decisions |

For each batch: independently cite geography, land manager, legal public approach, designated parking, established walking route, dated restrictions, and a reviewed date; write a specific disposition to the ledger. Only qualifying public visitor pages or substantiated closure guides enter the sitemap. Never suggest driving to raw GIS pins. Keep unreconciled candidates discoverable only as research.

## Checkpoint / gates

- Data snapshot: curated 43, source GIS 161, exact joins 35, pending GIS 126, curated unmatched 8.
- Content recovery: repository file and sitemap presence confirmed for all three previously missing guides.
- Tests: **not executed** for this batch; exact-head CI, desktop/mobile browser smoke, source review and production verification remain required before release.
- Merge: **not performed**. This is a non-public data/doc PR candidate, pending review.
- Blockers: official access checks for 126 unmatched GIS features, possible duplicates, eight curated nonmatches, and live seasonal restrictions.
- Follow-up: update issue #1258 only with actual test/PR receipts, and preserve the branch when blocked.
