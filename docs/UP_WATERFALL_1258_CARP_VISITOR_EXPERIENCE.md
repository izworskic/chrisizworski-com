# Issue #1258 — Carp River Falls: visitor-first managed overlook experience

**Reviewed November 1, 2026.** Public internet sources only. No owner outreach, photography reuse, invented legal corridor or GPS trail geometry.

## Visitor problem and decisive evidence

The original source queue held Marquette Carp River Falls #169 as a risky, unverified gorge-bottom scramble. Continued research found the NTN's completed **Carp River Falls Trail** and maintained waterfall viewpoint, a materially better route choice that removes the motivation to descend a hazardous gorge. The NTN director described the new trail connection in a public August 15, 2024 report. Travel Marquette separately identifies official NTN South Trailhead parking, a designated crossing on M-553, and the traditional nonmotorized Mount Marquette Road / Morgan Falls continuation to Carp River. Travel Marquette also publishes an authentic photograph of a visitor at a wooden waterfall viewpoint fence; it is **linked, never copied**.

Source links:
- [NTN South Trails](https://www.noquetrails.org/south-trails/)
- [Travel Marquette waterfall descriptions, parking and highway-crossing caution](https://www.travelmarquette.com/outdoor-adventure/waterfalls/)
- [NTN director's 2024 Carp River Falls Trail / Raging River completion announcement](https://www.uppermichiganssource.com/2024/08/15/ntn-hosts-business-after-hours-cuts-ribbon-updated-pavilion/)
- [Travel Marquette authentic overlook photograph](https://www.travelmarquette.com/listing/carp-river-ntn-south-trails/514/)
- [Travel Marquette 2025 waterfalls sheet, older continuation to Carp](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/marquettemi/waterfalls10_2025sheetA_eb3543b3-af0c-44a9-9a3b-140f872272db.pdf)
- [MI state waterfall GIS layer](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7)
- [2026 source identity review](UP_WATERFALL_1258_BATCH_46_MARQUETTE_ACCESS.md)

## The three distinct geographic features

1. #169, **Carp River Falls near Marquette**. State GIS natural feature 46.503807,-87.44655 approximately 18 metres from Travel Marquette's waterfall point. The GIS field **MORGAN CREEK** is a waterway-label conflict; no GIS pin can substitute for a visitor parking waypoint.
2. #166, **Morgan Falls**, separate established Morgan Creek waterfall with public NTN South lot and designated highway crossing. Its existing indexable guide remains intact.
3. #163, **Upper Carp River Falls**, near Ishpeming. Its old approach near utility property has reported No Trespassing signs. It remains research-only, with no visitor route.

## Page, decision engine, and discovery

- `/upper-peninsula-waterfalls/carp-river-falls/`: independently themed river atlas with four visitor choices: managed Carp River overlook, Morgan Falls, rejected gorge-bottom attempt and rejected Ishpeming upper-falls misnavigation. Three seasonal considerations, accessible radio/selection, copy-plan action and server-rendered initial decision.
- Source-backed CARTO/Leaflet point map only for natural geographic falls. **No generated visitor route polylines, waterfall-to-parking driving URLs, guessed parking/crossing latitude-longitude or club/private road detours.**
- Destination included in 72 curated waterfall records and 70 indexable waterfall sitemap URLs. Crosslink from Morgan Falls and the primary waterfall explorer; page uses the existing ad script and author Person identity.
- Five verified **published access-source axes**: manager, visitor permission to maintained public trails, NTN South parking, visitor-walking context and distinct natural location. This does NOT claim an exact verified track to the 2024 overlook, ADA accessibility, current winter opening, safe scrambling or live flow.
- Preserve Batch 46 research page as `noindex,follow` documentary record and do not place it in sitemap.

## Inventory

Before: 71 curated, 65 exact GIS links, 96 pending (161 named features).
After: **72 curated, 66 exact GIS links, 95 pending**. Research overlay automatically excludes published GIS #169 from unverified candidate pins because `data-gis-oid=169` is on its card.

## Release gate

- `node scripts/build-up-waterfall-review-queue.mjs --check`
- `node --test tests/up-waterfalls-carp-river-experience.test.js` and all other waterfall tests
- Waterfall mobile/browser smoke, full repository validation and emitted HTML audit
- Name search-surface protection and Vercel preview verification
- Production verification after merge
- Current NTN signage and authoritative georeferenced trail alignment remain future evidence needed before introducing a trail path on the map
