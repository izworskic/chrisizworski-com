# U.P. Waterfalls #1258: Batch 61, Chicagon land and access conflict
**Review: November 3, 2026. Outcome: research-only, not a visitor itinerary.**

## Critical new public evidence

The Iron County Recreation Plan 2022–2026, Crystal Falls Township recreation inventory, lists **Chicaugon Falls / Scenic / Private / Waterfalls**. The older county recreation classification is primary local-government evidence, but not a current parcel-title survey. It does not negate the separate Michigan DNR GIS intersection at Michigan waterfall #12: dedicated state-managed 47.8-acre parcel ParID 258918, Crystal Falls Management Unit.

The two sources may cover different tracts, routes, dates or name scopes. They have not been reconciled. A state-owned waterfall point does not grant road/footpath access across other parcels. An old county private scenic label does not prove the current title of the DNR mapped natural feature.

County Chamber visitor directions refer to Raymer/Dave's Camp Road and warn of washouts; nearby private camps are reported. Current Road Commission road updates and countywide map do not establish a specific legal public right-of-way, designated falls lot, current passability or complete authorized footpath.

## Python geodesic and source gate

scripts/build-up-waterfall-chicagon-proof.py uses only Python's standard library and the canonical GIS candidate plus normalized evidence. It generates deterministic data/up-waterfall-chicagon-corridor-proof.json. The state GIS point lies 67.2 metres from a separate approximate named-falls coordinate and 4,010.1 metres from a conflicting tourism point. This proves an identity-location discrepancy, not a route. All route, parking, lawfulness, current opening and source-conflict-resolution gates remain false. No Python service, paid API, database, Redis or Supabase was introduced.

## Visitor-facing improvements

Published as a research-only HTML page with noindex, WebPage creator schema and six source-backed access checks:
 /upper-peninsula-waterfalls/research/chicagon-falls-private-corridor-review/

The page visually distinguishes current DNR falls-point title from the dated county private scenic listing and explains the unverified intervening corridor. It links to the existing Fumee Falls curated guide while warning of seasonal road-park closures. No GIS pin driving, invented turnout, visitor route, TouristAttraction schema or new sitemap entry.

Updated existing reconciliation, canonical inventory ledger, opt-in research map popup and deterministic priority queue. Chicagon is now awaiting-new-authoritative-evidence instead of being repeatedly selected for the same web research.

Totals remain 74 curated, 67 state GIS links, 94 pending. No new cleared public waterfall.

## Actionable source requests

1. Iron County Road Commission: legal road classification/right-of-way extent of Raymer/Dave's Camp from Long Lake Road, maintenance, restrictions and any official designated waterfall lot.
2. DNR Crystal Falls Management Unit: public trail/easement map reaching ParID 258918 and any private parcel crossings, plus current signage.
3. Iron County Equalization/Register of Deeds: current parcel chain, road/easement record and explanation of the county recreation plan's Private classification.
4. Only if those pieces align: current physical safety, legal parking and continuous walking/access check before publishing a visitor route.

No contact request was sent on the user's behalf. No access or SEO/CTR benefit claimed before measurement.

## Primary evidence

Iron County adopted plan: https://ironmi.com/wp-content/uploads/2024/05/Recreation-Paln-2022-2026.pdf

DNR parcel data: https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRLOTSParcelsOPENDATA/FeatureServer/2

Iron County waterfall tourism: https://www.iron.org/outdoors/waterfalls/

Iron County Road Commission: https://ironcountyroads.com/seasonal-information

Iron County 2026 county road atlas: https://ironcountyroads.com/wp-content/uploads/2026/03/Geographical-Page.pdf

Current Michigan DNR forest roads: https://www.michigan.gov/dnr/things-to-do/orv-riding/state-forest-roads/maps-and-status

Local private-camp caution: https://ironcountylodging.com/waterfalls-in-iron-county-michigan/

## Exact-head verification

Python deterministic --check; Node queue --check; targeted B61 and existing waterfall source safety tests; full npm run verify:all; waterfall Chromium mobile/map smoke; Vercel preview and search name protection; production checks after squash merge.
