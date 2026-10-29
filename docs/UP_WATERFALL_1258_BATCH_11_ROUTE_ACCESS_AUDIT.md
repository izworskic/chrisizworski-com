# Issue #1258 — Batch 11 western U.P. legal-approach corridor audit

Reviewed October 28, 2026. This is a **research-only accessibility audit**, not a new indexable waterfall field guide or an assertion that a road is currently open. No owner was contacted, no land survey was performed and no exact parking or trail geometry was inferred.

## Decision and source hierarchy

A waterfall on publicly managed land is **not** the same fact as a lawful continuous route from a public highway to a public overlook. For each candidate, maintain six separate evidence gates: **natural waterfall/land manager**, **main public road**, **side road**, **legal vehicle turnout/parking**, **complete public walking path**, and **current season/closure**. Only the first can be marked verified by the raw waterfall point intersecting a public parcel. A tourist account of a signed walk is useful context, but not equivalent to land-title, DOT right-of-way, a state forest road designation, a license/permission from a private resort or current opening.

**Official forest-road rule:** Michigan DNR's [State Forest Roads](https://www.michigan.gov/dnr/things-to-do/orv-riding/state-forest-roads) page explicitly notes that DNR roads may provide only *incidental, permissive* private-land access, not a guaranteed right of access across private parcels or year-round road passability. Michigan's [2026 printable road-map collection](https://www.michigan.gov/dnr/things-to-do/orv-riding/state-forest-roads/maps-and-status) is a valid map reference for DNR inventory but its ORV designations should **not** be misrepresented as opening a road to all cars, guaranteeing an easement or proving that a two-track is safe.

## Chicagon / Chicaugon Falls — Michigan GIS #12

**Natural falls/parcel: verified geographic fact.** Direct state DNR LOTS managed-land polygon query places waterfall 46.134032, -88.452985 inside a dedicated 47.8-acre state forest parcel, ParID **258918**, Crystal Falls Management Unit. This determines a polygon ownership/management *record*, not a complete visitor right of way. Original layer: [Michigan DNR LOTS](https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRLOTSParcelsOPENDATA/FeatureServer/2).

**Historical forest management warning: important independent corroboration.** Michigan DNR [Compartment 12139 report](https://www.michigandnr.com/publications/pdfs/ForestsLandWater/Cmpt_Reviews/Crystal_Falls/2021/cry139_comp_info.pdf), *Crystal Falls Forest Management Unit, 2021 entry year, report revised in 2019 / dated 2020*, PDF page 1, explicitly states that this surrounding Chicagon Creek/Slough area is mostly state land with scattered private parcels but that private landowners control nearly all vehicle access **into that particular compartment**. Its page 2 describes public vehicle access from Paulson Road as very limited, private routes via Bates-Amasa Road, and a management easement under pursuit at that time. **This compartment report does not map or establish any specific Raymer Road route to Chicagon Falls.** It is historical area-context evidence, not a present-day easement or closure record. The map's road legend distinguishes DNR primary/secondary/access roads, county seasonal roads and private dirt/gravel roads.

**County road and route-name evidence:** [Iron County Road Commission seasonal restricted list](https://ironcountyroads.com/wp-content/uploads/2023/04/Roads-Restricted-List.pdf), PDF dated Feb 27, 2018, includes **Long Lake Road**. It does not label **Raymer Drive** or **Dave's Camp Road** within this *dated seasonal-restriction list*, but **absence from a restricted list is NOT proof that a road is private, closed, nonexistent or outside the county road system**. A current point-buffered [Michigan Geographic Framework All Roads layer](https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/michigan_geographic_framework/MapServer/20) query near state GIS #12 returned named Long Lake Road but no named Raymer/Dave's Camp record, which likewise **does not establish ownership, closure, or legal access**; the database can omit small private two-tracks. The source map is geographic, not a road-authority determination.

**Secondary visitor observations:** [Iron County Economic Chamber](https://www.iron.org/outdoors/waterfalls/), Crystal Falls Business Association, and a regional lodging source describe US-2 → Long Lake Road → Raymer/Dave's Camp two-track → signed walking route. The chamber warns of spring washouts, the lodging guide notes private camps, and a 2013 independent waterfall photo essay attributes a widened parking area to a historical Bewabic State Park ranger. None is an official **2026 designated parking lot** or a current continuous mapped public easement. The state GIS fall coordinate is not drivable.

**Admission:** **NOT CLEARED**, publicationEligible=false. To clear:
1. Obtain a currently valid public road inventory, easement or DNR-managed state forest road geometry for *Raymer/Dave's Camp*, not just Long Lake Road.
2. Independently establish a legal turnout location *before* any impassable washout or camp boundary; no inferred GPS.
3. Verify a continuous land-manager-approved walking path from permitted turnout into state falls parcel, with no private camp crossing or uncertain bridge.
4. Check current posted road closure/condition. Seasonal restrictions and 2019 management assessments cannot establish today's open status.

## Gabbro / Baker's Falls — Michigan GIS #38

**Natural feature: credible geographic identity.** Michigan state GIS locates the Black River waterfall, and the [City of Bessemer official visitor guide](https://www.cityofbessemer.org/visit/scenic-drives/) names Gabbro/Baker's Falls and describes a route past **Blackjack Ski Hill** with a lower trail near the Black River bridge and a separate upper hillside approach. A [city current visitor overview](https://www.cityofbessemermi.gov/visit/) still references Gabbro Falls as a nearby attraction.

**Two trails, not interchangeable:** The independent [Outbound hiking account](https://www.theoutbound.com/michigan/hiking/hike-to-gabbro-falls) describes an informal blue-marked/ATV-path route from before the bridge, and a service road to upper view through ski hill grounds. Western U.P. tourism alternatively describes a utility corridor. These do not establish that the road shoulders, bridge turnout, ski-resort parking/service road or gas pipeline easement are public rights of way. A utility easement does NOT by itself guarantee public hiking access. The sources do not certify current snow/road conditions, route surfaces, wetlands or safe entry.

**Parcel evidence gap:** The [Gogebic County official GIS system](https://www.gogebic.gov/government/county_offices/gis_map_system.php) explicitly disclaims the use of parcel maps as surveys or title guarantees, and its viewer has not yielded a source-backed continuous public lot/route to the waterfall. The absence of a Michigan DNR managed-land polygon at the natural falls reference is NOT proof of private title, ski-hill ownership or trespass.

**Admission:** **NOT CLEARED**, publicationEligible=false. To clear:
1. Establish public road/bridge parking or explicit ski area permission/access for at least one named route.
2. Trace legal public footpath from that arrival to one clearly defined upper or lower viewing area against parcel/easement records.
3. Independently confirm this route is still open and current seasonal road/gate status; do not advertise the pipeline as a public trail without source proof.

## Build increment and future audit UI

Updated `public/assets/up-waterfall-access-reviews.json` with structured, six-step research audits for GIS #12 and #38; updated `public/assets/up-waterfalls-research.js` to show the six source-linked gates in a **collapsed accessible disclosure** in the optional GIS research popup, not as a visitor itinerary. The primary popup immediately warns against relying on an unverified road/lot. Neither location gets a vehicle navigation link, a fabricated route polyline, an indexable guide, or a sitemap entry. Both internal `data/up-waterfall-reconciliation.json` and `data/up-waterfall-inventory-ledger.json` retain the full unreconciled status and per-step decision. A regression test and Chromium research popup smoke cover no-promotion and all segment evidence.

**Unchanged waterfall inventory:** 51 curated; 161 GIS source waterfall features; 43 exact ID matches; 118 unreconciled; eight curated without exact state GIS link; 49 eligible waterfall sitemap URLs including hub. Verify latest-head CI and browser smoke. PR #1268 remains draft/unmerged pending release gate.
