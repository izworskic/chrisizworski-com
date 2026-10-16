# Agate Beach fixed-camera / repeat-view evidence discovery: original Wikimedia 2026 check

**Research frozen 16 October 2026. No shoreline change or rock exposure has been validated.**

## Physical source inventory found

Original Wikimedia Commons [GeoSearch MediaWiki API](https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=46.675190%7C-85.987480&ggsradius=2000&ggsnamespace=6&ggslimit=50&prop=imageinfo&iiprop=timestamp%7Curl%7Cextmetadata%7Csize%7Cmime&format=json), exactly one original metadata request, coordinates centered on actual independently geotagged 2026 Agate photograph. A **2 km** search around 46.675190, -85.987480 returned **six camera-geotagged Wikimedia files** at the time of research:

| Actual original media source | Original capture date field | Camera GPS | License | Research relevance |
| --- | --- | --- | --- | --- |
| [Lake Superior Coast — Grand Marais](https://commons.wikimedia.org/wiki/File:Lake_Superior_Coast_-_Grand_Marais,_Michigan_(31671044725).jpg), id 54799113 | **2016-10-05 17:53**; uploaded **2017-01-06** | 46.675613, -85.985039 | CC BY-SA 2.0 | A shore-titled 2016 image, not manually validated as the exact 2026 camera frame |
| [Grand Marais Agate Beach](https://commons.wikimedia.org/wiki/File:Grand_Marais_Agate_Beach.jpg), id 195534341 | **2026-07-05 12:57:56** local camera clock, timezone unknown; uploaded **2026-07-12** | 46.675190, -85.987480 | CC BY 4.0 | A confirmed dated Agate Beach scene, but no same-site storm before/after |
| Chilly Lunch (2015); a Pictured Rocks photograph (2016); snowmobile sign (2016); Burt Township office (2021) | Varied / incomplete original times | Within 2 km only | Creative Commons or CC0 | **Nearby photo GPS does not imply the photo depicts Agate Beach**. Must be viewed and geographically checked before assigning an image scene. |

**Important computed negative finding:** the two shoreline-titled source camera GPS locations lie **192.08 meters apart** (great-circle distance). They were photographed **almost ten years apart**, not just before and after one of the **eight sampling-qualified 2026 offshore wave episodes**. There are **zero original-source photo pairs that both bracket an actual 2026 wave episode** with matching original camera positions. Even a hypothetical two-photo result with camera separation <15 m would require field-of-view orientation, aligned fixed coastal landmarks, accurate original capture timestamps, water-level and lighting/obstruction correction, and a human-reviewed geomorphology change before a scene change could be asserted. A camera GPS coordinate can be approximate and is not the shoreline's position or legal access boundary.

This evidence audit searches *original MediaWiki camera geotags*, not Google search result images or AI-generated shoreline simulations. The 2016 photo is **linked only**. Only the previously attributed 2026 [TCP04 CC BY 4.0 photo](https://commons.wikimedia.org/wiki/File:Grand_Marais_Agate_Beach.jpg) appears on the noindex research page.

## Implementation

- `data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json`: frozen original six-file MediaWiki metadata with original capture-text, separate upload times, GPS, license URLs and manual visual review flags. No original photo assets copied or licensed by a new party.
- `lib/rockhounding/commons-camera-discovery.cjs`: bounded original GeoSearch URL; fail-closed schema, metadata, upload-vs-capture-date, camera-geodesic separation and ancient-vs-modern event-window checks. Free-text dates such as “Taken on 14 July 2015” remain unparsed rather than silently attributed a timezone. Return no rock or safety predictions. Monthly or weekly future source changes cannot silently increase calibrated rock estimates.
- `scripts/rockhounding/discover-commons-repeat-views.cjs` and `.github/workflows/rockhounding-commons-repeat-camera.yml`: a **single original free-source query** in a research CI run; preserves a source-stamped discovery digest for audit and revisiting. Source validation rejects changed provider metadata until reviewed.
- `public/rockhounding-lab/commons-geotagged-repeat-views-2026.json`: frozen original-provider six-file visual digest, zero matched views, zero validated sediment changes. Extra comparison in a compact collapsed disclosure next to the already published July 2026 Agate beach evidence timeline. Main prediction engine untouched.
- `scripts/rockhounding/watch-commons-camera-sources.cjs` and `.github/workflows/rockhounding-commons-geotag-watch.yml`: **one Wikimedia original metadata request per week**, Monday 11:23 UTC via GitHub Actions, to detect newly added or changed nearby photos. New photos are **unreviewed candidates only**, artifact and warning for review; no field-visit requirement, no auto-updated site forecast and no per-visitor calls. **No paid scraping plugin or credits**.
- `tests/rockhounding-commons-camera-discovery.test.js`, `tests/rockhounding-commons-camera-watch.test.js`, `tests/rockhounding-commons-photo-lab.test.js`: original source identity, Haversine distance, upload-versus-photo timestamp, incomplete pagination, wrong GPS and incorrect media MIME rejection, new-source watch warning, zero calibrations and noindex/attribution integrity. Existing rockhounding regression tests continue to protect the prototype.

## What would actually unlock a physically meaningful result

A same-site same-vantage pair **surrounding one of the 2026 dated offshore GLOS storm events**, ideally within 48h prior and 72h after, independently original-captured and georeferenced, with stable landmarks visible, high enough effective resolution to detect sediments, and reviewed wave-stage/lake-level conditions. This is not available from the six currently returned geotagged Commons files, or from the previously recorded Flickr/Reddit photo dates. A hypothetical close GPS pair is not enough, and no rock or safety window is authorized without separate outcome validation.

No new indexed routes, ad or SEO changes, paid data plan, copyrighted Flickr/Reddit image copies, camera-site visits or municipal contacts.
