# Isle Royale Interactive Map — build plan

Updated: 2026-08-30

## Product thesis

The page should not be another brochure viewer. It should be the place where a visitor can search Isle Royale once and move between the island's operational visitor geography, boating rules, maritime history, science layers and old cartography without losing source context.

NPMaps is used as the completeness checklist. NPS and other federal/open GIS are used as the preferred geometry sources.

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
