# U.P. Waterfalls #1258 — Batch 62: Whitefish Falls DNR owner and water-access crosswalk
**Reviewed:** November 3, 2026. **Outcome:** strong geographic/land-site evidence newly verified, but public waterfall parking/walking-route gate remains blocked.

## What changes the visitor decision

Michigan GIS #191 Whitefish Falls on the Whitefish River near Trenary (46.217693, -87.050041) has a **point-in-parcel match** in Michigan DNR LOTS open data: ParID **1122650**, **38 acres**, **Dedicated**, ProjectName **PUBLIC WATER ACCESS SITE**, maintained in DNR Parks and Recreation Division records.

A second separately maintained authoritative DNR State Sponsored Developed Boating Access dataset locates **Whitefish River** facility **A-02-004** at 46.21758429, -87.04976723, **24.3 metres straight-line** from the mapped natural waterfall. Official fields: waterbody West Branch Whitefish River; DNR-owned PRD, managed/administered by **Van Riper State Park**; **one carry-down launch, zero trailered boat-ramp lanes**, vehicle-only parking **NULL/unknown**, trailer parking **NULL/unknown**, current opening **not present**. The facility is genuine public water access, not a certified waterfall visitor lot or official waterfall-viewing trail.

**Do NOT name-match to the wrong DNR site.** The similar-name **West Branch of Whitefish River** facility **A-02-010** is approximately **7,540.5 metres** away upstream. Its one vehicle space and one trailer space recorded in the same source are site-specific and MUST NEVER be applied to A-02-004. The unrelated secondary "Whitefish River Township Park" waterfall aggregator coordinate is **4,911.7 metres** away; also never used for the falls trip.

Independently derived GNIS #1622606 Whitefish Falls coordinates are about **171.6 metres** from GIS #191, supporting the feature's position. Munising Visitor Bureau officially lists an unimproved trail and <=15-minute walk, but gives **no named parking address, signed trail connection, posted land-manager rules or seasonal status**. Field photography and old mentions of River Road and campground sites do not establish any current rights or safe waterfall arrival route.

### Evidence hierarchy

| Evidence | Established | Unresolved |
| --- | --- | --- |
| State GIS + GNIS-derived point | Natural waterfall identity near Trenary | Exact individual cascade, present flow |
| DNR LOTS parcel #1122650 | DNR Parks & Recreation public water access land at falls | Parking and route approved for waterfall sightseeing |
| DNR access A-02-004 | Nearby public carry-down, one launch, no trailered ramp lanes | Legal vehicle waterfall parking (NULL fields), signed safe walking line, opening |
| DNR access A-02-010 | Distinct upstream public launch | MUST NOT become Whitefish Falls arrival |
| Munising bureau | Unimproved <=15-min trail exists as regional visitor claim | Full lawful parking-to-overlook corridor and current conditions |
| Unrelated Whitefish River Township Park listing | Separate waypoint about 4.91 km east | No legal route to natural falls from that location |

**No public waterfall guide is promoted.** All parking, complete footpath, designated viewpoint and current opening gates remain false. Natural-feature GIS points, water-access facility points, and old field locations are never offered as driving destinations; no route geometry is published.

## Implementation

- Added data/up-waterfall-whitefish-dnr-evidence.json containing canonical DNR identifiers, raw DNR attributes, exact point source identities, null-aware parking, independent corroboration and safe publication gates.
- Added scripts/build-up-waterfall-whitefish-proof.py (pure Python stdlib) and deterministic data/up-waterfall-whitefish-dnr-proof.json with independently checked Haversine straight-line distances and explicit A-02-004 vs A-02-010 provenance. No Python runtime service, Redis, Supabase, paid API or network refresh from builds.
- Added source-backed bespoke research page /upper-peninsula-waterfalls/research/whitefish-falls-dnr-access-review/ with dark geographic proof panel, six access checkpoints, original DNR source links, decision-first copy, accessible mobile layout and verified alternative. **noindex WebPage**, not a public attraction or sitemap entry.
- Updated data/up-waterfall-reconciliation.json, data/up-waterfall-inventory-ledger.json, public/assets/up-waterfall-access-reviews.json (opt-in research pin) and deterministic data/up-waterfall-review-queue.json.
- Added tests/up-waterfalls-issue1258-b62-whitefish-access.test.js and waterfall Chromium mobile/map smoke.
- Inventory remains **74 curated, 67 exact GIS linked, 94 unresolved**; no changed existing visitor parking or child guide.

## Next action to clear access

1. Obtain written confirmation from **DNR Parks and Recreation / Van Riper State Park** that visitor parking is permitted for falls sightseers at A-02-004, with capacity, signed lot boundary, posted restrictions and present/seasonal rules.
2. Verify **road jurisdiction and legal vehicle access** at the actual DNR site, not River Road from an old tourism guide or the unrelated A-02-010 facility.
3. Secure the **land-manager-approved parking-to-falls walking route and safe viewpoint** (or written evidence that public water-access parcel may be used for an informal viewpoint) without inventing a river crossing.
4. Publish a separate indexable falls guide only after these gates pass, then test real visitor journey and drive/parking alternatives.

No agency has been contacted or provided new field inspections by this build.

## Source URLs

- Michigan named waterfall GIS MapServer/7: https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7
- DNR LOTS managed parcels #1122650: https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRLOTSParcelsOPENDATA/FeatureServer/2
- DNR State Sponsored Developed Boating Access Site layer (records A-02-004 and A-02-010): https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNR_State_Sponsored_Developed_Boating_Access_Sites_Public_View/FeatureServer/0
- Munising Visitor Bureau: https://www.munising.org/activities/whitefish-falls/
- Independent photographed Whitefish Falls field visit: https://www.miroadtrip.com/locations/whitefish-falls
- GNIS-derived independent named place point: https://topoquest.com/place/michigan/populated-place/trenary/1621941
- Alternative with verified visitor parking/boardwalk and seasonal limits: https://www.michigan.gov/recsearch/parks/laughingwhitefish

## Release gates

1. python3 scripts/build-up-waterfall-whitefish-proof.py --check
2. node scripts/build-up-waterfall-review-queue.mjs --check
3. node --test tests/up-waterfalls-issue1258-b62-whitefish-access.test.js
4. Full npm run verify:all, source and legal-route regressions, waterfall mobile and map Chromium smoke, SERP name protection, Vercel preview build, audited emitted public HTML and main production check.
5. No traffic, CTR or visitor outcome gain is claimed from the source investigation alone.
