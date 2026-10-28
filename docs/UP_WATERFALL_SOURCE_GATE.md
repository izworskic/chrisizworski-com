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

## Keweenaw County park access review — October 27, 2026

Promoted the following state GIS and linked USGS points only after separately reviewing the 2025–2029 Keweenaw County Recreation Plan, the relevant visitor routes, and documented park management:

- **Haven Falls**, Michigan GIS #138 / USGS UUID e40ef5cd-8a58-11e6-b586-ecf4bb62914c: Keweenaw County Road Commission owns the park; Visit Keweenaw supplies parking directions and the short park-internal approach. Source: https://www.keweenawcountyonline.org/docs/RecreationPlan.pdf and https://www.visitkeweenaw.com/listing/haven-falls-park/595/. No claim of universal accessibility; county score 2 indicates only partial compliance.
- **Eagle River Falls**, Michigan GIS #142 / USGS NHDPlus COMID 11936947: Keweenaw County identifies MDOT ownership of Eagle River Bridge Park; visitor authority describes off-M-26 parking and the historic pedestrian bridge viewpoint. Sources: county plan and https://www.visitkeweenaw.com/blog/post/2-day-keweenaw-waterfall-driving-tour/.
- **Silver River Falls**, GIS #146 / USGS NHDPlus COMID 11936911: County recreation plan inventories Silver River Falls Park and older county land-use plan identifies MDOT ownership. Visitor brochure locates parking south of M-26 and the footpath north, but a marked legal/safe pedestrian crossing is not independently documented. Preserve a **noindex research guide**, omit from sitemap and provide no guessed pedestrian or driving routes until resolved.

State GIS points are waterfall locations only, not parking entrances. USGS NHD linkage does not independently establish public rights of way. Any future indexable promotion requires all five evidence axes with actual source links and a sufficiently specific visitor page.

## Pinnacle Falls source qualification — October 27, 2026

- Promoted Michigan state GIS waterfall #155 (46.706651, -87.806989), USGS V2 feature e413d0d0-8a58-11e6-b586-ecf4bb62914c / NHDPlusV2 COMID 12025618; unique GIS-USGS match 11 m apart. Coordinates represent the waterfall rather than visitor parking.
- Yellow Dog Watershed Preserve identifies the owner/manager, 280-acre public conservation preserve, allowed hiking and camping/motorized-use rules, signed two-track access to a small parking area, and approximately one mile of steep rugged trail. https://yellowdogwatershed.org/pinnacle-falls-preserve/
- Independent Marquette regional waterfall brochure confirms the CR-550, CR-510, AAA and forest two-track access sequence; no unsupported surveyed parking coordinates or calculated drive times. https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/marquettemi/waterfalls3_2025brochureV2_03a81a20-d8c9-4ab9-b1c6-ccc8ac1bfc68.pdf
- A complete educational HTML-first guide describes geology, nineteenth-century logging, trip-choice implications, seasonal road limits and specific preserve rules. Mark indexable only because all five evidence axes have linked sources; never equate geospatial proximity with right-of-way.
- Current opening and road conditions remain unverified. Don't confuse Pinnacle Falls Preserve with Yellow Dog River Community Forest trailhead.

## Yellow Dog River Community Forest access — October 27, 2026

- **Yellow Dog Falls / Hills Falls** has its own complete visitor guide. It is not Pinnacle Falls and **must not share Pinnacle's two-track parking entrance**.
- Yellow Dog Watershed Preserve owns the 688-acre Community Forest and explicitly directs the public to the south side of the County Road 510 Yellow Dog River bridge, with established walking trail toward several waterfalls. Travel route from County Road 550: turn onto CR-510; after about 2.6 miles stay left on dirt CR-510 at CR-AAA; go about 3.9 miles to the bridge; signed public lot lies to the left after crossing.
- The landowner describes about 0.75 mile to the first falls; AIPG geological field guide describes about 0.5 mile to Yellow Dog Falls. These are estimates to differently described drops, not a surveyed fixed distance. No parking coordinate is fabricated.
- AIPG's independent geological field coordinates N46°43.720', W87°42.403' and Waterfalls of the Keweenaw position 46.72865, -87.70674 corroborate the FALL point only. This is not present in the 161-item state GIS research subset and must have `gisObjectId: null` and no borrowed NHD crosswalk.
- The USGS monitoring station 04043275 on the Yellow Dog River ceased reporting daily flows in 2016. Never label that record live or derive today's waterfall condition from it.
- The five-axis verified public approach permits publication as a substantive indexable guide without implying current road passability or trail maintenance.
- Sources: https://yellowdogwatershed.org/land-protection-program/yellow-dog-river-community-forest/ ; https://yellowdogwatershed.org/land-protection-program/ ; https://cdn.ymaws.com/aipg.org/resource/resmgr/documents/events/conferences/2022_mi/marquette_area_waterfalls.pdf ; https://www.michigan.org/property/yellow-dog-hills-falls ; https://yellowdogwatershed.org/wp-content/uploads/2015/06/Yellow-Dog-River-Community-Forest-Plan-with-Forestry-Plan.pdf ; https://waterdata.usgs.gov/monitoring-location/USGS-04043275/.

## October 27 crosswalk location agreement gate

Of 113 name-matched USGS V2-to-state-GIS links: 78 lie within 100 m, 18 within 101–250 m, and 17 are 251–800 m apart. These are editorial geographic agreement tiers, not USGS-certified accuracy. The research map must withhold NHD identifiers from the 17 distant links until manually reconciled; all matches are historical data, not proof of public access. All 33 visitor destinations retain their independent five-axis publication gate. The on-demand import writes the tiers into both the archival and public research crosswalks.

## October 27 Ottawa forest and Michigan–Wisconsin border visitor guides

- **Kakabika Falls:** Michigan GIS #21, matching USGS NHDPlusV2 COMID 11951547 (4 m spatial agreement). US Forest Service Recreation.gov listing documents Bessemer Ranger District public trail; UP Travel identifies legal signed County Road 527 parking *before* the river bridge. The waterfall point is not a lot. No live road condition or accessibility claim. Sources: https://www.recreation.gov/camping/poi/238266, https://www.uptravel.com/listing/kakabika-falls/2119/, https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7.
- **Interstate Falls:** Michigan GIS #35 on the Montreal River boundary; the documented public approach is entirely from the Wisconsin bank on Town of Kimball property, acquired through Northwoods Land Trust and conveyed in 2016. The 0.7-mi out-and-back trail starts from Center Drive after an approach via US-2. No Wisconsin-to-Michigan bank crossing or Michigan public access is inferred. Sources: https://northwoodslandtrust.org/interstate-falls-2/, https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7.
- Each page has the five source-verification axes, substantial HTML copy, self-canonical metadata, and belongs in the sitemap only while every axis remains documented. GIS research overlays may retain raw records but their markers are suppressed for these two curated GIS IDs; USGS identifiers are not proof of access.

## October 27 — Superior Falls access, utility operations and hydrographic crosswalk

- Michigan State GIS waterfall feature #50 is at 46.562528, -90.41554. A unique USGS Falls/Rapids V2 name match has 2 m geographic agreement and NHDPlusV2 COMID 1812799. The hydro record describes a feature, not streamflow, parking or an access easement.
- The Michigan-bank parcel adjoining the Montreal River is described in the Bayfield County regional public access inventory as Xcel Energy property at the Superior Falls hydroelectric development. FERC identifies Northern States Power as the developer/operator of the licensed Superior Falls facility P-2587. The utilities' working facilities are not unrestricted visitor land.
- Travel Wisconsin publishes the US-2 → Highway 122 north → Michigan state line → left onto signed gravel road instructions and visitor lot. This is a different public entry from Wisconsin-bank Interstate Falls.
- The county inventory identifies public parking, benches, viewing paths and a steep lower-gorge route. The lower descent can be hazardous in wet/icy conditions. Visitor guidance must not describe this as accessible or as a maintained all-season trail. No parking coordinates are fabricated.
- A full guide is promoted only after five independent source categories are documented: geographic location, land/facility manager, legitimate public viewing access, designated parking, and walking route/risks. Current road and trail status are **not** live. Hydro facility operation means no guaranteed waterfall flow.
- Sources: https://www.ferc.gov/news-events/events/evening-scoping-meeting-saxon-falls-hydroelectric-project-saxon-project-and ; https://www.bayfieldcounty.wi.gov/370/Public-Access-Study-PDF ; https://www.travelwisconsin.com/outdoors/waterfalls/superior-falls ; https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7 ; https://doi.org/10.5066/P9QQTKA0.

## October 27, 2026 — independent current USGS NHD point agreement layer

The 2020 USGS Falls/Rapids V2 source crosswalk (113 state GIS matches) remains unchanged. A **separate** authoritative USGS National Map NHD Point layer was queried on October 27, 2026 (FTYPE 487 = Waterfall, service reporting data refreshed October 2026). Source: https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/0 . The regional envelope crosses state and international borders, so it is NOT a Michigan or U.P. inventory count.

- Retrieved **97** NHD waterfall point records from the envelope in four 25-record result pages: 30 named, 67 unnamed.
- Against the 161 named Michigan geographic research points, 20 separately named locations agree within 250 m. A geographic corroboration message may appear on the opt-in research-only layer for those matched Michigan GIS records; never show NHD corroboration as a public trail, navigable parking point or opening status.
- Two records (Jumbo Falls and O Kun de Kun Falls) are 251–1,000 m from the state point and require location review. Two dangerous namesake matches (Silver Falls, ~111 km; Cascade Falls, ~304 km) are rejected rather than attached to a location. The matching is by normalized name AND distance; no name-only join.
- No additional indexable URLs, visitor routes, parking pins, or land-tenure claims are made from this data. The 2020 historical crosswalk and the current NHD Point records are distinct datasets; do not substitute one layer's IDs, stream reaches, or provenance for the other. NHD Point REACHCODE is null for many waterfall records; do not fabricate hydrologic stream linkage.

Repository: `data/up-waterfall-nhd-point-audit.json` contains all 97 records and decisions, while the static research overlay exposes only the 20 <=250m geographic corroborations. Any feature guide must still satisfy the separate five-axis visitor-access indexing gate.

## October 27 — Horseshoe Falls seasonal private-access guide

- **Horseshoe Falls** in Munising is a paid, privately operated attraction, not state-park or National Park Service visitor access. The City of Munising recreation plan identifies the private status, the Munising visitor bureau corroborates the visitor approach, and the operator supplies admission, 400-foot walking distance, mobility and leashed-pet guidance. https://cityofmunising.org/wp-content/uploads/Munising_RecPlan_Adopted_2024.pdf ; https://www.munising.org/activities/horseshoe-falls/ ; https://www.uppermichiganwaterfalls.com/information.
- Public arrival is through the **operator's 602 Bell Avenue visitor entrance**, not by car to the GIS waterfall point. The operator advertises an early May–mid-October season. As of October 27, do not claim the attraction open now.
- Michigan GIS geographic feature **#197** lies at 46.402894, -86.642575. USGS V2 has a same-name match about 107 meters apart; this is a *moderate* geospatial correspondence and NHDPlus COMID is unavailable. No hydrography record verifies opening, visitor routes, parking or current flow.
- This complete visitor guide qualifies for indexing through independent land management, licensed visitor offer, designated street-address parking, operator's visitor walk, and GIS waterfall-coordinate sources. It adds a different *paid maintained-grounds* choice alongside nearby free Wagner Falls and the still-closed Munising Falls Trail.

## October 28 — property-boundary conflict promotion safeguard (GIS #124 Bonanza / Greenwood)

A named waterfall can have **one mapped natural feature and a different publicly managed viewing area**. Bonanza is a verified example: the Michigan state GIS falls coordinate (46.818863, -89.571458) intersects a recorded nonmunicipal parcel, whereas the Western U.P. waterfall brochure's separately published point (46.817719, -89.570023; approximately 168 m apart) intersects a parcel attributed to Carp Lake Township. These results came from point-in-polygon queries against the [MTU-hosted Ontonagon County parcel feature layer](https://portal1-geo.sabu.mtu.edu/server/rest/services/Hosted/Ontonagon_County_Parcels/FeatureServer/0). [Ontonagon County's own GIS notice](https://ontonagoncounty.org/home/resources/) explicitly warns that parcel maps are not legal surveys or authoritative title determinations. These are **research ownership labels**, not legal findings or public access grants.

Carp Lake Township separately documents the **seasonal Bonanza visitor facility** in its 2025 board minutes: approved Greenwood/Bonanza signage (June 25); signed entrance, parking/turnaround and visitor restrictions (August 20); fall park closure around late October as weather warrants (October 15); closure through winter until spring 2026 (December 17). The township's management of the visitor facility **does not establish a legal public route to every river drop or across the neighboring parcel**. Nor do last winter's closures prove the park is open or closed today in 2026.

Generalizable five-part boundary check for all future waterfall guides:
1. Keep the source waterfall GIS point immutable. Never send vehicles there.
2. Independently locate the **signed visitor entrance and lot**, preferably on the land manager's map. A regional brochure pin is an approximate reference, not necessarily a drivable lot.
3. Reconcile manager and recorded surface parcel ownership at **both** the falls and public arrival. A missing state-DNR polygon is not evidence of private title; an apparent municipal or private parcel is not itself a legal easement finding.
4. Confirm that the proposed **entire public walking approach to the viewing area** is authorized and does not silently enter an unverified parcel. Park-only evidence cannot automatically authorize access to an adjoining riverbank.
5. Review time-specific closures for the **current year** separately from historical operating practice. If any axis remains unresolved, keep a research-only record or nonindex informational access warning without invented parking directions.

The opt-in research layer now loads `public/assets/up-waterfall-access-reviews.json`, displaying source-linked individual access warnings where available, and falls back to generic conservative text if that optional file is unavailable. A recorded conflict is not proof of criminal trespass or an invitation to contact a private landowner. No existing guide/ad/canonical or unrelated route is changed by this safeguard.

Official township evidence:
- 2025-06-25: https://8e87cfbc-b101-4b9b-8f98-ed8a5ca7d0d0.filesusr.com/ugd/86ec78_4bcbe3d029e344d3a4b3c7d3e40f0772.pdf
- 2025-08-20: https://8e87cfbc-b101-4b9b-8f98-ed8a5ca7d0d0.filesusr.com/ugd/86ec78_2f5de80733814402a12c7433d4b19023.pdf
- 2025-10-15: https://8e87cfbc-b101-4b9b-8f98-ed8a5ca7d0d0.filesusr.com/ugd/86ec78_0bf497560d2a44b68cee8fd20bab0828.pdf
- 2025-12-17: https://8e87cfbc-b101-4b9b-8f98-ed8a5ca7d0d0.filesusr.com/ugd/86ec78_4446082a76cf47bab867625a113ab1c6.pdf
