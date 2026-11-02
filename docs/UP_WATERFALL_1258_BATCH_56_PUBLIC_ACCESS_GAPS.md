# U.P. Waterfalls #1258 Batch 56 — high-demand PUBLIC-access gap audit
**Checked:** November 2, 2026. **Mission:** find and publish material, missing popular Upper Peninsula waterfall visitor experiences *only* if the project’s five legal-access checkpoints can be sourced. Research-only GIS points cannot become vehicle directions or indexable attraction guides.

## Result
One independent missing public visitor experience clears all five evidence checkpoints: **Wright Street Falls**, Marquette, on the Noquemanon public North Trails and documented Travel Marquette river/boardwalk approach. The cascade itself is modest (~10 feet); its value is short, documented, widely referenced visitor access. Inventory **72 -> 73**; published child guides in waterfall sitemap **70 -> 71**. No Michigan state GIS object ID attached; this is **not** the same place as the source #160 upstream Dead River Falls.

### Exact source checks: Wright Street Falls
| Verification axis | Evidence & limitation |
| --- | --- |
| Identity | Travel Marquette supplies Wright Street Falls 46.56588,-87.44576, Dead River; https://www.travelmarquette.com/blog/post/waterfalls-you-need-to-see-in-fall/ |
| Land/trail authority | NTN maintains the public North Trails corridor and lists a BLP Wright Street access; https://www.noquetrails.org/north-trails . NTN does **not** confer permission inside adjoining hydroelectric facilities. |
| Lawful visitor approach | Travel Marquette presents Wright Street as a public river-path waterfall, distinct from upstream McClure. https://www.travelmarquette.com/outdoor-adventure/waterfalls/ |
| Public parking | Travel Marquette names a dirt lot on Wright Street near the Board of Light and Power, plus a nearer small lot. No surveyed parking pin is available; guide deliberately links to source text, not invented GPS. |
| Walk and effort | Travel Marquette’s public boardwalk/river pathway is about 450 feet from the nearer lot, with unknown surface and accessibility details. Editorial 15–30-minute stop, not measured travel or winter-opening proof. |
| Conditions | Source-based *typical* visit only. Hydro diversions affect flow; open-now, parking availability, snow removal and swimming safety unverified. No industrial access, penstock climbing, upstream gorge shortcut or estimated parking coordinate. |

## Other high-demand omissions investigated, but not promoted
**Dead River Falls**, Marquette, GIS #160: popular 1.5-mile rugged trail appears in U.P. Travel guidance; however FERC 2002 evaluation of UPPCO’s McClure (not city MBLP Forestville) specifically notes the upstream informal trail crossing private property. The audit from Nov 1 remains blocked for 2026 without current property/easement verification, owner-sanctioned parking and safe trail. Research evidence: https://archives.nmu.edu/govdocs/local/Dead_River/2002_Final_Environmental_Assessment_Dead_River_Hydroelectric_Project_FERC%20Project_No_10855-002_and_Marquette_Hydroelectric_Project_FERC_Project_No_2589-024.pdf and https://www.uptravel.com/blog/post/best-waterfalls-eastern-central/ . Do not import the tourism route as unrestricted public access.

**Au Train Falls**, Alger, GIS #192: local tourism describes two falls and historic utility-lot walks, but FERC's December 29, 2025 final license termination and utility parcel transfers leave current rights to public parking/foot corridors unresolved. Project dam-safety issues create additional restrictions to verify. No indexable page/route until owner/EGLE current permissions. Source tourism: https://www.munising.org/activities/au-train-falls/ . FERC docket P-10856-141 source in source ledger.

**Gabbro / Baker's Falls**, Gogebic, GIS #38: new November 2 evidence from actual property operator Snowriver identifies it on Black River Basin land and invites visitors to view the falls, describing 20 yards from a road or a 0.3-mile approach from a bridge. https://www.snowriver.com/things-to-do/waterfall-fun ; https://www.snowriver.com/discover/summer-at-snowriver-0 . Snowriver identifies a public Black River Basin resort facility/parking, but neither owner's text nor sampled authoritative map establishes that exact public parking -> river footpath connection, permitted bridge-side parking, winter ski-operations restrictions, or alignment. Existing GIS #38 keeps publicRouteCleared=false. Next step: obtain owner-approved falls visitor map/parking and trail rules. Do not manufacture a trail from the property resort lot or send drivers to the Black River pin.

**Black River Falls near Ishpeming**, GIS #184: 2017 official DNR condemnation of the old footbridge and closure of that walking segment; no 2026 approved alternate route/parking proof. NOT the five Gogebic County Black River Scenic Byway falls already published. Evidence: https://content.govdelivery.com/accounts/MIDNR/bulletins/18dd92b . Remains research-only.

**Alger Falls**, GIS #213: near M-28/M-94, popular tourist photo stop, but state-highway crossing and safe designated parking/ownership were not independently cleared; not a fall to route visitors to from a raw GIS point.

**Warner Falls** and **Cataract Dam Falls**: regional visitor guides exist, but permitted safe highway-side parking (Warner), 4WD access and legal land-manager-to-falls path (Cataract) need specific confirmation before a new indexable guide.

## What changed
- New concise indexable `/upper-peninsula-waterfalls/wright-street-falls/`, preserving the existing page creator, structured schema, ads and no-driving-to-GIS-pin safeguards.
- Updated source-curated `data/up-waterfalls.json`, reconciliation and inventory counts, deterministic priority queue, hub searchable list & map, ItemList JSON-LD, and sole `sitemap-up-waterfalls.xml` indexable entry.
- Fixed the pre-existing keyless/watermarked CARTO raster on waterfall child maps by loading the existing **public** Vercel basemap configuration, falling back to OSM. No secrets in HTML. Existing indexable pages reuse the same detail script.
- Focused Node regression for Wright/McClure identity, all five source gates, page/sitemap/Person/ItemList consistency, Gabbro/Dead River/Au Train still research-only; expanded Chromium checks for the new guide with real decoded tiles and no fake parking coordinate.
- No new privacy, Redis, Supabase, tracking, parking navigation polyline, or copied third-party imagery.

## Release gate
Require Node tests, `node scripts/build-up-waterfall-review-queue.mjs --check`, full `npm run verify:all`, emitted site/audit, waterfall mobile+map browser smoke, name-identity checks and Vercel success. Do not merge until green. After merge verify production READY for exact commit and inspect new public page. Actual search/visitor usage is not measured by test success.
