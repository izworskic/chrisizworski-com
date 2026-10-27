# Upper Peninsula Waterfall Inventory — provenance & promotion gate

Reviewed October 26, 2026.

## Spatial inputs

**Michigan state geographic waterfall layer:** https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7. REST GeoJSON extract: 197 waterfall and related features; 161 geographically valid named Upper Peninsula candidates remaining after omitting obvious rapids, dams and unnamed points. Source geographic object IDs and coordinates are retained separately in data/up-waterfall-geo-candidates.json. They have not been certified as publicly accessible.

**USGS Waterfalls and Rapids / NHD V2 (2020):** https://doi.org/10.5066/P9QQTKA0. Scientific USGS dataset lists 10,780 waterfall locations and 1,080 rapid locations. It is newer than the earlier 2016 release. The complete 8.57 MB GeoJSON was retrieved and processed on the GitHub Actions runner during PR #1216 (October 26, 2026). The source contains 11,860 national records; the regional bounding filter examined 332 records. An exact normalized-name match within 800 m of Michigan state GIS yielded 113 unique source links; one duplicate match was held as ambiguous. The USGS source did not provide county confirmation for these records (countyTaggedUP=0); all unmatched bounding-only points are excluded from the public map. Every match preserves original NHDPlusV2 COMID/reachcode and NHD HR reachcode in data/up-waterfall-usgs-v2-crosswalk.json. The public compact source is public/assets/up-waterfall-hydro-crosswalk.json, loaded ONLY when the user opts into geographic research. These are 113 source cross-references, not 113 new public visitor locations. No source identifier automatically promotes a page into the sitemap. Refresh through the manually dispatched 'On-demand USGS waterfall hydrography import' GitHub workflow; ordinary builds and merges do not download this source.

## Gate for independent public waterfall guides

Never infer parking, trail or public access from a GIS/USGS point. A waterfall becomes indexable only after five sourced checks: waterfall coordinates and identity; legal public approach and restrictions; land manager or trail-maintenance authority identified accurately; signed parking area or official trailhead; and established visitor trail/walking effort. Preserve source links and review date separately for each. For a documented closure, an indexable warning guide may be useful, but do not market it as an open destination.

The seven new field guides are Great Conglomerate, Potawatomi, Gorge, Sandstone, Rainbow, O Kun de Kun, and Nawadaha. The five Black River Falls carry the May 15, 2026 Forest Service restrictions at https://www.fs.usda.gov/r09/ottawa/alerts/black-river-waterfall-platforms-and-trails-undergoing-major-repairs . As published: Sandstone closed; Potawatomi and Gorge partially restricted; Rainbow listed open with later construction planned; Conglomerate caution on tread/stairs. Project may run through fall 2027. Never infer reopening.

O Kun de Kun uses NCTA published US-45 parking and trail route. Verify the underlying landowner/management boundary if parcel-level access rules become relevant. Nawadaha uses Michigan DNR Porcupine Mountains source, including its documented viewing platform.

First-wave review finished: 10 existing child guides carry the five-axis source records. Canyon Falls was promoted after the North Country Trail Peter Wolfe Chapter Seg. 58 guide identified Michigan Technological University ownership, Peter Wolfe Chapter maintenance, MDOT seasonal parking, and the signed public route. Scott Falls remains research-only and noindex due to unresolved legal/safe M-28 pedestrian access and falls-side land ownership. NCTA Canyon source: https://northcountrytrail.org/files/chapters/pwc/PWC_47-58_Mar2024.pdf (March 2024). Tahquamenon retains its existing canonical specialist tool; do not duplicate that page. Do not generate a public Houghton-Douglass Falls guide suggesting it is fully open: Michigan DNR reports the site's infrastructure remains in development and formal dedication occurs on completion.

## Acceptance

- State GIS candidates are map-reference-only, opt-in and unlinked to canonical pages.
- Each promoted waterfall's five cited evidence records and distinct HTML guide exist.
- Current construction notices are shown before trip recommendations.
- The indexable sitemap contains the hub and only verified visitor guides, including an informational closure guide for Munising. Noindex research guides remain visible to users but excluded from the waterfall sitemap.
- Full repository 59-step gate, protected-preview browser/mobile map, and release review are mandatory before merging this branch.

## USGS source crosswalk quality controls (October 26, 2026)

- Full source import must exceed 11,000 GeoJSON records; partial/cached web excerpts are refused.
- Name and geographic proximity must both match a Michigan state GIS waterfall, within 800 meters, uniquely in both directions. Same-name collisions/duplicate source records remain quarantined. Geographic distances are provenance checks, never navigation distances.
- USGS-derived stream-network data is shown in the opt-in research popup when available; no USGS match changes parking, trail, land authority, live-water claims, indexing status, canonical URLs, or the 20 curated visitor profiles.
- The 2020 USGS/NHD source is historical geographic data; USGS has transitioned from legacy NHD updates to 3DHP. Do not imply it measures current waterfall discharge.

## October 26 visitor guide extension

Three verified visitor guides added: Mosquito Falls (NPS Chapel/Mosquito trail, parking and no-pet restrictions), Elliot Falls (NPS east Miners Beach parking, stairs and shoreline route), Manido Falls (DNR Porcupine Mountains parking and signed river trails; state GIS feature 92 is named Mannido). No live access, flow or hydrological readings are inferred. Total curated 23; 21 indexable child pages, one Scott research-only noindex page and Tahquamenon retains its canonical specialist page. Curated GIS IDs are removed from the opt-in geography overlay so alternate spellings cannot create duplicate pins.

## Visitor-page expansion: Hungarian Falls and Fumee (October 26, 2026)

- **Upper Hungarian Falls (Michigan GIS 134):** Keweenaw Land Trust owns the upper 10-acre nature area and maintains public nonmotorized recreation. Signed public arrival is from Golf Course Road, Tamarack City, shoulder at 47.173159, -88.444743, followed by approximately 400 yards on the rough gated access drive on foot. Use the land-trust brochure and parking directions, not the waterfall pin as a drivable destination. Golf Course Road is largely unplowed in winter.
- **Lower Hungarian Falls (Michigan GIS 130):** The land-trust trail map distinguishes KLT upper land (yellow), Michigan DNR lower gorge land (blue), and private neighboring parcels. The downstream falls require a separate rugged gorge-walk decision; the brochure's roughly 2-mile figure is for traversing the full gorge, not a fabricated point-to-point walking distance. Parking remains at the same KLT-published roadside location. No cliff-edge or private-land shortcuts.
- **Fumee Falls (Michigan GIS 6):** MDOT byways materials identify the US-2 Fumee Falls Roadside Park and its visitor parking; a separate regional destination guide describes short stair/boardwalk viewing paths. MDOT October 15, 2026 season notice advises most roadside parks close October 29; the page warns to verify Fumee's specific gate instead of asserting live closure.
- All three promoted pages separately cite land manager, legal public approach, parking, walk/trail and geospatial waterfall point. The Keweenaw detail maps now show an additional *officially documented parking* marker distinct from the fall pin. No other waterfall gets a parking pin without an independently published location.
- The HTML-first indexable hub grows from 23 to 26 discovery destinations, with 24 sourced child guides; Scott Falls remains noindex and excluded from the structured ItemList and sitemap. All geography-only candidates and USGS crosswalk rows remain research-only. No new URLs are generated from geographic features without the five-axis gate.

Land manager sources: https://keweenawlandtrust.org/protected-lands/hungarian-falls-nature-area, https://keweenawlandtrust.org/sites/default/files/2019-11/Hungarian%20Falls%20Brochure_0.pdf, https://www.michigan.gov/documents/mdot/MI_BYWAYS_BOOK_558227_7.pdf, https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/10/15/mdot-roadside-parks-set-to-close-for-season.

## Rapid River Falls name collision and Delta County source gate (October 27, 2026)

- Added a full visitor guide for **Rapid River Falls (Delta County)** using the county-owned 80-acre Rapid River Falls County Park, 13149 S 15, Rapid River, and separately verified geographic waterfall location near 46.021667, -86.983333.
- **Do not join by name** to state GIS object 60, whose namesake point is near 46.627099, -89.668576 in the western U.P. This visitor page uses `gisObjectId: null` and GNIS-derived Delta County position. No unrelated USGS NHD crosswalk identifiers may be inherited.
- County's adopted 2026–2030 plan documents a developed waterfall-viewing walkway and year-round day-use park; overall county accessibility assessment is 1/5 and parking accessibility needs improvement. Do not claim fully accessible facilities, exact trail mileage, or today's opening status.
- Indexing five-axis gate: land manager and public use via county park, signed visitor arrival via county address/US-41 direction, developed walkway via county plan, geographic fall position via GNIS-derived record. Parking/visitor entrance is not the waterfall point.
- Sources: https://deltacountymi.gov/parks/sac-bay-rapid-river-falls/ ; https://deltacountymi.gov/wp-content/uploads/2026/01/Delta-County-Recreation-Plan.pdf ; https://deltacountymi.gov/township-information/baldwin-township/points-of-interest/ ; https://www.anyplaceamerica.com/directory/mi/delta-county-26041/falls/.

## October 27, 2026: next Keweenaw visitor-guide wave

Added Eagle River Falls, Haven Falls Park and Silver River Falls (Keweenaw), each with separately documented land manager, public approach, parking location, walking trail and Michigan state GIS waterfall ID (142, 138 and 146). Eagle River Bridge Park is MDOT-owned according to the Keweenaw County 2025–2029 Recreation Plan; Haven Falls Park is Keweenaw County Road Commission-owned; Mariner's Preserve at Silver River Falls is protected by the Michigan Nature Association and independently lists public access. The last guide calls out crossing M-26 rather than implying a segregated protected trail. All three include 2020 USGS crosswalk references, which are scientific identifiers, not current flow or visitor access verification. Never route a car directly to the waterfalls' GIS coordinates.

All three are indexable only after five source axes and substantial visitor planning content were reviewed. Scott Falls stays research only. Total curated inventory: 31 destinations, 30 listed in the hub schema (research-only Scott Falls excluded), 29 independently indexed child pages plus hub and existing Tahquamenon canonical handoff. Check full repository CI and mobile map smoke before merging.
