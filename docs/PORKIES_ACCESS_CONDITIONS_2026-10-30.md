# Porcupine Mountains: verified access-source gate (October 30, 2026)

## Objective

Show which evidence is genuinely official and source-corroborated; do **not** conflate mapped parking, trail names, road corridors and bridge assets into a route that is guaranteed open. This is an intentionally noindex, visitor-readable research build.

## Source review

- **Official park road rule:** https://www.michigan.gov/recsearch/parks/porkies . Vehicle closure December 1 into late spring for M-107 at Whitetail and South Boundary from Headquarters Road toward Pinkerton. Ontonagon County Road Commission determines reopening. County Road 519 gives *separate western* Presque Isle access, not a through-park connector.
- **Official DNR posted closures:** https://www.michigan.gov/dnr/about/newsroom/closures . Site explicitly warns intermittent closures may not be posted, so no entry does not establish an open trail.
- **Official GIS closure lines:** https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/0
- **Official GIS temporary reroutes:** https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/1
- **Official bridge-asset inventory:** https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/0
- **DNR GPS map with unbridged crossing and suspension bridge symbols:** https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf

October 30, 2026 ArcGIS envelope-query research (WGS84 `-90.06,46.59,-89.55,46.93`): zero DNR temporary closure line features and zero reroute line features returned. **This is not a positive open/clear inspection.** The same envelope returned **one DNR managed-bridge asset** (OBJECTID 163), catalogued **vehicular** “Snowmobile UP1,” with a **null CONDITION field** and County ownership. Neither a null condition nor no pedestrian bridge record implies bridge or ford safety. This deliberately broad envelope may capture assets beyond the park and is not a precise park-property filter.

Six previously cross-checked parking assets remain visitor-facing under `/porcupine-mountains/access-points.json`; ten other parking assets are held back. Six named DNR trails have a cautious matched parking *reference*, while 15 other trail descriptions lack a separately confirmed named-to-parking relationship. No directions are created to generic DNR trail GIS centroids or unreviewed camp/outpost asset coordinates.

## Implementation

- `public/assets/porkies-conditions.js`: client-side direct query to the two official temporary trail GIS layers plus managed-bridge layer, three-way source status (observed, partial, unavailable), 7-second bounded fetch, date-aware road status, manual refresh. A **zero result reports zero source records only**, never an open trail; no connection/timeout fails to unknown. Queries are only for the current time, not future dates.
- `public/porcupine-mountains/index.html` + `public/assets/porkies-explorer.css`: compact access-truth desk with original source links and timestamp. Twenty-one trail guide cards show matched or unverified parking references. Static fallback remains readable with JavaScript disabled.
- `tests/porkies-conditions.test.js`: GIS source paths and bounded envelope, zero ≠ open, null bridge condition, winter/reopening/November/summer states, user-facing noindex, six named trailhead matches.
- `scripts/verify-porkies-browser.cjs`: explicit deterministic DNR GIS network fixtures, 340/390/1366 viewport checks, 6 verified versus 15 unverified trailhead messages, winter road rule, map, tiles and noJS fallback. The test fixture proves behavior, not live source connectivity.

## Unresolved, deliberately not promoted to “verified”

1. **Actual road openings**: neither the park website nor road GIS offers a stable, machine-readable live gate API that can certify all M-107, South Boundary, Summit Peak and western access segment openings, especially spring. Follow on-site signs, DNR updates and Ontonagon County Road Commission. Future travel dates cannot be certified using a current GIS query.
2. **Parking availability**: asset inventory is a mapped location, not a real-time vacancy, legal parking restriction, snow removal or ADA surface guarantee.
3. **Bridge and ford conditions**: no field-inspected condition or current water levels for park pedestrian bridges, fords and unbridged river crossings. The current GIS managed bridge example is a vehicular asset with null condition and cannot certify backcountry crossing safety.
4. **Backcountry trailheads**: there is no defensible source-grounded parking access for 15 of the 21 named trail references; DNR map symbols and source linework alone do not establish driveable approaches or continuous safe foot routes.
5. **Trail graph topology**: existing 819 hiking fragments have important name/length mismatches and disconnected segments; no turn-by-turn route or hike ETA should be published until reconciled.
6. **Public indexing**: keep `noindex,follow` until verified end-to-end route product and release QA; do not advertise this as a live road, parking or bridge tracker.

**Scope control:** no changes to ads, existing indexable fall color or waterfall URLs, no Redis, no public static JSON falsely stamped “open.” The DNR feeds are invoked only on visitor page load and manual refresh, not by a site-wide costly scheduled deploy.
