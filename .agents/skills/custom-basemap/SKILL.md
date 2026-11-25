---
name: custom-basemap
description: "Give the network's maps one recognizable Great Lakes look with a self-hosted vector basemap: a regional Protomaps PMTiles extract styled once and drawn with MapLibre. Use when building or redesigning a tool map, when maps look like stock tiles, or when a map depends on a third-party tile service."
---

# Custom basemap: one Great Lakes map style for every tool

About 110 pages load Leaflet 1.9.4 over stock raster tiles, and a handful load MapLibre GL JS. A single shared vector basemap makes every tool look like part of one network, puts water and shoreline first, and removes a third-party tile dependency. It is a static file: no tile server and no Vercel function.

## 1. Build the tiles once

1. Cut a regional extract from the current Protomaps daily build with the `pmtiles` CLI: `pmtiles extract SOURCE great-lakes.pmtiles --bbox=MIN_LON,MIN_LAT,MAX_LON,MAX_LAT --maxzoom=N`. Start with the Great Lakes basin and a capped zoom (try 12; go higher only where a tool needs trail-level detail).
2. Record the file size, the bounding box, the max zoom and the build date in the tool network docs. Rebuild a few times a year, not on every deploy.
3. Never commit a planet-sized file. If the extract is large, it does not belong in the git repository.

## 2. Host it (owner decision: GitHub Pages, 2026-11-25)

PMTiles needs HTTP range requests. Every tile the map shows is one range request.

Owner-confirmed standard host (2026-11-25): **GitHub Pages in a dedicated static map-assets repository** (free up to 1 GB, zero Vercel Edge request billing, zero `chrisizworski-com` deployment bloat, no new cloud vendor). Before migrating any live map, verify HTTP `206 Partial Content`, `Content-Range` and CORS headers from `https://chrisizworski.com` against the hosted pilot extract, and record the result in `vercel-cost-guard` terms in the PR.

| Host | Status | Cost note |
| --- | --- | --- |
| GitHub Pages (dedicated static map-assets repo) | **Selected standard (2026-11-25)**; verify `206 Partial Content`, `Content-Range` and CORS from `chrisizworski.com` on pilot | Free; keeps binary `.pmtiles` out of app deploys and avoids Vercel Edge request charges |
| Cloudflare R2 | Not selected unless separately approved by owner | New vendor/bucket infrastructure and per-request billing |
| Vercel static (`public/`) | Not selected for `.pmtiles` | Each tile pan is a billed Edge request and large archives bloat every deployment |

## 3. One style, shared

- One MapLibre style JSON for the network: water and shoreline emphasized, muted land, readable labels at phone sizes, the site's palette. Store it once and reference it from every tool; never fork a style per tool.
- Fonts and sprites self-hosted alongside the style, or use the Protomaps basemap assets at a pinned version.
- Tool layers (trails, buoys, beaches) go on top as GeoJSON layers with the shared map symbols from the Production Design Standard.

## 4. Draw it

- New or rebuilt maps use MapLibre GL JS with the `pmtiles` protocol at a pinned version.
- Existing Leaflet maps keep working as they are. Move a Leaflet tool to MapLibre only inside an authorized redesign, one tool per PR. `protomaps-leaflet` exists but is in maintenance mode; use it only as a bridge.
- Load the map library only on pages with a map, show the list or text answer before the map, and keep a visible fallback when WebGL or the tiles fail.

## 5. Credit and links

Show the OpenStreetMap attribution on every map; the tile data comes from OpenStreetMap and its license requires credit. Keep the Google Maps location link and directions rules from `docs/VISITOR_GOOGLE_MAPS_STANDARD.md`.

## Output

Extract parameters and size, the chosen host and its range-request test result, the shared style location, the pilot tool, before and after screenshots at 390 px and desktop, and bytes and requests compared with the old basemap.

## Boundaries

Pilot on one tool that already uses MapLibre before any Leaflet tool. geospatial-intelligence, web-quality-performance, web-quality-accessibility (map alternatives) and Playwright Browser QA apply. No paid tile service, no new host or bucket without owner approval. Do not auto-merge.

## Sources

protomaps/PMTiles (BSD-3-Clause; the format specification is CC0), protomaps/basemaps (code BSD-3-Clause; style design CC0), maplibre/maplibre-gl-js (BSD-3-Clause), protomaps-leaflet (maintenance mode). Protomaps docs, cloud storage for PMTiles. Reference only.
