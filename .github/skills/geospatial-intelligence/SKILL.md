---
name: geospatial-intelligence
description: "Use when calculating trail proximity, geographic boundaries, spatial joins, along-route distance, map coverage or large geographic data delivery. Not for cosmetic changes or map gestures alone."
---

# Geospatial Intelligence

Proposed first pilot: Michigan Snowmobile. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Identify geographic decision, owning agency, geometry version, CRS, coordinate order, positional accuracy and legal access. Keep physical proximity distinct from verified parking, public access or travel route.
- Use existing mapping stack first. Compare Turf for browser geometry, projected/geodesic offline analysis for sensitive distance calculations, and MapLibre/PMTiles only when delivery of large datasets is the measured bottleneck. Check tile attribution, data license, hosting/range request support and mobile memory; no map-stack replacement by default.
- Validate geometry, empty features, duplicates, multipart segments, boundaries, antimeridian and high-latitude cases. Use explicit units, spatial indexing where needed and reproducible tolerances; do not measure kilometers in degrees or silently snap across barriers.
- For snowmobile proximity, compare against authoritative DNR geometry with a documented distance method; a nearby designated trail is not an open trail or legal access. Apply official closures separately.
- Benchmark accuracy against reference cases and representative mobile data size/load. Preserve map fallback, pan/zoom, accessible controls and Google Maps standard; deliver provenance and no-result states.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [turfjs/turf](https://github.com/turfjs/turf)
- [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
- [protomaps/PMTiles](https://github.com/protomaps/PMTiles)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
