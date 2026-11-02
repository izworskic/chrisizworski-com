# Issue #1258 — Batch 54: Mill Pond, Little Quinnesec and Peavy Falls
Source review November 2, 2026. Three geographic and hydroelectric records reviewed. Zero verified new waterfall visitor routes.

## What visitors should know
- Mill Pond Falls, GIS #8 on Sundholm Creek: Michigan GIS coordinates 45.988890,-87.854767. GNIS-derived Upper Mill Pond Falls 45.9863889,-87.8494444 is approximately 496 m away; the GNIS-derived Lower Mill Pond Falls 45.9844444,-87.8452778 is approximately 884 m away. The two GNIS points are 388 m apart. Source-point proximity does not prove names are aliases, three waterfalls on a trail, or accurate visitor parking.
- Little Quinnesec Falls, GIS #4 on Menominee River: Eagle Creek Renewable Energy operates Little Quinnesec hydro (FERC P-2536, licensed through April 2037). A secondary plant listing lies about 57 m from the GIS feature, spatial context only. Eagle Creek’s project-level recreation matrix lists parking, picnic, canoe portage, fishing, boat launch and camping, but not a hiking trail. Neither the matrix nor a river gauge authorizes power plant entry, a waterfall overlook or parking-to-falls navigation.
- Peavy Falls, GIS #9 on Michigamme River: We Energies operates a hydro station dating to 1943. WWD classifies the original natural falls as unconfirmed and explains diversion of the original upper drop, with a lower ledge dependent on spillway operations. Wisconsin Public Service posts hydro-project Total Flow, headwater and tailwater values updated around every 10 minutes. This is not a flow-over-the-natural-falls sensor. A zero Total Flow reading is not proof a visible falls is dry, and a positive value does not prove a visitor will see a waterfall. Regional dam/fishing recreation is not a verified falls trail.

## Visitor route source gate
Six separate evidence segments recorded for each candidate: (1) identity/hydrography, (2) land manager/public permission, (3) recreation amenities versus waterfall-specific access, (4) current roads/parking, (5) continuous lawful walk and viewpoint, (6) live conditions and evidence age.

All three remain research-only: not indexable, no tourist attraction structured data, no driving instructions to GIS point, no route polyline. No parcel/title survey, owner contact, on-site inspection or specific current official recreation exhibit established a public route.

## Implementation
- Updated data/up-waterfall-reconciliation.json and data/up-waterfall-inventory-ledger.json for GIS #8, #4 and #9, including dated citations and blockers.
- Captured project recreation scope for #4 separately from actual falls access.
- Captured hydro telemetry applicability for #9; explicitly prohibit mislabeling hydro generation flow as natural waterfall flow.
- Added noindex evidence pages:
  1. /upper-peninsula-waterfalls/research/mill-pond-falls-sundholm-creek-identity-review/
  2. /upper-peninsula-waterfalls/research/little-quinnesec-falls-hydro-recreation-review/
  3. /upper-peninsula-waterfalls/research/peavy-falls-dam-spillway-access-review/
- Updated public/assets/up-waterfall-access-reviews.json: reviewed records 94 to 97. Regenerated deterministic data/up-waterfall-review-queue.json.
- Added tests/up-waterfalls-issue1258-b54.test.js and relaxed only B53's strict historical count to a cumulative lower bound.
- Kept curated waterfall count at 72, exact GIS links 66, pending GIS records 95, and public visitor map/sitemap unchanged.

## Official evidence
Michigan GIS https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7
Eagle Creek hydro https://www.eaglecreekre.com/facilities/operating-facilities/menominee-river-hydro-facilities
Eagle Creek recreation https://www.eaglecreekre.com/community/recreation
Eagle Creek streamflow https://www.eaglecreekre.com/facilities/operating-facilities/menominee-river-hydro-facilities/menominee-river-streamflow-gage
We Energies hydro https://www.we-energies.com/company/hydroelectric-power-plants
Wisconsin Public Service hydro telemetry https://www.wisconsinpublicservice.com/environment/hydrodata
Dickinson County tourism Peavy context https://www.ironmountain.org/pages/fall-colors/
DNR alternative Menominee recreation area https://www.michigan.gov/recsearch/parks/Menominee

## Secondary geographic and specialist comparison (not access permission)
Upper Mill Pond GNIS-derived point https://www.anyplaceamerica.com/directory/mi/dickinson-county-26043/falls/upper-mill-pond-falls-2128902/
Lower Mill Pond GNIS-derived point https://www.anyplaceamerica.com/directory/mi/dickinson-county-26043/falls/lower-mill-pond-falls-2128901/
Little Quinnesec plant point https://www.gridinfo.com/plant/little-quinnesec-falls-hydro-project/57190
Peavy original falls analysis https://www.worldwaterfalldatabase.com/waterfall/Peavy-Falls-13251

## Release gate
Run targeted B53/B54 tests; deterministic waterfall review-queue --check; npm run verify:all; browser/mobile waterfall smoke, noindex/canonical public HTML and Vercel preview checks. Do not merge unless independently verified green. Main will auto-deploy on merge.

## Next source priority
Site-specific recreation exhibits or written owner guidance for Little Quinnesec and Peavy, and true county parcel/hydrography reconciliation at Mill Pond. Without a sanctioned route, prioritize upgrades to the 72 visitor-usable waterfall destinations over publishing unverified points.
