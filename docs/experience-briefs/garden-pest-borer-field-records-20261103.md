# Garden Pest Watch: squash vine borer independent photo records

Date: 2026-11-03. Experience OS v1.2 / source confidence. Scope: existing Michigan Garden Pest Watch page only.

## Scientific investment
Add one second species-specific observed-presence lane, **squash vine borer** (accepted iNaturalist taxon `Eichlinia cucurbitae`, taxon 1410301), independent of the existing Japanese beetle USA-NPN model and Japanese beetle iNaturalist pilot.

Upstream sources:
- Michigan State University Extension, cucurbit IPM: https://msu-prod.dotcmscloud.com/resources/diseases_and_insects_in_michigan_cucurbits_and_their_management_e3276
- MSU Extension vine borer identification: https://msu-prod.dotcmscloud.com/news/squash_vine_borer_biology_and_management
- iNaturalist accepted species taxon: https://www.inaturalist.org/taxa/1410301
- iNaturalist V2 API and current API practices: https://api.inaturalist.org/ and https://www.inaturalist.org/pages/api+recommended+practices

The source listing returned 309 research-grade photo records at state scale as of research on 2026-11-03, **not** a count of confirmed insects around Bay City or any selected ZIP. Local query must be made by the server for a bounded reference coordinate and dated year.

## Architecture
- `lib/garden-pest-field-observations.cjs`: strict iNaturalist V2 search and parser. Taxon 1410301, Michigan place 29, 25 km radius, non-captive research-grade photographed observations, dated year, 100-record first-page cap; rejects obscured/private, unknown or coarse positions, other taxa, invalid dates and noncanonical record URLs. Returns date/link summaries only.
- `api/garden-pest-field-observations.js`: same Census ZCTA / named-city source reference as Garden Pest Watch, GET only, year 2025-current, no future "forecast", no durable location storage. On provider/geometry error, 503 UNKNOWN not 0 reports.
- `public/assets/garden-pest-field-observations.js`: visitor-initiated lookup in the existing photo guide; selected season and ZIP, race/selection invalidation. Displays first *qualifying in the inspected sample*, not "first emerged". No photo copy, coordinates, count-to-risk mapping or pesticide recommendations.
- Existing `/api/michigan-garden-pest-watch` and `/api/japanese-beetle-forecast` are unchanged.

## Visitor truth constraints
1. Research-grade species ID does **not** independently verify adult life stage, egg laying, emergence, presence in a particular garden, loss thresholds or model calibration.
2. A source with no eligible records can only say "**No qualifying photo in the inspected sample**"; it does not mean no beetles or borers.
3. February–November season display must distinguish dated photographs in completed growing seasons from any current biological activity. November is not a time to inspect summer squash leaves.
4. All visible citations are direct source pages. No public heatmap of observer coordinates, borrowed images, unverified live sightings or user-entered observation requests.
5. Do not run the API on every visit. Opt-in is deliberate to respect iNaturalist recommended API usage. Cache six hours with bounded stale revalidation, outage 120 seconds.
6. Existing site canonical / sitemap / NWS weather / crop-stage logic remain unchanged.

## Release gates
- Unit scientific proof for date, species, positional privacy/accuracy, geospatial bounding, partial samples, incomplete providers, source outage, invalid year/ZIP.
- Python photo catalog check and Node syntax CI; browser QA 360/390/768/1440, crop ZIP resets, 503 and November evidence copy, no-JS fallback, full repository tests and site build.
- Vercel preview READY, live source request verified for a ZIP and named reference where possible, merge only after exact-head gates and production SHA verification.

## Value/loss
Value: user understands whether the species has **at least been publicly photographed** in the surrounding source-defined reference area. Loss: hallucinated current outbreak, loss of habitat/privacy, wrong crop or year records, spray/timing advice based on sparse photos or broken source. Any high-risk loss is a release veto, irrespective of visual quality or visitor engagement.
