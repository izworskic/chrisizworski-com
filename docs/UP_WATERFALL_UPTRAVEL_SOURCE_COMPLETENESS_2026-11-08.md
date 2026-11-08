# U.P. Waterfall Evidence Atlas: UP Travel Source Completeness Pass
**Reviewed:** November 8, 2026  
**Owning site:** `izworskic/chrisizworski-com`  
**Existing experience:** `/upper-peninsula-waterfalls/atlas/` (noindex research page)  
**Purpose:** Significantly improve name/source URL coverage and distinguish geographic discovery from visitor access, without misrepresenting a tourism listing as a natural waterfall, a parking lot, or an approved trail.

## Results and scope

Previous release: **544 total source observations** (80 curated waterfall/closure/research guides, 161 Michigan GIS features, 291 independent names, 12 UP Travel first-page cards).

This source-completeness release uses **UP Travel's own indexed listing URLs**, comparing two public website-index observations:
1. Waterfall-topic indexed listing search: **107 URLs**.
2. Broader site-wide listing URL filter for waterfall/falls/rapids/dams/byways and related words: **149 URLs**.

All 107 topical URLs appear in the broad list. One additional source URL in the broad list, **Black River National Scenic Byway**, was *also directly observed in the main waterfall directory's first 12 cards*; preserve it as a related outing corridor, not another waterfall.

| Audited unit | Count | Meaning |
|---|---:|---|
| Broader indexed site listing URLs | **149** | URLs with relevant name/path terms across the whole tourism site; includes businesses and unrelated assets |
| Waterfall-topic indexed URLs | **107** | Indexed topic search results, *not proof of live waterfall-directory category membership* |
| Additional first-page card URL | **1** | The Black River scenic byway; verified first-page listing, not a waterfall |
| Source URLs retained in atlas | **108** | Researchable candidates only, **not** distinct natural falls |
| Named-waterfall subject URLs | **91** | URL topic suggests a waterfall; feature and access still require independent proof |
| Related parks, trail, dams or services | **17** | Kept with clear label but **never** counted as another distinct waterfall |
| Broad URL matches excluded from atlas | **41** | Unrelated motel, brewery, shops, road/dam/rapids names and other keyword false positives |
| Source entries with directory-card identity and town/road labels actually observed | **12** | Confirmed first-page card *location strings*, never parking directions |
| First-page curated-guide associations from preceding audit | **4** | Previously reviewed explicit connections (not all represent unique natural falls) |
| Other exact same-name candidates among 108 | **77** | Candidate match to independent name, state GIS name or existing guide; **NOT identity verification** |
| Without any exact name candidate | **27** | **13 waterfall-named URLs + 14 related places**; many require alias/identity review |
| Atlas after update | **640 source records** | 80 + 161 + 291 + 108; **not 640 distinct waterfalls** |
| Source-only records with no point | **399** | All 291 independent names + all 108 UP Travel indexed source records remain `lat/lng=null` |

### Why 108 is not 104, and 104 is not 300+
UP Travel's main waterfall directory shows regional filter counts **Eastern 1 + Central 39 + Western 64 = 104**. The site's editorial text estimates **300+ waterfalls across the Upper Peninsula**. The 104 is an observed *directory category/card count*, and the 300+ is a region-wide waterfall estimate. Our 108 records are **indexed URLs from across the site**, **not a successful scrape of all 104 directory cards**. The 107 topical search may include historical listings and related parks/trails not included in that current directory. Only the first 12 have confirmed directory-card membership in this snapshot. A page title inferred from a URL slug is not silently promoted to confirmed original H1 content.

*Therefore the site directory's full 104-row membership is still not independently enumerated.* The correct claim is improved **indexed source-URL coverage**, not complete actual directory pagination. The index is a dated, human-reviewable research snapshot, not a live provider API feed.

## Reconciliation design and scientific boundaries

**Versioned raw audit source:** `data/up-waterfall-uptravel-indexed-listings-2026.json`. Contains all 149 indexed URLs, stable source numeric listing ID, original direct page URL, URL-derived provisional display names, whether the topical search returned the URL, explicit role (`waterfall-named-listing`, `related-place-or-activity`, `other-keyword-page`), a boolean controlling atlas inclusion and exactly 12 verified first-page road/town records from `data/up-waterfall-uptravel-location-review-2026.json`. The 41 excluded entries remain traceable in this offline source register.

**Python reconciliation:** `scripts/build-up-waterfall-evidence-atlas.py --write|--check|--summary`, with `schemaVersion: 2`. Offline standard-library output `public/assets/up-waterfall-evidence-atlas.json`. The index is joined to the site catalog **by exact normalized name as a research candidate**, separately from the pre-existing, verified GIS-object-ID joins and the four previously reviewed first-page guide connections. A same-name candidate is not a confirmed geographic identity, approved location, parking point or duplicate destination. Candidate county names from GIS and independent source records are explicitly marked as *same-name hints only*, not verified UP Travel listing counties.

The visitor-facing `/upper-peninsula-waterfalls/atlas/` remains **noindex,follow**, with its canonical and Person ID unchanged. The main waterfall visitor planner's eighty curated records, source access gates, map, shortlist, canonical, ads, original approved guides and sitemap are untouched. Site-index URLs do not enter the sitemap and can never create a new visitor navigation pin.

### Important source identity traps

- **Alger Falls** is an indexed attraction name with earlier highway intersection text, but adopted City/County recreation plans say there is no safe parking at M-28/M-94. A GIS name match is not permission to park or cross the road.
- **Au Train Falls** appears in older tourism coverage. FERC 2025 license termination, 2026 EGLE emergency dam order and changed recreation access invalidate the assumption that historic tourist directions are current.
- **Paul's Falls** appears in indexed URL 5417; specialist field history ties the Sante River feature to the older name of Löytilä Falls near Toivola. Keep the source-name record unmapped; do not invent parking from the waterfall's natural point or the older Copper Harbor editorial phrasing.
- **Black River National Scenic Byway** is one tourist itinerary linking multiple Gogebic falls. The separate tourism **Black River Falls near Ishpeming** is not the same as a Gogebic scenic fall; never merge them on a substring.
- **Hungarian Falls** is an umbrella name for several documented tiers; **Munising Falls (Temporarily Closed)** corresponds to an existing closure, not a new available trip. **Powderhorn Falls** versus GIS *Powder Horn Falls* and **Greenwood/Bonanza Falls** require alias review, not speculative new pins.
- **Bulldog Falls**, **Big Pup Creek Falls**, **Forty Foot Falls**, **Falls River Falls**, **Siskiwit Falls on Isle Royale**, **Rudolph Olson Memorial Falls**, and **Unnamed Falls on Pinkerton Creek** are source-discovery priorities. No current end-to-end public arrival was approved by this project. UP Travel explicitly describes Bulldog as a remote McCormick Wilderness outing; even a public-wilderness setting does not establish a surveyed trip.
- An exact map coordinate for any Michigan state GIS feature marks **the natural waterfall**, not an authorized parking lot. A tourism road or city label remains a text citation only.

## Visitor interaction

The atlas now describes source scope at the top: **149 candidate links, 41 excluded, 91 waterfall-named URL pages, 17 related places, only 12 confirmed directory cards**. In the source workbench, choose `UP Travel index (108)` and search. Each indexed record shows:
- Stable UP Travel listing ID, original **direct listing URL**, name provenance (directory card or source-owned URL slug), full category-membership uncertainty, and role as fall or related facility.
- Road/town text only for the 12 actually observed cards, always flagged as not parking.
- Existing verified guide links only when previously reviewed; exact-name matches to a site guide are separately labelled **unverified identity**.
- Same-name state GIS candidate IDs and source county hints as *namesake evidence*; the visitor can inspect a GIS record. Only this deliberate comparison makes the state natural-feature position appear on the map, labelled **not parking and not a route**.
- When no geographic source exists, no map point is created.

No auto lookup from a city to latitude/longitude, no new live upstream API, no Redis, Supabase, credential or external image copying. The visitor must continue to use the separately governed waterfall planner to arrange real visits.

## Architecture alternatives

**A. Convert 104 search listings to automatic waterfall guides/pins. Rejected:** the source has incomplete category membership and uncertain access, and unrelated entities would become tourist destinations.

**B. Add upstream indexed URL source register, exact normalized candidate comparison and a versioned Python precomputed atlas. Chosen:** reliable, low operating cost, reproducible, no invasive changes to existing waterfall trip logic.

**C. Scrape Simpleview dynamic listing APIs at runtime, geocode listing addresses and route visitors. Rejected:** currently unverified API endpoints/rights, category membership, and roadway/parcel access. No user location collection or recurring provider load justified.

## Automated acceptance and release evidence

Tests check all 149 raw URLs, 107 topical hits, 108 included records, 41 irrelevant exclusions, 91/17 roles, exact 12 first-page confirmations, metadata and unique listing ID, 640 total atlas records, 399 no-point observations, strict source roles, Python `--check` regeneration, noindex/sitemap boundaries and the original eighty curated guides.

Chromium browser suite at **360, 390, 768 and 1440 px** exercises 640 loading, 108 source filter, Alger direct source and GIS comparison, Paul's missing point, a waterfall-named service (Bond Falls Outpost) correctly labelled as related, exclusion of Alger Falls Motel, reversible filters and offline 503 handling. Compare screenshots and actual map marker behavior, not only JSON.

**Release stages:** PR/commit, exact-head workflow checks, Vercel status, and public actual URL verification must be recorded separately. This test suite does not establish actual visitor outcome, route permission, real-time opening or Google search traffic lift.

### Next genuine completeness threshold

To assert **full directory completeness**, independently enumerate the currently visible **all-104 waterfall-category listing IDs** through a working officially accessible pagination/export source, cross-check with the 149 URL audit, record additions/removals on a dated snapshot, inspect any missing listing titles and town/road strings, and revalidate category membership. If that source cannot be obtained online, retain `PARTIAL` and do not guess the missing pages. To promote any research-only waterfall to the trip-planning map, require an independent lawful parking-to-viewpoint route, land authority, official trail and current restriction review.

**Source references:** [UP Travel main directory](https://www.uptravel.com/outdoors-recreation/waterfalls/) · [UP Travel pet-friendly waterfall story](https://www.uptravel.com/blog/post/nine-pet-friendly-waterfalls/) · [Siskiwit source listing](https://www.uptravel.com/listing/siskiwit-falls/3701/) · [Michigan GIS Waterfalls MapServer](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7).
