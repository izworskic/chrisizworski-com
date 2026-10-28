# Porcupine Mountains Explorer — access-aware Circle Tour prototype

**Date:** October 28, 2026. **Status:** Noindex working prototype, not a certified navigation or trail-routing release. GitHub research issue #1253.

## One differentiated visitor promise

Given **entry direction**, **visit date**, **2/4/8-hour or two-day budget**, **walking ability**, and **primary interest**, the tool proposes a conservative visit to one or more geographically distinct Porkies districts. It explains why some combinations should be omitted and clearly labels what has **not** been verified. It does not provide invented driving ETAs or walking-route distances. This is a deliberately narrower but truthful first release than a simulated GIS-based route engine.

## Real implementation

- Static-first photo-led HTML: public/porcupine-mountains/index.html
- Editorial responsive CSS: public/assets/porkies-explorer.css
- Pure testable date/ability/season/time recommendation engine with browser UI: public/assets/porkies-explorer.js
- Automated Node regression and source assertions: tests/porkies-explorer.test.js
- Canonical is reserved as /porcupine-mountains/ but the prototype uses **noindex,follow** until the data and visual release gates pass.
- No advertising configuration, existing fall-color canonical, waterfall canonical, or API contracts changed.
- New photographs: existing local site’s Commons-licensed Stevenliuyi Lake of the Clouds image, Manabezho Falls by Gittinsj CC BY-SA 3.0, and view near Summit Peak by daveynin CC BY 4.0 (photographed July 18, 2026). Each appears with source and license credit. These photographs are archival and not current-condition evidence.

## Sources reviewed

1. DNR official park page and management summary: https://www.michigan.gov/recsearch/parks/porkies
2. DNR 2025 visitor guide: https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf
3. DNR official park map, with scenic-area insets, entry corridors, crossings and reference trail distances: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf
4. GPS map dated July 14, 2025: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf
5. DNR GIS: https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/2
6. DNR temporary closure layer: https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/0
7. DNR designated wilderness: https://www.michigan.gov/en/dnr/places/natural-areas/porcupine-mountains
8. DNR closures: https://www.michigan.gov/dnr/about/newsroom/closures
9. DNR Ski the Porkies: https://www.michigan.gov/skitheporkies/the-mountain/trail-and-snow-report

## GIS extraction and safety gate

2026-10-28 ArcGIS feature-layer queries with where FacilityName='Porcupine Mountains Wilderness State Park' yield **819** line segments, **22** distinct TrailNamePrimary values, **819** administratively marked Open. Some GIS named aggregates differ substantially from the DNR printed map:

| Named GIS trail | Sum of SegmentLengthMiles | DNR park map reference |
|---|---:|---:|
| Escarpment | 0.42887613 miles / 24 segments | 3.7 miles |
| Lake Superior | 9.61265830 / 126 | 15.6 |
| Government Peak | 4.02700487 / 3 | 6.4 |
| North Mirror Lake | 3.85869002 / 63 | 3.5 |
| North Country Trail | 32.11535946 / 331 | overlapping network; not a distinct attraction |

Actual GeoJSON geometry with WGS84 coordinates was retrieved for sample Escarpment Trail features, confirming access to real feature geometry. **The entire topology was not ingested, repaired or checked**. Name-summed GIS mileage must not be used to generate visitor route distances. A source 'Open' attribute does not constitute today’s trail safety or accessible condition.

Separate county-level closure-layer search returned three motorized snowmobile/ORV records near Ontonagon/Gogebic; none proved a Porkies hiking route closure. Do not infer there are no closures.

### Access logic

- Seasonal DNR guidance: portions of M-107 and South Boundary Road close to vehicle travel December 1 until late spring; spring re-opening is unknown unless confirmed.
- The prototype conservatively withholds summer sightseeing road itineraries in December–April and during May's unresolved reopening period, and links to the official eastern winter-sports option without asserting an opening.
- Presque Isle river/waterfalls has separate western County Road 519 access. The accessible Nawadaha observation platform does **not** prove the whole West/East River loop is barrier free.
- Lake of the Clouds: approximately 100-yard paved/boardwalk approach, separate from strenuous escarpment hiking. DNR recommends dropping trailers/campers at the middle ski hill parking in busy summer/fall.
- Summit Peak: approximately half-mile approach and additional tower stair climb, not a step-free outing.
- Never treat this as a drive-time optimized route without official road and parking coordinates.

## Required next quality investments before indexability / merge

1. Paginated GIS geometry import, source ID crosswalk, topology repair and overlap reconciliation against official DNR GPS/park maps.
2. Source-backed **parking entrance** inventory with individual GPS parking geometry, legal visitor approach and winter road graph; actual drive and walking time testing. Current visual has honest west/central/east schematic, not simulated CARTO routing.
3. Real mobile + desktop rendered capture (390×844, 1366×900), authenticated image delivery and thumbnail/credit validation, no-JS accessibility, keyboard behavior and any ad overlap; follow FIELD_GUIDE_V1.
4. Run full site \`npm run verify:all\` on complete git history and settle any failures. Confirm source/date/sitemap/SEO governance. Promotion from noindex requires an explicit positive decision with evidence; route stays noindex in this prototype.
5. Connect the Circle Tour stop card to this guide only when source and release gates pass, and register the public tool /tools + registry together when indexable.
6. GSC/GA: no comparable new usage data. Track planner completions in aggregate by time-budget and arrival category without exact visitor location. No forecast of ranking uplift.

**Next engineering action:** Export the full 819 GIS features as GeoJSON in controlled paginated batches, snap/inspect endpoint topology, reconcile NCT overlapping names, then verify DNR parking entrance points before enabling an actual routing map.
## Completed real GIS export and integrity audit — October 28, 2026

GitHub Action [Porkies DNR geographic source audit, run #40676754962](https://github.com/izworskic/chrisizworski-com/actions/runs/40676754962) **succeeded**. Its retained `porkies-dnr-gis-research` artifact contains all 819 source features as WGS84 GeoJSON, all 16 regional DNR parking-asset points, and a structured per-name/source audit. It is a private GitHub Actions artifact, not public page content. Source script: `scripts/research-porkies-gis.mjs`. The source can be revalidated with the manually dispatched workflow `.github/workflows/porkies-dnr-source-audit.yml`.

Direct pipeline results: **819/819** line geometries extracted; **22** name categories; **819** administrative Open labels; **16** DNR parking-asset points in research bounding box; **782** endpoint buckets at approximate 10-meter coordinate tolerance; **41** endpoint buckets appearing once. The single-endpoint buckets include potential real trail termini and cannot all be called gaps. Geometry length checks corroborate that individual named GIS fragments are incomplete compared with map trail definitions: Escarpment **0.428** geometry miles vs **3.7** published miles; Government Peak **4.018** vs **6.4**; Lake Superior **9.596** vs **15.6**. Attribution of discrepancy to North Country Trail overlap or other missing pieces is **unproven** and requires geometric review.

Parking points are DNR-owned/managed **asset inventory**, not individually named, signed or operationally confirmed day-use trailheads. They are intentionally held out of the public map/Google directions; no guess based on point proximity is acceptable. This satisfies the raw-data extraction research investment but **does not** clear route, accessible-approach, road or hiking-time gates.

Browser visual and interactive QA: `scripts/verify-porkies-browser.cjs`, workflow `.github/workflows/porkies-browser-qa.yml`, checks 340px, 390px and desktop, real photographs, click-through planning, winter/May exclusions, and no-JS utility. Retain screenshots and machine report from Actions as proof of measured UX; do not claim pass until its run is green.
