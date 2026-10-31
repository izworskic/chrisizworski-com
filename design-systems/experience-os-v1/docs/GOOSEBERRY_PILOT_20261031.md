# Gooseberry Falls — Experience OS V1.2 delivery lessons

**Park:** Gooseberry Falls State Park, Minnesota · **date reviewed:** October 31, 2026 · **owning repo:** `izworskic/chrisizworski-com` · **canonical:** https://chrisizworski.com/gooseberry-falls/

**Release evidence:** Main visitor planner [PR #1332](https://github.com/izworskic/chrisizworski-com/pull/1332) (merged at `22f7d250b691b590b84d36ae5270784216caab90`); live raster map correction [PR #1334](https://github.com/izworskic/chrisizworski-com/pull/1334) (merged `4aa31254614bafc7a2e9dd24d91c49bb98dd1699`); discoverability [PR #1339](https://github.com/izworskic/chrisizworski-com/pull/1339) (merged `e50b3730bc5dbac32c0c3f063321c055a2621f98`). [Responsive Chromium with image-load verification](https://github.com/izworskic/chrisizworski-com/actions/runs/41242249813); [catalog integration/complete repo gate](https://github.com/izworskic/chrisizworski-com/actions/runs/41243737917). No controlled visitor-outcome measurement.

## Why the tool was different

**Visitor problem:** A Circle Tour road-tripper has 30, 60 or 90 minutes, perhaps needs an accessible approach or is traveling in snow, and must decide which falls they can reasonably see. Their question is **not** a generic map of every trail and not simply how much water is flowing.

Primary Minnesota DNR reference: https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html . Typical Upper/Middle walk 30–45 minutes, with a switchback alternative to the stairs; Upper/Middle/Lower loop 45–90 minutes and is not ADA accessible. In winter the walking route to Upper Falls is maintained, not the full three-falls loop. Other DNR references and official summer/winter park maps are linked in the [Gooseberry project brief](../../../docs/experience-briefs/gooseberry-falls-2026-10-31.md).

The USGS Gooseberry River location (04015140) does not supply continuous discharge readings, so the design did **not** claim a live Gooseberry flow sensor. A regional NWS forecast was integrated only as weather context. Local trail access remained explicitly unverified and linked to DNR park notices. No forecast or SHT-area hazard report was allowed to become a blanket park closure.

## Real failures, correction and confirmed evidence

| Initial issue / missing proof | Correction | Transferable requirement |
| --- | --- | --- |
| The first one-hour default chose a 45–90-minute full three-falls loop, a weak match for 60 minutes. | Changed engine, no-JS initial answer and regression tests: 60 minutes → shorter 30–45-minute Upper/Middle walk, 90 minutes → longer loop. | **P19 Conservative time-budget matching:** minimum feasible time is not an adequate recommendation when the visitor has no margin. |
| The Circle Tour entry described all falls as accessible on paved trail and linked the wrong DNR park ID. | Corrected the original stop's accessibility copy and official URL, then added the dedicated planner link. | A new detail page must fix inaccurate source-entry claims and use official access evidence before a discovery handoff. |
| Initial Experience OS browser tests passed using mocked CARTO/OSM raster fixtures, but independent **public** smoke showed a map fallback. | Investigated real raster endpoints; removed unnecessary display-only CORS tile mode and stopped abandoning the entire layer after two failures. Retained honest official-map fallback. Follow-up [PR #1334](https://github.com/izworskic/chrisizworski-com/pull/1334) passed tests and live smoke then observed **six loaded CARTO tiles**. | **P20 Fixture and real provider dual verification:** test real image load / tile render after deploying, not only API 200 or a green fixture. |
| First full repository gate failed due to a 79-character SEO title and 210-character description, above existing 60/158 limits. | Reduced title to 56 and description to 155 and reran full gate. | Browser-ready ≠ SEO-ready; run existing site title/description and canonicals before PR approval. |
| Screenshot test initially captured below-the-fold images before they loaded. | Scrolled images into view, required actual naturalWidth and four linked credits, then inspected the mobile screenshots. | **P21 Lazy media proof:** a screenshot with an empty image slot is not a verified visual asset. |
| The visitor page launched before a Tools card, sitemap and registry entry were complete. | Added a separate discovery PR with one card, a matching JSON-LD ItemList node, a sitemap entry and directed tool-graph relationships. | **P22 Discovery as a single release contract:** include all indexing and catalog surfaces in the first PR when possible. |
| Discovery PR first passed its custom test but failed the repository-wide entity auditor: the new JSON-LD item was appended rather than placed alongside the matching card; `numberOfItems` was still 86 after introducing the 87th card. | Reordered the ItemList and fixed `numberOfItems`, then reran the 59-step repo gate, public HTML audit and Vercel preview; live Tools card and sitemap both independently confirmed. | **P23 Visible-order parity:** JSON-LD ItemList *cardinality, ordering and IDs* must agree with the visible directory; not merely contain the URL. |

## Positive strengths to retain

- **One focused decision**, with time, step-free preference, user-specified snow conditions and interest changing a meaningful recommendation.
- **Five real licensed/credited destination images**, with contextual woodland photo explicitly not labeled as Fifth Falls. Archived photography never implies today's access.
- **HTML-first answer**, shareable state, no-JS path and official DNR map/source links.
- **Orientation points only**, no invented navigable GPX trail lines, no implied GPS-verified parking stalls.
- **Conservative unknown states**: on an unavailable NWS feed, no live weather is displayed; on map failure, a small source-linked fallback remains.
- **Real browser testing** at 360, 390, 768 and 1440 px, with map-tile fixture cases, no-JS, loaded photo and fallback checks.
- **Separate delivery proofs**: branch implementation, verified CI/browser, Vercel READY, independent public content/maps, and **NOT MEASURED** visitor/search outcomes.

## New generalized rules in V1.2.1

These findings extend the earlier Sleeping Giant and Tahquamenon lessons without imposing a unified page layout. The central package gains:
1. A machine-checked **release-evidence record** with explicit kind/subject capability boundaries. A forecast cannot claim park access and a monitoring page alone cannot claim observed flow.
2. A scaffold that writes **PENDING**, never success, and refuses to overwrite previous review artifacts.
3. Structural checks for source-file identity, catalog card/ItemList cardinality and ordering, sitemap, and registry when `--check-site` is applied.
4. Required two-sided evidence: browser fixture reliability **and** independent public smoke for provider-backed visuals; no one test substitutes for the other.
5. An evidence ledger that can be reviewed in the next conversation without depending on conversational memory.

**Release limits:** This is retrospective quality evidence. It does not establish present-day Gooseberry trail openings, hydrology or park parking supply. It does not establish CTR, conversion or satisfaction uplift. The source-only checker validates evidence structure, not its external truth.
