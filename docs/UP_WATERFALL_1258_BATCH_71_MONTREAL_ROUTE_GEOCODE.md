# Issue #1258 / B71 — Montreal Falls: independent summer traverse, historic Upper route and unsafe geocode

**Review:** November 5, 2026. **Outcome:** Correct an overly restrictive previous statement about historical Upper Montreal access; add recent firsthand Lower Falls route evidence and prevent a generic tourist brochure geocode being confused with either waterfall or public parking. Retain both locations as **research-only / noindex / no auto-navigation**.

## Major finding 1: 2023 Visit Keweenaw printed an Upper Falls continuation

[Keweenaw Waterfalls brochure (May 17, 2023)](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_summer_waterfalls_brochure_20230517_WEB_LOW_1__15f13fff-fd1f-4b37-9438-cd0a32dbaf4a.pdf), **first-page text and screenshot inspected**, describes a challenging ~1-mile walk west from Fish Cove to *Lower Montreal*, followed by **0.5 mile north along the river to Upper Montreal**. This explicitly rebuts the previous source-ledger field asserting no historical Fish Cove access description for Upper. It does **not** verify a continuous 2026 trail, proper Upper GIS point, legal pedestrian right, Upper viewpoint, or a current signed path.

The same brochure describes an **alternate** driving approach via Lake Manganese/Clark Mine/Burma/Mandan roads. [Visit Keweenaw's June 9, 2023 detailed Montreal guide](https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/) instead describes the end of US-41 via Mandan Road to Fish Cove. Do not conflate road junctions or generate an unsourced composite drive. Both descriptions are tourism guides, not authoritative roadway ownership/legal-use determinations.

## Major finding 2: the brochure's only Montreal marker is not the falls

Brochure point: **47.3899, -87.8305** (a generic Montreal Falls pin without assigned parking/waterfall role).

- Michigan lower GIS #139: **47.392581, -87.841233**. Haversine direct separation **861 m**.
- Michigan upper GIS #140: **47.397970, -87.836302**. Direct separation **998 m**.
- Upper versus Lower GIS points: **705 m**.
- Separate source-location dispute remains: GIS Upper #140 about **267 m** away from the field-observed Upper cascade and GNIS variant. Distance alone does not resolve which waterfall is depicted.

**Important:** The source does not identify 47.3899, -87.8305 as a surveyed lot, trailhead or falls point. A mapping system must not route cars there or silently substitute it for either natural-feature point. All these distances are **straight-line geometry**, not driving or hiking route lengths.

## Major finding 3: summer 2026 witness supports physical Lower access but not legal road use

[Reddit /r/upperpeninsula trip report published July 6, 2026](https://www.reddit.com/r/upperpeninsula/comments/1uoz1ei/trip_to_montreal_falls_report/) recounts a **bicycle + hike** trip from end of US-41 via rough Mandan/Fish Cove roads to a small parking area. The visitors reached Lower Montreal after an intermittently visible rocky lakeshore path and several small creek crossings, but abandoned Upper because the path was hard to follow. A separate commenter reported fallen trees/overgrowth on Upper approaches during June 2026. Source category: **unverified firsthand visitor account**; no parcel ownership, signed route, November 2026 gate, parking rights or current trip safety certification.

This distinction matters: a recent person completing a route is meaningful evidence of physical summer access but cannot grant a lawful vehicle easement, justify passenger-car navigation, or prove a winter route open. Never endorse a river crossing, Smiths-Fisheries private road, alternate ORV-only spur or unverified road shoulder parking as a shortcut.

## Separate operator access classification

[Keweenaw ATV Club 2024–26 map](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KATV_Map_2024_2026_1d88ffea-9049-4449-8edf-e11701ce92d4.pdf) distinguishes county roads, woods roads, two tracks and designated ATV trails; says northern Keweenaw designated ATV routes generally operate May 1 through November 1 and depend on revocable landowner permissions. It is an **ATV network map**, not an authorization for pickups, jeeps or street-legal cars to use exclusive ATV trail segments. [Keweenaw ATV Club June 22, 2026 update](https://www.keweenawatvclub.com/map-update-with-openclosed-trails/) corroborates dates and private-easement caveats. Do not infer the reciprocal blanket closure of all conventional-use county/forest roads from ATV season alone.

## Implementation

- `data/up-waterfall-montreal-access-evidence.json` batch B71: source-specific historical Upper correction, three classified coordinate roles, recomputable Haversine distances, summer firsthand physical access distinct from legal, visitor safety gates and outstanding agency evidence.
- Lower / Upper noindex research pages updated with actionable visitor difficulty and geocode caveats. **Not** a public destination route.
- `tests/up-waterfalls-b71-source-geocode.test.js` recalculates distances, asserts the Upper source correction, and rejects promotion based on a brochure coordinate or a bicycle trip.
- No indexable waterfall card, curated inventory, map pin, sitemap, SEO promotion, vehicle routing, ads, author schema, Python nearby index or telemetry changes.

## Unmet threshold

Written current authority from the DNR and/or Keweenaw County Road Commission establishing all connecting **passenger-vehicle** rights and present gate status, explicit current lawful **Fish Cove gravel lot** public parking, and DNR/TNC **continuous legal Lower Montreal shoreline walking corridor**, plus independent as-built Upper route/feature resolution. Two agency inquiries exist **only as unsent Gmail drafts**, not as replies. Do not imply the authority supplied an answer. Hold the publication gate until actual verification.
