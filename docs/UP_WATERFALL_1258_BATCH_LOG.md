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

## Batch 05: Cascade Falls publication implementation (October 28, 2026)

**What was independently recovered:** The December 2025 North Country Trail Association Peter Wolfe Chapter field guide, [Trap Hills segments 1–15](https://northcountrytrail.org/files/chapters/pwc/PWC_1-15_Dec2025.pdf), PDF pages 10–11, explicitly identifies Ottawa National Forest as the land manager/trail maintainer, a signed Cascade Falls Trail parking area on FR 468, trail-approach alignment, and the *proposed but not yet connected* NCT spur. The visual map was inspected; the colored proposal line is **not** an established route. The [USFS Trap Hills visitor brochure](https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fseprd1148492.pdf) separately documents FR 400 to FR 468 and 0.75 mile one-way main trail / 1 mile one-way more demanding Bluff Trail. It is a 2009 document and does not prove current surface/closure conditions.

**Decision:** Promote **Cascade Falls, GIS #67**, as an indexable **source-verified public trail guide** with explicit season caveats, not as an open-now site. Map the fall only at state GIS coordinates 46.651708, -89.446195. Do **not** invent a parking coordinate or give directions to the falls GIS point. NCTA labels parking on FR 468 but published map does not provide a precision lot point from which driving routing can be guaranteed.

**Files:** New `public/upper-peninsula-waterfalls/cascade-falls/index.html`; 44th curated record in `data/up-waterfalls.json`; 44th fully functional hub card with parking/trail text and save action; ItemList count 42 qualifying guide destinations; entry in `public/sitemap-up-waterfalls.xml` (already discovered by both `robots.txt` and `sitemap-index.xml`); ledger #67 reconciled; regression test appended to `tests/up-waterfall-reconciliation.test.js`. No changes to other waterfall guides, advertising config, global canonicals or unrelated tools.

**Inventory checkpoint:** 44 curated destinations; 161 state GIS candidates; 36 exact ID matches, 125 candidate IDs still pending individual reconciliation; eight curated destinations without exact GIS ID matches. These 125 are **not** 125 unique newly identified waterfalls.

**Remaining gates:** independent GitHub CI on final SHA (including whole-repo verify), waterfall mobile/desktop browser smoke, static output audit and actual deployment checks. Hold merge if failed or missing. No same-day road status or winter driving availability claimed. Bonanza/Greenwood remains research-only until land/parcel legal approach is established. Three Menominee River drafted guides remain gated by exact source location verification.

### CI disposition and duplicate-ledger correction

On initial Cascade head `e990b6a`, [Agent branch verification run 40770979212](https://github.com/izworskic/chrisizworski-com/actions/runs/40770979212) failed 3 of 59 stages. Its `test` stage had two additional assertions that froze the previous 43-curated / 41-indexable snapshot in `tests/up-waterfalls-issue1258-b03a.test.js`; these are now corrected to assert a minimum retained baseline while deriving current totals from the committed inventory and schema. The repository's original `data/up-waterfall-inventory-ledger.json` (161 geographic features + eight no-ID curated entries = 169 entries) was also updated with Cascade, and a cross-ledger consistency regression now rejects divergent source links/totals. At the latest scoped check: **44 curated / 36 exact GIS matches / 125 unresolved / 42 eligible ItemList and sitemap entries; zero cross-ledger mismatches**.

The same failed run also reported **unrelated** blockers: Michigan Winter Weekend Getaways static base count (12 expected, 0 found), 11 SERP-length title/description overruns on other tools, and four older sitemap lastmod discrepancies (Soo Locks, fall-color, ship watching, freighters). These do not arise from Cascade content and are not changed here under the scoped waterfall-only instruction. The waterfall browser smoke and Vercel preview checks succeeded on that initial head. **Do not merge while full repository qualification remains red**; inspect the latest head, report exact-source status and keep PR in draft.

## Batch 06 — Bonanza/Greenwood Falls municipal access versus private waterfall parcel (October 28, 2026)

**Evidence and decision:** The state GIS #124 waterfall coordinate (46.818863, -89.571458) and Western U.P. waterfall brochure reference (46.817719, -89.570023) are about **168 m** apart. Point-in-polygon lookups against MTU's hosted Ontonagon County parcel layer attribute the former to a nonmunicipal LLC parcel and the latter to a Carp Lake Township parcel. Ontonagon County expressly cautions GIS parcel maps cannot establish legal ownership/title or public rights of way.

**Important new land-manager proof:** Carp Lake Township's own minutes document that Bonanza is a *seasonally managed township visitor site*, with authorized signage investment (June 25, 2025), entrance placement/parking and vehicle-restriction planning (August 20), facilities, fall closure anticipated by weather (October 15), and closed winter status in December 2025 until spring 2026. These verify that the township manages a signed seasonal visitor arrival. They do **not** prove the full footpath to the GIS falls pin is public, or establish current 2026 park opening/closure.

**Implementation:** Added `public/assets/up-waterfall-access-reviews.json` with source-linked research status; updated `public/assets/up-waterfalls-research.js` to load those optional reviews only when visitors opt into the GIS research overlay. Bonanza's popup explains the two distinct mapped parcels and directs visitors to official sources without offering a waterfall-point vehicle route. Both waterfall ledgers document the finding with classification, ownership labels and explicit non-promotion. Expanded `tests/up-waterfall-reconciliation.test.js` and the source-gate methodology.

**Release state:** Bonanza remains research-only; public indexable guides added **0** in this batch. Existing 44 curated destinations, 161 GIS candidates, 36 exact matches and 125 unreconciled source IDs unchanged. All prior visitor-facing cards, ads, canonicals and park content unchanged. 2026 current operating status not verified. Test/CI, preview and review must requalify the **latest exact branch SHA** before merging draft PR #1268. Preserve old and new checks; address unrelated repository benchmark failures separately rather than contaminating the waterfall scope.

**Next defensible qualifying investment:** Obtain a source-backed path from the township's marked lot to the *municipally approved river viewing area*, with route/parcel geometry and current published seasonal operating rule. Only then promote a visitor guide, keeping the natural falls GIS point and visitor arrival as distinct coordinates. If not obtainable, maintain this source-rich research-only record rather than inventing access.

## Batch 07 — Bonanza / Greenwood Falls township upper-falls visitor guide (October 28, 2026)

**Route verified within publication scope:** The township's *current* public Parks & Facilities page explicitly lists Greenwoods (Bonanza Falls) as a park with falls, links a Google Maps park destination near the M-64 entrance (46.8176942,-89.5674561), and Carp Lake Township 2025 minutes substantiate signed parking and seasonal operations. The independent Waterfalls of the Keweenaw description says to park in the lot and follow the short direct path to the **upper falls**. The Western U.P. brochure's separate near-river reference (46.817719,-89.570023) also intersects the township's recorded parcel 03-113-002-30. Sampled points between the published destination and that river-side reference returned the same township parcel. This is enough to document the **signed township upper-view park visit**, not the exact as-built path coordinates.

**Location constraint:** Michigan GIS #124 falls on a separately attributed nonmunicipal parcel about 168 m from the regional reference. American Whitewater describes upper and lower Bonanza drops, explaining why a natural falls catalog point and the public upper viewing approach may diverge. Do not equate all drops with municipal access. No authoritative walkway/easement supports an itinerary extending downstream, and no public route polyline or precise lot pin was fabricated.

**Implementation:** New `public/upper-peninsula-waterfalls/bonanza-falls/index.html`, 45th curated waterfall record, 45th complete hub card with save/arrival actions, ItemList now 43 eligible destinations, waterfall sitemap entry, both synchronized 161-source ledgers (#124 now exact-ID reconciled), and a three-reference Leaflet viewer on the detail page (township-linked park map destination, regional upper-view reference, and separate geographic waterfall point). The research access-review JSON preserves source details, restricted downstream scope and historical seasonal warnings. Automated source/route guards and mobile browser smoke were updated. No AdSense config, existing guide, generic SEO, or other tools altered.

**New snapshot:** 45 curated destinations, 161 named GIS features, 37 exact GIS links and **124 remaining non-matched GIS IDs**, plus eight curated without exact GIS IDs. The 124 unresolved IDs are not 124 distinct safe new visitor guides.

**Release gates:** exact commit Node waterfall tests; whole-repo workflow; mobile/desktop Chrome three-marker functionality and route disclaimer; Vercel branch; merge only if required gates pass. At present, park's **2026 open/closed status cannot be claimed** from the 2025 closure records. Distinct ownership-label GIS is not legal title/easement verification.
