# Pukaskwa Hattie Cove: exact OSM node-junction audit
**Checked:** November 1, 2026 · **Source-reliability class:** community OSM mapping, not signed trailhead or Parks Canada surveyed GPS · **Owning site:** https://chrisizworski.com/pukaskwa-national-park/

## Investment question and result
Can the named partial OpenStreetMap hiking ways be connected to a **recorded** campground service road or another named public hiking way using original source node IDs, instead of guessed map-line geometry?

**Yes for ten source relationships across eight unique OSM nodes and five previously approved named trail names. No for signed trailhead certification or a route from Visitor Centre parking.** Repeated shared nodes are counted once for geographic evidence but appear under each relevant hike.

## Fresh primary source checks
- Parks Canada official frontcountry day hiking, eight routes, time/distance return from Visitor Centre: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking
- Parks Canada Visitor Centre day-use parking: https://parks.canada.ca/pn-np/on/pukaskwa/visit/services/boutique
- The Parks Canada Hattie Cove illustrated walking-trail map: https://pcweb2.azureedge.net/-/media/pn-np/on/pukaskwa/WET4/activ/maps/Carte-map-HCCAT.jpg
- Parks Canada 2025 visitor-guide illustration: https://parks.canada.ca/-/media/pn-np/on/pukaskwa/pdf/2025/pdf-visitor-guide-2025---english.pdf
- Parks Canada Trails APCA open datasets and Open Government Licence: https://open.canada.ca/data/en/dataset/64a90e8d-5bc0-4027-8645-b5881b4068d4
- Public Parks Canada current/deprecated GIS intersection count, queried independently November 1 for bounding envelope west=-86.36, south=48.54, east=-86.22, north=48.64, WGS84: 0 current and 0 temporary trail features. Queries:
  - https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/vw_Trails_Sentiers_APCA_V2_FGP/FeatureServer/0/query?where=1%3D1%26returnCountOnly=true%26f=json
  - https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/Trails_Sentiers_APCA_Temporary_Temporaire_APCA_OpenOuvert/FeatureServer/0/query?where=1%3D1%26returnCountOnly=true%26f=json
  - **These display-only reference strings omit the bbox request arguments; the explicit bbox method above is part of the audit.**
- Parks Canada Interest Points public GIS, 15 bbox points checked Nov 1, no public point named a signed Hattie Cove hiking-trail entrance; approved day-use parking remains object 1005: https://services2.arcgis.com/wCOMu5IS7YdSyPNx/arcgis/rest/services/Interest_Point_Interet_APCA_OpenOuvert/FeatureServer/0
- Parks Canada last dated conditions: https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions . Ordinary day-hike positive reports dated October 12 are not fresh November access. The White River Suspension Bridge trail remains closed by the October 22 report.
- OSM 0.6 **live source fetched** Nov 1 at https://api.openstreetmap.org/api/0.6/way/742973686/full , other named way URLs below, and https://api.openstreetmap.org/api/0.6/node/6949507750/ways . These establish exact node membership and matching coordinate values; original edit times are separate from today's retrieval. Licence https://www.openstreetmap.org/copyright / https://opendatacommons.org/licenses/odbl/1-0/ . No unlicensed AllTrails/Wikiloc geometry copied.

## Original OSM path graph: eight unique junction nodes

| Named trail and community junction | Original OSM node | Verified first way | Verified adjoining way | Evidence type |
|---|---|---|---|---|
| Boardwalk Beach → South Loop service road | [4411571772](https://www.openstreetmap.org/node/4411571772) | [1307756994](https://www.openstreetmap.org/way/1307756994) Boardwalk Beach | [443602401](https://www.openstreetmap.org/way/443602401) South Loop | shared OSM node, path ↔ campground road |
| Boardwalk Beach ↔ Beach Trail | [6949726638](https://www.openstreetmap.org/node/6949726638) | [742332531](https://www.openstreetmap.org/way/742332531) Boardwalk Beach | [1434966490](https://www.openstreetmap.org/way/1434966490) Beach | shared OSM node, named footways |
| Southern Headland ↔ campground service road (also unnamed OSM footway and short path) | [6949507750](https://www.openstreetmap.org/node/6949507750) | [742973686](https://www.openstreetmap.org/way/742973686) Southern Headland | [742318982](https://www.openstreetmap.org/way/742318982) service road | shared OSM node, path ↔ campground road |
| Southern Headland ↔ Beach Trail | [4411571777](https://www.openstreetmap.org/node/4411571777) | [769800690](https://www.openstreetmap.org/way/769800690) Southern Headland | [1434966490](https://www.openstreetmap.org/way/1434966490) Beach | shared OSM node, named footways |
| Bimose Kinoomagewnan ↔ unnamed campground service road | [10200596433](https://www.openstreetmap.org/node/10200596433) | [1115333798](https://www.openstreetmap.org/way/1115333798) Bimose | [443605468](https://www.openstreetmap.org/way/443605468) service road | shared OSM node, path ↔ campground road |
| Bimose Kinoomagewnan ↔ North Loop service road | [10200614934](https://www.openstreetmap.org/node/10200614934) | [1115333798](https://www.openstreetmap.org/way/1115333798) Bimose | [72003674](https://www.openstreetmap.org/way/72003674) North Loop | shared OSM node, path ↔ campground road |
| Beach Trail ↔ North Loop service road | [6954921565](https://www.openstreetmap.org/node/6954921565) | [1434966491](https://www.openstreetmap.org/way/1434966491) Beach | [72003674](https://www.openstreetmap.org/way/72003674) North Loop | shared OSM node, path ↔ campground road |
| Manito Miikana ↔ Beach Trail | [6954949495](https://www.openstreetmap.org/node/6954949495) | [742973685](https://www.openstreetmap.org/way/742973685) Manito Miikana | [1434966489](https://www.openstreetmap.org/way/1434966489) Beach | shared OSM node, named footways |

The ten records presented to a visitor repeat the Beach/Southern and Boardwalk/Beach nodes for both selected hike contexts. Original service roads had highway=service and no explicit restrictive access tag in the fetched way elements, but **absence of a private tag is not evidence of legal walking permission**, signed entrance or open park facilities. The park is seasonal.

These shared-node relationships are stronger evidence than nearest-point proximity, yet they do NOT establish navigation-grade route connectivity from the Visitor Centre lot. We deliberately do NOT publish OSM service-road centerlines, new route polylines, node pins, driving directions, GPS downloads, elevations or travel estimates. Three of eight outings (Fire Walk, Combination and closed White River bridge) have no independently reviewed full-route junction representation. No sensitive cultural features are mapped or named by coordinate.

## Design options and Experience OS V1.2 state matrix
1. **Option A, line completion:** connect way endpoints to day-use parking with nearest-neighbor geometry and produce a continuous hiking track. **Rejected.** Would imply verified signed, legal access and safe turns without source.
2. **Option B, source separation (selected):** keep real OSM trail overlays plus official original map, but add a compact, expandable "which original way meets which" provenance note tied to the existing selected hike. No pin is labelled trailhead. Official Visitor Centre origin remains separate. Opens original OSM node/way source pages on request and requires acknowledgment of uncertainty.

| State | Source and choice | UI | Safety |
|---|---|---|---|
| A Southern Headland default | Official start + 2 OSM relations | Headland description, OSM shared-node link | Not a parking route |
| B Boardwalk Beach, 30 min easy | 2 distinct mapped relations | South Loop + Beach Trail links | Not a signed boardwalk entrance |
| Bimose, 2h forest | 2 mapped service-road junctions | Both road-adjacency sources | No public access/road guarantee |
| Manito | Named trail ↔ Beach Trail junction | One source link set | No source-backed Visitor Centre connector |
| Fire Walk / Combination | No approved node representation | Helpful unknown explanation and official map | No invented connector |
| White River closure | Explicit closure from dated Parks Canada report | No junction details presented | Closed route excluded |
| A → B → A | Same stable selected hike ID | OSM facts and primary hike both update, restore | Never promotes access state |
| No JS / no map tiles / OSM GeoJSON down | Original map + static headland source links; JS evidence independent of tiles | Still useful visitor reference | No blank map or guessed line |

## Verification contract, no overstated results
- Static browser module public/assets/pukaskwa-junction-evidence.mjs pins original source IDs, pairs and ODbL; no lat/lon or route output.
- Node tests cross-check each original named way's existing **published georeferenced coordinates** with exact OSM source-node values to within 0.12 metres and forbid new way IDs, unverified sources and new trailhead pins.
- Existing real Chromium map QA at 360, 390, 768 and 1366 px checks actual tiles, seven official GIS place pins, 14 approved OSM way shapes, A→B→A source identity, no-JS, OSM source outage and both tile providers failing.
- No new canonical, ItemList entry, sitemap page, personal data capture, Redis, ads or layout clone. Original source map remains primary. No GSC/GA4/AdSense outcome is measured.
- **Next research gate:** only field-confirmed or independently trusted, licence-compatible signed trail-start and legal parking-to-walking connections should unlock a true route navigation experience. An OSM shared node by itself does not.

**Status for this commit:** source research complete, implementation ready for CI; exact-head QA and production status must be filled after checks. No unverified release claim.
