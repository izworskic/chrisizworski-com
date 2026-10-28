# U.P. waterfall build · Issue #1258 · Batch 03

**Base:** merged Batch 02 (main 2321ddda8c4b88b726f643e9181151ff89e21ef5) · **Branch:** feature/up-waterfall-issue-1258-batch03-20261028 · 2026-10-28

## Added two fully sourced state-park visit guides
- **Overlooked Falls**, state GIS #97: DNR visitor newsletter confirms waterfall under half a mile from Little Carp River Road lot. Separated arrival from stream GIS point, tied to nearby Greenstone Falls, and warned of Dec. 1 road closure.
- **Trap Falls**, state GIS #118: DNR's 2023 visitor brochure estimated a 3.2-mile round trip from Government Peak Trailhead on M-107 (2–5 hours); its PDF is now a retired URL. The currently linked DNR trail description independently confirms Government Peak Trail reaches Trap Falls but does not restate the old mileage. Distinguishes the partial falls hike from the longer Government Peak Trail; no invented short route.
- Every published guide has five source axes (manager, public access, parking, trail and waterfall location), static readable HTML and explicit current-conditions uncertainty.

## Research map improvement
- Exported independently reviewed access categories and evidence summaries from the source ledger into the optional geographic research overlay. Visitors can see why a location is private, needs route verification, or has a geographic conflict, without generating a visitor page or offering parking coordinates for unverified GIS locations.
- Original overlay remains opt-in and the map styling, verified card layouts, ads and existing canonicals remain unchanged.

## Inventory checkpoint
- 43 curated destinations: 42 child guides plus Tahquamenon specialist handoff.
- 161 Michigan state GIS candidates; 35 exact feature-ID linked to curated destinations and 126 not matched. Counts are not unique remaining waterfalls.
- Known research blockages from Batch 02 remain; do not infer access from the new popups. USGS crosswalks remain scientific/identity evidence only.

## QA and release
- Dedicated regression tests added. Full repository verification, browser smoke and public audit must run on exact head before merging.

Sources: https://www.michigan.gov/recsearch/parks/porkies ; https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf ; https://www.michigan.gov/oac/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-Newsletter-2024.pdf?hash=3F08405CEDF6C75A0E13BD7C6E8B2E67&rev=bb3a54a58cc94556b876362a02a3b0d7 ; https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf ; https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7
