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

## Batch 03 research started: Gogebic / Ontonagon official access controls

The Michigan DNR's current Porcupine Mountains park page confirms South Boundary Road seasonal closures (Headquarters Road to Pinkerton Trailhead, Dec. 1 through late spring) and identifies County Road 519 as the access to Presque Isle Scenic Area. It identifies the Nawadaha accessible viewing platform on the West River Trail. These are road- and destination-specific rules, not a blanket winter status for the entire park. Source: https://www.michigan.gov/recsearch/parks/porkies (checked 2026-10-28).

The 2025 Michigan DNR visitor guide describes the separate day-use arrival and boardwalk/stair choices at Presque Isle; it must not be generalized into a parking guarantee for isolated upper-river falls. Source: https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf (historical guide; not live).

Prioritize GIS alias/feature checks around Manabezho, Manido, Nawadaha, Little Carp, Big Carp and Union River. Do not add duplicate visitor guides for gorge features already covered by existing official arrivals. Remaining source candidates are unreviewed; per-candidate dispositions and route/parking evidentiary records are still required. No new page added in this checkpoint.

## October 28 — Menominee River visitor-guide publication preparation

Committed `docs/UP_WATERFALL_1258_MENOMINEE_FIELD_GUIDE_SOURCE_PACK.md`: three complete, source-linked editorial manuscripts, each distinguishing official vehicle approach, walking route, limitations, seasonal roads, and raw GIS coordinate. Sand Portage (GIS 3), Pemene (188), Quiver (189) have DNR-identified public approaches and named parking routes. Candidate ledger now records separate access evidence and publication blockers. The MI/WI DNR published trail-map collection https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsI-N/Menominee_mrspra_trailmap.pdf contains a Pemene Falls parking/trail/overlook map (page 1), Piers Gorge unit infrastructure (page 3), and Quiver unit infrastructure (page 4). Those older maps do not certify current legal parcel access or today's road conditions and do not justify invented parking coordinates. **No new indexable or noindex visitor pages**, map markers or sitemap changes in this batch. Final road-to-lot georeferencing and guide publication/integration gates remain.
