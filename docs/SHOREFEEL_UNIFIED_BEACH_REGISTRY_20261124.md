# Unified Great Lakes Beach Registry: investment 1
Date: 2026-11-24. Status: implementation for review; not a production map release.

## Decision
One cross-border identity catalog, not another beach page. Keep all existing Michigan, U.S. and Ontario guides and endpoints. Future map selection resolves a stable ID to the same destination from every entry point.

## Baseline and result
- 981 EPA 2025 public-access inventory records (567 MI, 414 other U.S.), 50 Michigan guides, 16 other U.S. guides, 30 Ontario guides: 1,077 source records.
- 25 explicitly reviewed name/alias, state, known lake, county where present, and <=1 km associations: 1,052 registry entries; these are not a verified unique physical-beach count.
- 1,050 map-eligible beach records. Preserve the Michigan riverfront viewpoint Wenonah Park and explicitly inland Maumee Bay record for legacy resolution; exclude them from the beach map. Source classifications otherwise remain provisional.
- 162 records have unknown lake. Do not guess. Ten possible matches have separate unresolved review entries. Bay City State Park and Bay City State Recreation Area differ by about 2.19 km: investigate authoritative geometry before combining.
- Each source retains its stable key, point, source, original link and existing forecast adapter. A linked map entry uses the source shoreline point and curated display name; the curated point remains separate. Do not infer access, safety or a calibrated beach-air measurement.

## Source and expansion contract
The existing snapshots remain authoritative inputs. Do not auto-merge similar place names or neighbouring segments. Review matches explicitly and record coordinate conflicts. The federal Canadian [nearshore assessment layer](https://maps-cartes.ec.gc.ca/arcgis/rest/services/CWA_AEC/GreatLakesNearshoreStress/MapServer/2) includes historical beach postings and third-party Swim Drink Fish attribution; not a contemporary access inventory. The [Niagara Region open-data Beaches catalog](https://niagaraopendata.ca/dataset/beaches) explicitly describes publicly monitored beaches and an Open Government License 2.0; prioritize it and municipal/provincial sources for a reviewed Canadian expansion. Source pages checked 2026-11-24; no new Canadian points imported because a verified coordinate extract and lake/access reconciliation are not yet available. The current registry covers only the existing 30 Ontario entries. Never claim all Great Lakes beaches have been cataloged.

## Implementation and delivery
- lib/shorefeel/beach-registry.js: normalized records and resolver.
- public/assets/great-lakes-beach-registry.json: generated compact cross-border map input, with no live data or PII.
- Existing generate-shorefeel-us.mjs rebuilds the asset using the same sources; no added build step, function, paid API, cron, or runtime database. Source modifications require regeneration and the registry drift test.
- tests/shorefeel-beach-registry.test.js: coverage, source retention, association limits, distinct segments, geography, no-safety claims, and deterministic artifact.
- No visible UI, ads, canonical, sitemap, Person or forecast formula changes. All existing routes are preserved. The registry is not yet consumed by the visitor map.
- Separate outstanding map PR #1911 failed its browser test because overlapping cluster markers intercepted a pointer click. Do not weaken that test or merge a red gate. Use screen-space clustering and real touch/browser evidence in the unified-map investment.

Next: normalize the existing MI/NWS/ECCC forecast outputs around this stable ID contract; share provider-grid results and lazy-load selected detail. Then use the catalog in the shared map, add verified Ontario records and resolve outstanding associations. No on-sand numerical cooling claims without calibration.
