# Issue #1258 — B73: Warner Falls USGS creek-station geocode reconciliation

Reviewed: **2026-11-06**. This research does **not** establish legal visitor stopping, a current falls opening or a continuous public creek-bank route. It repairs the hazard of conflating a historic water sampling point with an actual waterfall, an MDOT culvert, or parking.

## Separately verified roles

1. **Michigan GIS #172**, Warner Falls: **46.433378,-87.598960**. Natural waterfall feature only, never parking. Source: https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7
2. **Travel Marquette** tourism falls marker: **46.433330,-87.598880**, **8.1 m** from state GIS. Tourism natural-feature approximation, not a highway stopping point. https://www.travelmarquette.com/blog/post/waterfalls-you-need-to-see-in-fall/
3. **USGS station 04058240**, "Warner Creek at State Hwy M-35 at Palmer, MI": **46.4368822210745,-87.5954141613727**, map-interpolated within about one arcsecond, with field measurements **1970–1976** and no recent continuous streamflow observations. About **475.0 m** straight-line from GIS #172. It is not a November 2026 live gauge, current construction site, parking, or waterfall route. https://waterdata.usgs.gov/monitoring-location/USGS-04058240/
4. **MDOT July 2026**: a Warner Creek branch crossing **north of Palmer**, no exact construction coordinate in the public press notice. USGS site identity with this MDOT project is unproven. https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/07/01/m-35-culvert-project-detour-starts-july-27
5. **MDOT August 2026**: two M-35 culverts near County Roads MT and MP south of Palmer, not independently located at the falls. https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/08/12/m-35-culvert-replacements-in-marquette-county-start-aug-24
6. **Historical parcel**: the 2023 third-party Marquette layer intersects the waterfall point at FID 15298, residential land-use class. This is not a deed, ROW survey or public walking permission. https://services9.arcgis.com/6EuFgO4fLTqfNOhu/ArcGIS/rest/services/MarquetteParcelData/FeatureServer/2

The offline Python Haversine audit uses mean Earth radius 6,371,008.8 m and produces a deterministic output. Both 8.1 m and 475.0 m are geographic separation approximations, not hiking/driving miles or surveyed waypoints.

## Remaining source thresholds

**MDOT Superior Region / Ishpeming TSC**: ask whether any current 2026 field/as-built plan, signed parking traffic-control order, posted restriction, shoulder-width/sightline information or bridge approach rules cover the actual Warner Falls curve south of Palmer. Do not conflate with northern July or MT/MP August works. Official route: MDOT-Contact-SuperiorRegion@Michigan.gov (https://www.michigan.gov/mdot/about/regions/superior).

**Marquette County Equalization / GIS**: seek current parcel and highway ROW/easement evidence for a complete public walking approach from the roadside to the waterfall, and identify the responsible land manager for actual authorization/maintenance. A 2023 use-class label proves neither permission nor trespass. Official GIS contact cfuess@mqtco.org (https://www.co.marquette.mi.us/departments/equalization_tax_roll/gis_mapping.php).

No agency answer exists in the evidence record. Agency inquiry drafts, if prepared, are not confirmations. A named MDOT visitor lot is not required by statewide law in every circumstance, but a demonstrably safe and legally permitted location-specific stop plus continuous bank rights are still missing.

## Changed

- Separate source-role JSON, deterministic Python geodesic auditor and output, Node regression that runs Python.
- Warner noindex source page clarifies that older USGS crossing metadata is not waterfall navigation; truthful dateModified 2026-11-06.
- Historical B69/B70 regression remains; its page date is allowed to advance as evidence changes.

**Unchanged:** no new public waterfall card, trail/parking GPS, map pin, sitemap, TouristAttraction schema, ads, SEO promotion or live opening. Current 75 curated / 68 GIS matches / 93 pending baseline preserved on this branch.

Release gates: exact-head full npm run verify:all, Python --check, B69/B70/B73 regressions, waterfall mobile Chromium smoke, Name SERP, Vercel preview, then production proof.
