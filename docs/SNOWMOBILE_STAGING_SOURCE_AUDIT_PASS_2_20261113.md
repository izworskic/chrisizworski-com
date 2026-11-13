# Snowmobile staging access: source-completeness and safety pass 2
**Reviewed November 13, 2026.** Extends the initial 14 DNR county-map
reconciliations; never claims that a printed map pairing proves a plowed,
accessible or lawful on-the-ground connection.

## What changed
- Reconciled eight additional current Michigan DNR county-map parking entries
  to individual, independently checked public-owner DNR parking GIS records.
- Replaced the old archived county PDF links with the live DNR county-map
  collection at:
  https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/
- Corrected Chippewa county map *publication/update date* from incorrectly
  recorded August 25 to February 10, 2026. This is not a parking inspection.
- Rejected official parking GIS points where the source itself says
  "Unsure of Location", "Location Unknown", or the name is `<Null>`.
  Specific live examples: DNR OBJECTIDs 1038, 766 and 1471. Do not direct
  trailers to unlocatable/explicitly uncertain points.
- Gaylord Gateway (DNR asset 242) is corroborated by a *separate* City of
  Gaylord recreation-plan inventory plus current Gaylord visitor bureau.
  It is described as public trailhead infrastructure with car/trailer
  parking and restrooms. No direct physical connector or legal crossing
  is inferred, and no LP trail number is manufactured.

## Eight additional county-map parking associations

| DNR GIS OBJECTID | County | County map parking legend | Road intersection text independently matching GIS |
| --- | --- | --- | --- |
| 798 | Chippewa | UP489[2] | South Turkey Farm Rd / Glen Cove Rd |
| 325 | Alger | UP8, UP88[1] | North of Adams Trail / east of H-58 |
| 275 | Cheboygan | LP7, LP9[1] | Nicolet St east of Mackinaw Crossings Dr, Mackinaw City |
| 1473 | Cheboygan | LP7[2] | South State Hwy / White Rd, Indian River |
| 730 | Lake | LP344W, LP344E[2] | West 16th Street / South James Rd |
| 84 | Wexford | LP6[1] | US-131 Business Route / US-131 |
| 795 | Wexford | LP638, LP373[2] | Caberfae Rd north of M-55 |
| 1059 | Wexford | LP37[4] | 23 Rd south of West 32.5 Rd |

Total paired county-map assets after pass 2: **22**. A paired location
is still NOT a confirmed open trail entrance. Numbers are DNR official
trail identification, not an endorsement of safe passage from the lot.

County PDFs reviewed:
- https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/snowmobile_chippewa.pdf (updated February 10, 2026)
- https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/snowmobile_alger.pdf (updated February 9, 2026)
- https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/snowmobile_cheboygan.pdf (updated March 2, 2026)
- https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/snowmobile_wexford.pdf (updated March 2, 2026)
- https://www.michigandnr.com/Publications/PDFS/ForestsLandWater/SnowmobileTrailMaps/countymaps/snowmobile_lake.pdf (updated March 2, 2026)

For Mackinaw City, the GIS asset's **North Central State Trail** name
does not contain the county map's LP7/LP9 numbers. The crosswalk accepts
that **specific** named trail alias only with the corresponding DNR asset ID
and exact Nicolet / Mackinaw Crossings road-note checks. A generic
alternate rail-trail name fails closed.

## Gaylord Gateway — separate public trailhead corroboration

DNR GIS: OBJECTID 242, *Snowmobile Trail LP / Gaylord Gateway Trailhead*,
`Snowmobile Parking & Staging in winter. Heated restrooms.`

City of Gaylord recreation-plan inventory: the North Central State Trail
trailhead at **360 W. Main St** is managed by Otsego County and has
parking, restrooms and a pavilion:
https://cityofgaylord.com/wp-content/uploads/2024/02/City-of-Gaylord-Recreation-Plan.pdf

Gaylord area tourism confirms the new downtown trailhead on the north
side of M-32 across from the visitor center, describes staging parking,
and specifically warns that downtown sidewalks are not snowmobile
routes and that crossing M-32 is restricted except at the trail/rail
crossing:
https://www.gaylordmichigan.net/pick-your-season/winter/snowmobile/

Architecture and engineering project's site record independently mentions
car/trailer parking, year-round restrooms, MDNR ownership and Otsego County
operation:
https://www.c2ae.com/markets/recreation/gaylord-trailhead

Display grade: `OPERATOR_PAIRED` = public operator/tourism corroboration.
It is prioritized alongside `DNR_MAP_PAIRED` but does not create a route
edge or assert anything about plowing, daily lot access, active permit
rules, trailer capacity or a legal crossing on a selected travel day.

## Release contract

- The official DNR parking API is unchanged except for rejecting uncertain
  source points, preventing misleading directions.
- Regional HTML, canonical URLs, AdSense, search discovery, Rust routing,
  closure handling, and NOAA surface evidence stay untouched.
- Automated unit tests verify all **22** crosswalk records, additional
  aliases, changed-road conflicts, Gaylord source checks, uncertain
  source exclusions, and main source dates.
- Playwright at phone and desktop widths verifies source labels,
  independent Gaylord public staging, preservation of unverified access
  caveats, and no invented routing or stale failure suggestions.
