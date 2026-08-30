# Isle Royale Interactive Map — build plan

Updated: 2026-08-30

## Product thesis

The page should not be another brochure viewer. It should be the place where a visitor can search Isle Royale once and move between the island's operational visitor geography, boating rules, maritime history, science layers and old cartography without losing source context.

NPMaps is used as the completeness checklist. NPS and other federal/open GIS are used as the preferred geometry sources.

## Research contract / anti-drift gates

This implementation is governed by the deep-research report **“Aggregating NPMaps and Official Isle Royale Map Resources into a Single Interactive Web Map.”** The build must preserve its central rule: the product is a provenance-aware GIS system, not a screen-scraped NPMaps clone.

Two questions must remain independently answerable for every published feature or layer:

1. **What does the map show?**
2. **Where did this geometry come from, how old is it, and is it current, reference, or derived?**

### NPMaps completeness gate

The source manifest must continue to account for the 16 NPMaps product families represented by these canonical catalog records:

- `visitor-web-map`
- `regional-map`
- `rock-harbor`
- `windigo`
- `camping-zones`
- `transportation`
- `shipwrecks`
- `relief`
- `lighthouses`
- `geology`
- `vegetation-detailed`
- `vegetation-simple`
- `quiet-no-wake`
- `anchorage-zones`
- `historic-brochure`
- `historic-windigo`

Operational/fallback records may be added, but they do not replace any of those 16 completeness records.

### Value function

`V = .24D + .20T + .14U + .12P + .10R + .08A + .07S + .05N`

- **D — Decision utility (24%)**: better access, hiking, camping, boating, or orientation decisions.
- **T — Data truth coverage (20%)**: important layers present with authority, vintage, uncertainty, and gaps represented honestly.
- **U — Map usability (14%)**: search, filter, inspect, zoom, recover, tablet/mobile usability.
- **P — Provenance/freshness (12%)**: source, vintage, retrieval/derivation status are visible.
- **R — Reliability/performance (10%)**: fail-soft behavior, no required commercial API key, large layers lazy/tiled.
- **A — Accessibility (8%)**: keyboard, focus, status, and non-map/tabular alternative.
- **S — Search/discovery (7%)**: one canonical Isle Royale intent with crawlable value, schema, and source desk.
- **N — Network fit (5%)**: useful Michigan/Great Lakes handoffs without cannibalizing other tools.

**Release target: 88. Stretch target: 94.** A high score never overrides a hard gate.

### Reach / discovery objective

The page should earn discovery by being the best source-transparent answer for the broad **Isle Royale map** intent and its supporting map needs, while keeping one canonical URL. Reach comes from crawlable layer-family coverage, authoritative citations/provenance, first-party inbound links, schema/entity clarity, and measured behavior after launch—not from spinning up thin duplicate canonicals.

## Canonical intent

**Owner:** `https://chrisizworski.com/isle-royale-map/`

**Primary intent:** interactive Isle Royale map with trails, campgrounds, ferry/water access, visitor places and source-backed specialty layers.

Supporting terms (not separate canonicals): Isle Royale trail map, campground map, Rock Harbor map, Windigo map, lighthouse map, shipwreck map, vegetation map, geology map, ferry map.

## Personas

1. **First-time visitor** — needs the island to make sense before choosing Rock Harbor/Windigo and an itinerary.
2. **Backpacker** — starts with trail/camp relationships and trail-mileage context.
3. **Boater/paddler** — needs docks, anchorages, quiet/no-wake context and official current restrictions.
4. **History explorer** — wants lighthouses, wrecks and historic overlays without cluttering the planning map.
5. **Deep explorer** — wants vegetation, geology, relief and historic map layers with visible vintage/provenance.

## Architecture

### Release 1 — zero-key, static-site compatible

- Leaflet frontend matching the site's proven static-map architecture.
- OpenStreetMap raster basemap with required attribution.
- Public NPS/ArcGIS web-map ingestion at runtime for visitor geometry where available.
- Source-aware classification into trails, campgrounds, visitor services, water routes, maritime history and science/reference.
- Fail-soft local reference anchors.
- Optional OpenStreetMap context load for public visitor POIs.
- Crawlable source/data catalog.
- Search, filters, map-to-list interaction, provenance popups and status messages.

### Release 2 — deep GIS normalization

- Resolve NPS vegetation, geology, quiet/no-wake, anchorage/camping polygons and other GIS downloads.
- Store immutable source copies + SHA-256 manifest.
- Normalize with GDAL/OGR to WGS84 canonical vectors while preserving original CRS/metadata.
- Deduplicate/conflate with source hierarchy.
- Publish stable PMTiles/MBTiles for large layers; do not send huge polygon GeoJSON to every browser.
- Georeference historic/NPMaps-only map artwork only when no better vector source exists; record RMSE and derived status.

### Release 2.5 — Water Intelligence

The route planner must become a trip-decision tool rather than a line-drawing widget.

- **Hiking:** keep the mapped-trail graph + shortest-path behavior.
- **Paddle / small craft:** build a mapped-coastline-aware planning path, bias modestly toward shoreline, and never claim chart-quality navigation.
- **Motorboat:** use the same coastline-crossing guard with a more direct-path bias.
- **Travel Assistant:** turn speed + chosen travel-day hours into day-end markers and a practical multi-day travel estimate.
- **Marine sampling:** choose forecast samples from route distance, not merely the number of manually placed control points.
- **Exposure:** report maximum sampled distance from mapped shoreline and long exposed stretches as descriptive planning context, never as a go/no-go score.
- **Regulations:** reconcile the planned path with the current 22 NPS Quiet/No-Wake polygons.
- **Refuge / stops:** surface nearby mapped campgrounds, docks, harbors and visitor places as planning options.
- **Camp-first itinerary:** for paddle/motorboat routes, qualify overnight recommendations only from loaded campground features that also match the current NPS Boat-In Campgrounds feed; exclude current closure signals, rank candidates around the selected daily travel target, show alternatives, and explicitly render a gap when no qualified camp fits.
- **Per-day context:** split the resolved route into itinerary legs and carry modeled exposure, NPS Quiet/No-Wake intersections, and sampled NWS wind/wave/precipitation context into each day.
- **Scenario editing:** let the user route through a recommended or alternate campground, then recompute water geometry, day plan and forecast samples rather than treating the recommendation as a static report.
- **Scenario comparison:** generate Weather-conservative, Balanced, and Ambitious trip structures from the same source-backed campground set. Conservative means shorter days and more campground flexibility; Ambitious means longer days and fewer stops. These labels describe structure, not safety.
- **Overnight-aware forecast clock:** forecast comparison must sample each scenario on its actual itinerary day after overnight layovers; never use continuous elapsed route time across a multi-day trip.
- **Scenario application:** applying a scenario may replace prior scenario-generated campground waypoints, but it must preserve user-created manual route points and then rerun the coastline-aware route.
- **Failure mode:** if shoreline geometry or routing fails, preserve the editable sketch and clearly label water intelligence unavailable.
- **Source separation:** OpenStreetMap coastline may support the planning land mask; current NPS/IRMA remains the authority for regulations.

Product inspiration may come from Paddle Planner's route-first workflow, Travel Time Assistant, day-end thinking, route editing, details and scenario comparison. Do not copy Paddle Planner proprietary data, code, branding, reviews or map assets.

### Release 3 — durable data desk

- Automated source-change checks.
- Layer freshness/status panel.
- Versioned releases and rollback.
- Searchable metadata/provenance endpoint.
- Optional historical-map time slider.

## Source hierarchy

1. Current NPS enterprise/open data.
2. NPS program GIS (GRI geology, vegetation inventory, etc.).
3. Current NPS downloadable documents/pages.
4. Older NPS Data Store GIS.
5. NPMaps-distributed NPS artwork as reference/discovery.
6. Explicitly labeled manual/georeferenced derivation only for gaps.

## Experience rules

- The map is the dominant object, not a decorative hero.
- Search results should fly to the feature and open a concise detail.
- Default view prioritizes trails/camps/access/visitor services.
- Science and historical layers are opt-in to prevent visual overload.
- Every popup answers: what is it, why might I care, where did it come from, and is it current/reference/derived?
- The interface must remain useful on a sideways tablet and phone.
- No API-key-required map surface.

## SEO / discovery

- One canonical only: `/isle-royale-map/`.
- Title <= 60 rendered characters, description <= 158.
- Define `https://chrisizworski.com/#person` in the JSON-LD graph and connect it to the WebApplication/Dataset.
- Crawlable text must mention the major layer families and source policy; do not hide all value in JavaScript.
- Add sitemap + llms discovery only after the route passes its dedicated benchmark.

## Measurement

Primary product events (symbolic, no precise location):

- `isle_royale_layer_toggle` — layer id only.
- `isle_royale_search` — query category/result count, never raw precise coordinates.
- `isle_royale_feature_open` — feature class/source family, not a user's position.
- `isle_royale_source_open` — source id.
- `isle_royale_osm_context` — success/failure only.

Search evaluation begins from production merge date and uses the repo's standard comparable-window rules.

## Release checklist

1. Dedicated benchmark >= 88 and all hard gates pass.
2. Static tests pass.
3. Full repo `npm run verify:all` passes on the final commit.
4. PR shows before/after sitemap and discovery counts.
5. No active experiment treatment is changed incidentally.
6. Merge remains Chris's explicit call.
