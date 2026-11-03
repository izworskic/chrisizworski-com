# Garden Pest Watch: photograph to field-action bridge

**Release milestone:** November 3, 2026. Existing page: `/michigan-garden-pest-watch/`.

## What changes
The existing 15-topic / 30-photo comparison layer is now connected to the existing crop-specific, plant-stage-specific Garden Pest Watch response. This is a decision handoff, not automated insect identification.

For each illustrated topic:
- **In matching growing season and crop stage:** tell the visitor where to look on their plant; provide the Extension-sourced prevention and *only-if-confirmed* guidance in a disclosure.
- **Off season (November–February):** show next-season prevention, not live foliar scouting, treatment, infestation, or a false pest probability.
- **Outside the matching season or plant stage:** say that the current selection does not place this topic in its usual scouting window; provide preparation, never a localized negative detection.
- **Unavailable/reloading reference:** show no crop-stage claim; preserve the photographic comparison and an honest source-unavailable explanation.
- **Weather favorable:** explicitly qualify the weather as a general scouting cue, not an outbreak probability.
- **Visitor reports:** preserve the distinction between a possible unverified sighting and confirmed local occurrence.
- Provide the original Extension reference for verification.

## Evidence contract
The core browser app emits `garden-pest-watch:evidence` events containing only the already validated seasonal API decision for a matching crop, growth stage and ZIP value. The image browser has no write path back to a pest report or model. Crop/stage/ZIP changes, refreshes and request failures **immediately invalidate** prior advice so cross-location or cross-crop guidance cannot linger. Existing same-selection asynchronous API request guard remains authoritative.

The data are the established `lib/garden-pest-watch.cjs` Extension modules; photographs from `data/garden-pest-visual-catalog.json`. No new claims of biological-model parity, local measured occurrence, regional counts, validated disease diagnosis, or 2027 emergence dates. The offline Python photo compiler and published licenses remain unchanged.

## Acceptance gates
1. Python evidence compilation check and Node photo contract pass.
2. Existing scientific and crop decision tests pass.
3. Chromium 360/390/768/1440 fixture tests: seasonal plan, disclosure, crop A→B→A, stage invalidation, ZIP invalidation, November/off-season and failed source; no JS keeps original static guide.
4. Full site build and existing SEO, accessibility and deployment checks.
5. Review PR and preview, merge if all gates pass; production page and API smoke after deployment.

**Not claimed:** improved traffic, measurable diagnosis success, model validation against actual repeated field observations, source completeness beyond the existing catalog, or a zero-pest conclusion from a missing source.
