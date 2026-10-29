# Sleeping Giant Geographic Reconciliation: exact-source research, without false navigation

**Review:** October 29, 2026. **Status:** Seven detailed government trail features, four sourced trail itineraries and one independent parking candidate have been geospatially reconciled, with unresolved links explicitly blocked. **No production visitor map or driving directions are authorized.**

## Authoritative sources and cartographic limitations

- Ontario OTN Trail Segment GIS (Layer 19): https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/19
- Ontario OTN Access Point GIS (Layer 20): https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/20
- Ontario Parks official visitor distances and cycling permissions: https://www.ontarioparks.ca/park/SleepingGiant/activities
- Ontario Parks bike-and-hike transitions and racks: https://blog.ontarioparks.ca/bike-hike-sleeping-giant/
- Ontario Parks South Kabeyun signed lot: https://www.ontarioparks.ca/park/SleepingGiant/camping
- Official **historical** 1:50,000 recreational map inspected visually: https://www.ontarioparks.ca/pdf/maps/sleepinggiant/trails_map.pdf
- Independent OpenStreetMap-republished Kabeyun parking polygon centroid: https://mapcarta.com/W151289776 ; OSM way https://www.openstreetmap.org/way/151289776

Government geometry is used under the [Open Government Licence – Ontario](https://www.ontario.ca/page/open-government-licence-ontario). The independent OSM candidate is attributed to © OpenStreetMap contributors under ODbL. It must not be described as an Ontario Parks official coordinate.

The source layer is an **OTN mapping dataset**, not a surveyed signed-intersection map. A reported source accuracy of around 10 metres, local trail revisions, map generalization and crossing grade differences preclude claiming navigational-meter certainty. Full-vertex retrieval does not resolve these shortcomings. Some OTN geometry can deviate from official trip lengths, and its generic cycling flags do not override the park's trail-specific rules.

## Data investment completed

`data/sleeping-giant/otn-unsimplified-core-research.geojson` contains seven park trails, **queried individually by their original OBJECTID** and checked against the same OGF_ID in the existing simplified research inventory. Queries used `returnGeometry=true`, `outSR=4326`, `geometryPrecision=6`, and **NO maxAllowableOffset**. Shapes are rounded to 6 decimal places but not generalized by ArcGIS's simplification parameter.

| Government source feature | OTN OBJECTID | Old simplified vertices | Unsimplified vertices |
| --- | ---: | ---: | ---: |
| Kabeyun Trail | 228033 | 400 | 2,597 |
| Sawyer Bay Trail | 284289 | 80 | 2,480 |
| Talus Lake Trail | 283985 | 121 | 523 |
| Top of the Giant Trail | 284097 | 75 | 366 |
| Head Trail | 284081 | 24 | 179 |
| Nanabosho Lookout Trail | 284241 | 19 | 92 |
| Sea Lion Trail | 284257 | 9 | 38 |

This covers the trunk and destination spurs required to compare Top, Head, Nanabosho and Sea Lion. **It is not every park trail**. The remaining 23 OTN park trails remain in the original simplified research inventory and do not become routable through these seven paths.

## Eight mapped intersection candidates

The new `lib/sleeping-giant/geometry-reconciliation.cjs` matches the trail geometries and records approximate snapped candidate intersections for:

1. Kabeyun / Sawyer Bay at the shared South Kabeyun mapped trail origin
2. Kabeyun / Talus (the official cycling cutoff relationship)
3. Sawyer Bay / Talus
4. Talus / Top of the Giant
5. Kabeyun / Head
6. Talus / Nanabosho
7. Kabeyun / Sea Lion
8. Sawyer Bay / Kabeyun near the Head's approach

These map to within **1.5 m of the source polylines**. This measures **source feature geometric continuity only**, not GPS survey accuracy, legal/usable crossings, signed cutoff positions or current trail condition. **Zero of the eight is certified as visitor turn guidance.**

## Four review-only destination shapes and the critical distance mismatch

The geometry engine extracts ordered mapped sections for these source-supported itineraries. It tags each section as Ontario Parks-authorized bikeable trail or walking-only trail and computes a **two-way GIS polyline length**. It always displays the **official complete parking-to-destination round-trip** separately.

| Itinerary | Government polyline components | Owner-controlled official total | Why not routable |
| --- | --- | ---: | --- |
| Top of the Giant | South Kabeyun bike, Talus walk, Top Trail walk | 21.8 km return | Parking-to-mapped-trail connection unresolved |
| Head | Sawyer Bay bike, short Kabeyun connector walk, Head Trail walk | 16.2 km return | Same parking gap; signed walk transition coordinate unverified |
| Nanabosho | Sawyer Bay bike, Talus walk, Nanabosho walk | 17.0 km return | Same parking gap; signed walk transition coordinate unverified |
| Sea Lion | Kabeyun walk, Sea Lion walk | 2.4 km return | Same parking gap; separate short spur |

**Major discovery:** The GIS starts the Kabeyun/Sawyer network around **430 m straight-line from an independent mapped parking-area center**. All four complete mapped itineraries fall short of the park's published parking-to-destination returns, by roughly **0.6–0.8 km in total**. This pattern suggests an unresolved South Kabeyun access leg or official-vs-GIS source definition difference. It does **not** prove an exact missing walking route, and a straight line across this gap cannot be used as a road or trail.

The independent candidate is the OpenStreetMap parking feature **way 151289776**, centered approximately at **48.34062, -88.82183**. The Ontario OTN access point **OBJECTID 6001 / OGF_ID 319510517**, at **48.340786, -88.821308**, is roughly **43 m** away. The closeness is encouraging but does not independently identify the **signed vehicle entrance** or public trail connector, or ensure current operating conditions. The published park gatehouse at **48.360165, -88.798065** is a different facility and must never substitute for this parking lot.

Additionally, the Mapcarta representation says access is restricted or permission-controlled. Ontario Parks requires a displayed permit. **No public directions or parking availability inference is made based solely on this match.**

## Implemented package

- `lib/sleeping-giant/geometry-reconciliation.cjs` validates all source IDs, measures line joins, extracts four research route polylines, separates bike from walk trail sections, calculates measured-vs-official distances, and blocks all navigation and current-access assertions.
- `tests/sleeping-giant-geometry.test.js` verifies source detail, government IDs, continuity thresholds, route mismatch visibility, legal bike/walk breakdown and corruption/false authorization failures.
- `scripts/export-sleeping-giant-geometry.mjs` exports `geometry-reconciliation.json`, `research-trail-sections.geojson` and **`geometry-review.html`**, an offline, interactive HTML/CSS/JavaScript internal GIS reviewer. It includes four route selectors, official vs GIS distance comparison, mode-coloured polylines and a separately labelled approximate parking point. It has a noindex tag, **never draws the missing parking connector**, and has no Google Maps driving action.
- `tests/sleeping-giant-export.test.js` asserts the QA artifacts are research-only and cannot be confused with public navigation output.
- Dedicated GitHub Actions attaches the QA viewer and source audit files as a **downloadable workflow artifact**. No public website URL, ad settings, sitemap, tool hub, or canonical has changed.

## Next factual gate before visitor directions

The **signed entrance coordinate**, highway-to-lot driveway and walkable parking-to-Kabeyun trail link still need confirmation from independent authoritative sources. Then the exact signed legal bike-to-walk boundary must be inspected against original park georeferencing, and dated Ontario Parks access notices/road restrictions must be attached before visitors receive live advice. The historic Ontario Parks PDF has an approximate map scale of 1:50,000 and cannot alone provide survey-grade coordinates.

Until those gaps close, reuse the source geometry for **read-only, clearly labeled cartographic illustrations and source comparisons**, not GPX exports, shortest-path directions, arrival-time estimates or trail-open/safe claims.
