# Evidence Atlas: Upper Peninsula waterfall names, maps and visitor authority
**Experience OS v1.2.1 + Python Intelligence OS v1.0 / November 8, 2026**

## Owner, problem and baseline
Owning repository: `izworskic/chrisizworski-com`. Existing visitor page: `/upper-peninsula-waterfalls/`, 80 curated destination records, 161 Michigan state GIS natural-feature candidates with 69 explicit GIS-ID links, 291 independent name-only observations, 12 individually recorded tourism-directory location labels. These datasets overlap; **544 source observations are not 544 distinct waterfalls**.

User asks: “What waterfalls have been named or mapped in the U.P.? Why can't I find a given waterfall in the verified visitor planner? Which source supports the name or exact natural-feature point, and what is still unknown?” The existing visitor explorer deliberately omits many risky/unknown access sites; the raw offline name register is not searchable by visitors.

## Competing concepts (2026-11-08)
**A. Add all records as new public pins/cards to existing visitor map. Rejected.** It would turn tourism road labels into guessed parking and data-directory names into precise coordinates; break the visitor map's safe arrival semantics; conflate 80/161/291; create map crowding and SEO duplicates.

**B. Separate source-evidence workbench linked from existing hub. Chosen.** Dedicated noindex research URL with four source classes, source date and authority, reversible name/county/source filters, natural-feature-only map for real GIS/curated point evidence and an inspection panel. Name-only/tourism records have null coordinates by construction. Source-only name labels link to their original source, not a visitor route; curated guide links remain distinguished from a claim that access is open now.

**C. New live Python service joining GIS and tourism addresses on each request. Rejected.** All input is a dated static snapshot; a live Python function would increase cost and freshness ambiguity without improved evidence. Use a reproducible Python stdlib precompute/check, static JSON, accessible HTML and client JS.

## Distinctiveness vs comparable site experiences
- Compared with the **U.P. Waterfall Explorer**, the atlas does **not** ask visitors how far to hike or which falls to choose. The first-screen question is what can be established from the historical geographic sources. The main planner's destinations, access gates, basemap, shortlist and canonical stay unchanged.
- Compared with the site's **Great Lakes freighter map** and **rocket launch live tools**, the atlas does not claim live positions or event status. Its four-source classification and "no pin when evidence has no position" are the core visual/interaction identity.
- Reuse only licensed keyed CARTO + fall back to OSM, accessible labels, search/reset/list controls, safe source links, no ads changes.

## Source register, evidence units and rights
| Input | Owner and explicit reviewed snapshot | Spatial meaning | Permission/limitation |
|---|---|---|---|
| `data/up-waterfalls.json` | Site-maintained 80 curated records (Nov 2026) | Natural waterfall or existing planner coordinate | Existing visitor guide is not a live opening notice; status may be closed, partial or research-only |
| `data/up-waterfall-reconciliation.json` | State of Michigan GIS Waterfalls layer 7, retrieved 2026-10-26 | Natural-feature point, not parking | 161 research features, 69 explicit link IDs; no access rights from point |
| `data/up-waterfall-external-identity-shorelinescout.json` | Existing independent name/county/river/source-URL factual observations, retrieved 2026-11-07 | **None**: names-only without coordinates | No copied images, descriptions, specialist GPS or visitor paths; source directory observation is not identity/access proof |
| `data/up-waterfall-uptravel-location-review-2026.json` | UP Travel public tourism first-12 listing record snapshot, 2026-11-08 | Road/town orientation strings, not GPS | No geocoding; does not claim all ~104 directory cards or 300+ waterfalls were extracted |

Original sources: <https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7>, <https://shorelinescout.com/michigan/waterfalls/upper-peninsula/>, <https://www.uptravel.com/outdoors-recreation/waterfalls/>. Only cited factual names, county, watercourse and existing snapshot metadata are used. No automated refresh or new upstream downloads. If rights for additional data aren't established, do not incorporate them.

## Data contract and tests
Output `public/assets/up-waterfall-evidence-atlas.json`, schemaVersion 1, produced by `python3 scripts/build-up-waterfall-evidence-atlas.py --write`. `--check` reconstructs the full artifact from the four source families and existing reconciler, compares semantic equality, and fails on mismatches. It never promotes destination access.

Record IDs: `guide:<site-id>`, `gis:<object-id>`, `name:ss:<source-id>`, `tourism:<1-12>`. Each record has provenance, source date and evidence role. GIS joins to guides **only** using existing curated GIS object IDs. External name matches and possible alias hints retain their own status; never become confirmed geographic joins. Multiple-county planner locations have no single inferred county.

Hard invariants:
1. `name` and `tourism` always `lat=null, lng=null`, even when their display text contains roads or county names.
2. `guide` and `gis` point positions are within the U.P. geographic screen; all coordinates are **natural-feature-only**.
3. Identifiers and names are unique source *records*, not unique falls; no source-count summing for physical destination claims.
4. A legitimate guide/closure/research status is preserved; no "OPEN" or current flow inference.
5. The new URL stays **noindex,follow**, self-canonical with the existing Person ID, omitted from sitemap; linked within the main waterfall page's research and quick navigation.
6. Failure to load atlas JSON, keyed CARTO/OSM tiles or JS leaves ordinary waterfall source explanations, a direct trip-planner link and no guessed fallback coordinates.

## Interaction and failure state matrix
| State | Visitor changes | Result | Map |
|---|---|---|---|
| Default | Opens atlas | 544 source observations, first 30 with explicit family labels; load-more in blocks of 30 | State GIS + nonduplicated curated feature positions; no names-only pins |
| County + GIS | Filters to Marquette or Iron | List and map narrow to exact county-tagged GIS records | Natural-feature coordinates only |
| Name-only + Paul's | Selects independent names; types Paul's | Name and Houghton county provenance, original source link, no invented hiking arrival | Zero pin for that name |
| Tourism + Alger | Selects UP Travel sample; Alger | Town and road labels explicitly NOT verified parking; links to source | Zero tourism pin |
| Guide + Tahquamenon | Searches existing curated guide | Existing multi-falls planner, source date, linked GIS 207 and 208, link to actual guide | Natural-feature point, never legal parking |
| Search A → B → reset | Rapidly changes filters | Stable counts/record identity; reset restores 544 | Map and inspection state reconcile |
| Source 503 or schema mismatch | Atlas unavailable | Fail-closed error; main waterfall planner still linked | Map withheld |
| Keyed CARTO config unavailable | No key / offline | OSM fallback, or readable list if tiles fail | No blank false-live-status claim |

## Acceptance, measurement, rollback
Reproducible unit tests: 544 source records, 80 curated, 161 GIS, 291 names, 12 tourism, 303 records without a mapped position, unique IDs, existing 69 official GIS-to-guide links, Python --check, noindex+sitemap, deliberately no Google Maps "navigate" from raw points. Waterfall Chromium CI extends 390px mobile, desktop, filters and reversibility, original source links, map-only roles and offline 503. Use existing full `npm run verify:all`, waterfall browser smoke, name-SERP CI, actual build audit, and production HTTP inspection. Measure filter completion and original-source clicks only with privacy-compliant existing analytics; **no claimed increase to CTR, GSC impressions or clicks** before comparison of matched 28-day windows.

Rollback: revert this one PR to remove atlas HTML/assets, test and hub link; existing curated explorer and its GIS opt-in layer are unchanged. No database, Redis, Supabase, serverless endpoint, credential or added recurring network usage.
