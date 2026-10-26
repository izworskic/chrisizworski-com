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
