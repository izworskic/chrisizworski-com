# Rockhounding M2: independently dated shoreline-imagery evidence, Grand Marais (2026-10-16)

## Outcome

The rockhounding engine now has a **remote, reproducible source catalogue of shoreline imagery candidates around actual measured Grand Marais storms**, including independent on-beach photographs. It does **not** have observed, validated storm-caused shoreline or new-agate changes.

The input storms are the genuine 2026 GLOS Spotter offshore [5,243-reading archive and 11 grouped episodes](https://github.com/izworskic/chrisizworski-com/pull/1021), with eight having adequate original-wave reading coverage. Satellite acquisition metadata is **not** a rock-discovery report.

### Verified separate dated imagery source

[Element 84 Earth Search STAC](https://earth-search.aws.element84.com/v1) serves source-indexed Copernicus Sentinel-2 L2A imagery. The [independently published provider's description](https://element84.com/earth-search/) confirms the open data catalog. The catalog research query used collection `sentinel-2-c1-l2a`, Agate research bbox **[-85.991,46.673,-85.981,46.679]** and 2026 time windows. Original STAC item metadata provided each acquisition UTC date, source STAC ID, MGRS tile **16TES**, nominal `visual` ground sampling resolution **10 m**, EPSG:32616 and whole-scene `eo:cloud_cover` percentage.

Nine separate original 2026 acquisitions were verified using the public STAC item endpoints (August 22, 27; September 6, 11, 16, 23; October 6, 11, 13). The **October 13 scene is 99.44% cloudy at the whole-scene level** and is not usable as the date-confirmed after-storm image for the October 12 event. These clouds are **scene metadata, not local Agate Beach clear-pixel evidence**.

The source engine selects a catalog **candidate** only when:
- The independent GLOS offshore episode is supported by enough original measurements.
- A catalog scene predates the **first elevated measurement**, within ten days.
- A second catalog scene comes at least six hours after the **last elevated measurement**, within ten days. Merely appearing after the *peak* is insufficient.
- Both entire-scene cloud fractions are at most 35% (a preliminary screening rule, not site-level QC).
- The observed source catalog is the correct `sentinel-2-c1-l2a` collection, `16TES` tile, valid source scene ID/time pair, and 10m nominal resolution.

Four source-backed candidates passed those **catalog-only** checks:

| Independently measured wave-episode peak | STAC before | STAC after | What it establishes |
| --- | --- | --- | --- |
| Sep 9, 2026, **1.91m** offshore | [Sep 6](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2B_T16TES_20260906T164812_L2A) | [Sep 11](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2C_T16TES_20260911T164343_L2A) | Two acquired scenes bracket measured elevated-wave period; no change verified |
| Sep 14, **1.94m** | [Sep 11](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2C_T16TES_20260911T164343_L2A) | [Sep 16](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2B_T16TES_20260916T164846_L2A) | Before and after last high reading; shoreline pixels unreviewed |
| Sep 20, **1.58m** | [Sep 16](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2B_T16TES_20260916T164846_L2A) | [Sep 23](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2A_T16TES_20260923T164703_L2A) | Dated satellite candidate; no rock availability |
| Oct 5, **2.51m** | [Sep 23](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2A_T16TES_20260923T164703_L2A) | [Oct 6](https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/S2B_T16TES_20261006T164645_L2A) | Very wide pre-storm interval; even a visible difference could reflect other processes |

None of these scene pairs has undergone local beach cloud inspection, georegistration, consistent-viewpoint alignment, lake-level correction or rock/shoreline change estimation. **Satellite imagery at approximately 10 m nominal pixel size cannot resolve individual agates or small newly exposed pebble patches.** A difference between two uncorrected images can result from changing water level, shadow, atmospheric effects, classification, platform geometry, or storm timing. We therefore publish **zero validated shoreline changes and zero validated fresh-rock events**.

### Independent closer-to-ground photographs

Three original-source records were found and linked **without copying or licensing photos to our site**:

1. [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Grand_Marais_Agate_Beach.jpg) — own-work Agate Beach photo with author-listed camera date **July 5, 2026**, source EXIF Nikon camera and source geo-point **46.675190 N, -85.987480 W**. EXIF time is author/camera-supplied, not an independently calibrated clock; stated location is not a land survey.
2. [Flickr](https://www.flickr.com/photos/cowofchange/55385027738) — author-reported photo taken **July 4, 2026**, uploaded July 10, text-only Grand Marais Agate Beach identification, no verified camera coordinates.
3. [Reddit rockhounds post](https://www.reddit.com/r/rockhounds/comments/1v6qg50/happiness_is/) — July 26 author says Agate Beach **two days previously**, so July 24 is **approximate and self-reported**, with no independent lens or coordinate check.

These photos establish real remotely discoverable dated site imagery. The sources do **not** form a same-vantage or same-site-sector before/after storm pair; simply showing stones in a beach photograph is **not proof of newly exposed rocks**.

## Shipped code and safeguards

- `data/rockhounding/grand-marais-2026-sentinel-shoreline-candidate-scenes.json` — nine original STAC item URLs/UTC dates, cloud metadata and resolution and explicit local inspection `null`/false.
- `data/rockhounding/grand-marais-2026-independent-shore-photo-register.json` — original July image source links, explicit uncertainty for dates/geolocation, no recopied image/media.
- `lib/rockhounding/shoreline-photo-evidence.cjs` — tamper-resistant source/date/scene-geometry guards, measured-offshore-episode pairing and automatic **no-public-claims** report. Neither satellite pixel metrics nor original-photo existence can authorize a rock-exposure forecast.
- `public/rockhounding-lab/shoreline-image-evidence-2026.json` — frozen source-dated 11-event digest with four catalog matches and explicit **zero actual pixel review / zero measured fresh-rock outcomes**.
- `public/rockhounding-lab/index.html` — compact new source-linked candidate comparison panel and independent photo references on already **noindex** research prototype. Links open original scene item data; original photos are not duplicated.
- `tests/rockhounding-shoreline-imagery-evidence.test.js` and `tests/rockhounding-shoreline-imagery-visual.test.js` — prevent false cloud-free beach assumptions, high-cloud temporal match, unqualified storm matching, vulnerable harbor wave inheritance, camera-source/rock-find conflation, and accidental publication of beach conditions.
- `.github/workflows/rockhounding-shoreline-image-evidence.yml` — offline regression with no visitor-side source calls, API keys, or paid requests.

**Next priority:** independently review the actual *local beach pixels* for two or more bracketing scenes, adjust for water-level conditions, and seek higher-resolution same-vantage dated ground photographs. Even then, a remotely observed wetline shift is **not automatically new agates**. Maintain NWS hazards and collecting permission as separate blocking checks, no onsite visit/emails required.

No ads, sitemap, canonical URLs, indexed tool forecast, visitor-side API requests or data-scraping subscriptions were modified.
