# Michigan Winter Field Guide Collection — release notes (2026-10-26)

Framework: FIELD_GUIDE_V1. Separate search intents; no duplication of observed snow, aurora, eagle sightings, or ice safety calculations. Static HTML offers all descriptions and links before JavaScript. Shared accessible CSS and optional Leaflet/CARTO progressive map. Location markers are existing general-area coordinates from Michigan Adventure Finder, never parking or trailhead positions.

| Page | Distinct visitor decision |
|---|---|
| /michigan-winter-activities/ | Choose an activity; then check the real conditions. |
| /frozen-michigan/ | A beautiful ice photograph is not today's access report. |
| /michigan-winter-trails/ | The right route starts with the right winter use. |
| /michigan-winter-wildlife/ | Suitability is not a sighting. |
| /great-lakes-winter-guide/ | Watch the winter lake. Stay on safe, authorized ground. |
| /michigan-winter-night-sky/ | Night-sky forecasts need a sky and a place. |
| /michigan-winter-weekends/ | Good winter trips have a backup plan. |

## Photo integrity
Source-verified NPS winter photographs only. Snowshoe and ice curtain images are specific to Pictured Rocks. Sand Point shore photograph is specifically credited. Bald eagle image is labeled as an identification reference from Colorado, not a Michigan sighting. No AI-generated destination images. Other cards intentionally use editorial typography instead of unrelated stock photography.

## Source integrity and safety
Sources: Michigan DNR winter activities, winter fat biking, winter snowshoeing, Pictured Rocks NPS winter activities and Sand Point places, and existing specialist pages. Static card copy never claims current access or live sightings. Sand Point specifics rely on NPS published guidance and require current notice recheck. Frozen water, lake ice and river ice are never declared safe. Metadata date is release authoring date, not live weather observation.

## Release and checks
Required: node --test tests/winter-field-guides.test.js; npm run verify:quick; npm run verify:all; npm run benchmark:search-strategy -- --check; npm run benchmark:search-authority -- --check; npm run verify:sitemap-index; browser 390/1366 screenshots with photos, map tiles, keyboard, no JS, and ad interference. Do not merge on red. No manual Million Impressions workflow triggered.

## Next critical development investment
Add a license-verified winter image for each additional destination, stronger exact winter parking/trailhead records, confirmed source observation age, and user-tested per-guide maps. Only then treat seven guides as full 90/100 FIELD_GUIDE_V1 editorial releases. GSC and ad lift unknown until dated measurement.
