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

## Tool directory entry points
A separate, scoped seven-link collection sits immediately before the existing Michigan winter decision router on /tools/. No tool forecasts, ad settings or existing winter-router choices were replaced.

## Pin-level geographic corrections
Following CI, calibrated source-derived destination markers without assuming parking availability:
- Sand Point Beach near Munising: 46.450217, -86.606683 (Explore Munising destination coordinates https://www.exploremunising.com/nature-parks/).
- Eben Ice Caves feature: 46.38134, -86.94309 (OSM place node via https://mapcarta.com/N6605774754); winter route remains officially unverified.
- Soo Locks public visitor center: 46.50184, -84.35067 (OSM place via https://mapcarta.com/26648120 and official USACE information https://www.lrd.usace.army.mil/Submit-ArticleCS/Recreation/Article/3833525/soo-locks-visitor-center/).
- Vasa Pathway: 44.750594, -85.493329 (Michigan DNR https://www.michigan.gov/recsearch/trails/vasa-pathway).
- Headlands dark sky park: 45.77536, -84.78278 (DarkSky International https://darksky.org/places/headlands-dark-sky-park/).
- Silver Lake state park ORV area: 43.68290, -86.49800 (regional feature, https://ordealist.com/guides/silver-lake-orv-area). Use Michigan DNR for permitted fat-tire dates and the *different* pedestrian parking address: https://www.michigan.gov/dnr/things-to-do/winter/bike/silver-lake-fat-tire.
These pins identify visit destinations, not verified open winter parking or safe tracks.
## Flagship guide quality investment — October 26
Only /michigan-winter-activities/ has been rebuilt in this investment; other six specialist guides and their common component behavior stay unchanged.

- Expanded from eight to eighteen discrete winter experiences; every card has a specific official owner/source, documented travel/access limitation, and handoff to an existing condition or specialist tool.
- Added five activity-first chips plus effort and Michigan-region filters; kept full static readable HTML and original synchronized map/filter infrastructure.
- Added flagship-only CSS with compact three-photo winter hero, field-guide trip decision steps, labeled historical photos, and single-column mobile story cards. No manipulation of Auto Ads or other tool engines.
- Identified statewide rule differences including precise Silver Lake fat-bike parking address and December 15–March 15 window, Porkies east approach/closed South Boundary Road, Sleeping Bear skiing and sledding restrictions, Muskegon fall-status caveat, and no lake-ice safety claims.
- Added winter exact-place photo evidence: NPS snowshoe, ice-curtain, Sand Point shore; Commons winter Upper Tahquamenon (James Phelps CC BY 2.0), Sleeping Bear winter bluff (NPS CC BY 2.0), Silver Lake dunes (USACE federal public domain). Remaining imagery reuses location-verified, attribution-verified Michigan Adventure Finder reference photographs with explicit season disclaimers; a few specialized experiences use tasteful editorial index art rather than fake imagery.
- Hard gate remains: visual browser audit of 390px and 1366px rendered preview photos/map, all licensing URL resolutions and no-ad-overlap before measuring release quality. Vercel preview is deployment-protected. Never call this 100/100 without completing these gates.

## Exact first-guide release audit scope
For /michigan-winter-activities/ only, use the dedicated browser visual workflow after source edits. It visits the emitted static HTML, checks 18 cards with and without JS, filter behavior, mobile horizontal overflow, credible map fallback, all photo loads (scroll to trigger lazy loading), and uploads 390px/1366px screenshots for human review. This workflow is scoped to the winter flagship feature branch and does not trigger the Million Impressions pipeline.

## Visual review and corrections
Real GitHub Actions browser screenshots at 320/390/768/1366 showed no overflow and all 17 photos loaded. Reviewer found a mismatched bright-green Saginaw Bay photo on the ice-fishing card, so moved that experience to DNR-listed Houghton Lake, using a location-accurate 2012 Joe Ross CC BY-SA 2.0 historical winter photo and a DNR-documented Denton Township land-access locator (winter parking not verified). Keweenaw regional snowmobile story now illustrates the actual frozen Keweenaw Waterway (2004, Dcclark CC BY 2.5) rather than summertime dunes. Adjusted 390px micro-step text labels to prevent line wraps.

## Third image/provenance pass
- Replaced summer Dune Climb photo with Kerry Kelly's NPS winter 2005 image (public domain; source file explicitly identifies NPS employee and crop/retouch).
- Added historic Port Oneida snow scene within Sleeping Bear park for camping: clearly labeled **not** the Platte campground.
- Added source-verified exact Headlands night sky image by radicalespresso, author Public Domain Mark, dated July 2025 not current winter conditions.
- Added a USFWS species-reference bald eagle in October 2020 Minnesota snow by Courtney Celley, explicitly NOT Saginaw Bay field evidence. Accurate species/season atmosphere, not a claim of sighting.
- Review date of every archival photo appears in the photo caption. No imagined view or image generation.
