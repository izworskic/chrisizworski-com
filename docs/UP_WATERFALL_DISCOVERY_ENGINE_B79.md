# U.P. Waterfall Discovery Engine — B79 identity crosswalk

**Reviewed November 7, 2026. Online-only research; no outreach.** This is a research inventory, not a public-access guide or live waterfall status service.

## Scientific mission

Find additional documented Upper Peninsula waterfall names and possible features without collapsing independently named tiers, mixing same-named sites across counties, mistaking geographic pins for legal visitor parking, treating third-party directions as landowner permission or automatically manufacturing indexable guides.

## Evidence inputs

1. Existing curated visitor destinations: data/up-waterfalls.json (79 entries). **Only existing five-axis verified records and release gates control public routes or the sitemap.**
2. Michigan state GIS waterfall feature catalog: data/up-waterfall-reconciliation.json (161, 69 matched to curated IDs, 92 unresolved and research-only).
3. Independent directory snapshot: data/up-waterfall-external-identity-shorelinescout.json. Contains 291 factual name, county, watercourse-if-listed and individual original listing URLs. Source and attribution: https://shorelinescout.com/michigan/waterfalls/upper-peninsula/ . We do not copy the other site's descriptions, photos, hiking directions, heights or claimed map coordinates.

There are **282 normalized name/county source groups**, including repeated names such as Peterson Falls. Those are not necessarily distinct geographic waterfalls; do not collapse or publish them automatically.

## Engine and initial output

Python standard-library implementation: scripts/build-up-waterfall-discovery.py
Research output: data/up-waterfall-discovery-index.json

B79 initial classifications: **50** curated exact mentions, **67** GIS research identities, **17** possible alias suggestions, **17** ambiguous same-name/same-county records, and **140** source-only name mentions. No claim that 140 newly distinct physical falls have been confirmed. The engine sets the number of additional distinct geographical waterfalls it has independently verified to **zero**; all public access approvals remain outside this pipeline.

Ranked research leads are ranked for identity investigation only, not outdoor visit desirability, legal permission, accessibility or current opening. Uptravel's 300+ figure is an estimate, not a row-level, identity-verified dataset: https://www.uptravel.com/outdoors-recreation/waterfalls/

## Known identity traps

- Upper, Middle and Lower Montreal Falls in Keweenaw County are **not** the same location as Montreal Falls/Interstate Falls in Gogebic County.
- Miners Beach Falls must be compared to the existing Elliot Falls, which the NPS places at the far eastern end of Miners Beach. Do not create a duplicate guide without resolving the identity. https://www.nps.gov/places/elliot-falls.htm
- Peterson Falls appears twice with the same county; retain source identity records until a second, reliable feature distinction exists.
- Piers Gorge names could refer to separate river rapids or the existing Misicot/Third Pier visitor story. Portage guidance is not a walking route.
- Visit Keweenaw describes a primitive two-track and unsigned shore walk toward Montreal Falls. Do not turn that into an official lot-to-waterfall GPS path without public land evidence. https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/

## Repeatable commands

    python3 scripts/build-up-waterfall-discovery.py --summary
    python3 scripts/build-up-waterfall-discovery.py --check
    node --test tests/up-waterfall-discovery-b79.test.js

To deliberately refresh the independent directory, save a permitted Markdown page extract, review its provenance and quality, then run:

    python3 scripts/import-up-waterfall-identity-directory.py ./reviewed-directory.md --write --reviewed YYYY-MM-DD
    python3 scripts/build-up-waterfall-discovery.py --write
    python3 scripts/build-up-waterfall-discovery.py --check
    npm run verify:all

The importer validates the page's 'Showing N of N UP waterfalls' completeness marker, records **factual names and links only**, preserves stable URL-slug IDs, and rejects incomplete or duplicate entries. It makes no network calls. Run it intentionally when reviewing a new snapshot, not as unreviewed live scraping.

## Next investigation thresholds

1. **Identity:** Confirm name, stream and separate feature location with official USGS GNIS, NPS, DNR or land-manager evidence before calling a mention a distinct fall.
2. **Geographic roles:** Keep natural waterfall position separate from owner-documented parking and allowed walking corridors.
3. **Access:** Apply all five source gates (land manager, public permission, permitted parking, public walking route, independently supported feature point) before public publication. Do not require visitors to supply evidence.
4. **Experience:** Once verified, produce ranger-quality storytelling, seasonal decision cues, honest CARTO maps, legally usable arrival, imagery, cross-links, canonical/Person schema, open graph metadata and sitemaps.
5. **Coverage:** Add USGS GNIS and other permissible independent source feeds; measure false positive, tier-duplicate and unverified private/unsafe cases rather than optimizing to an arbitrary 300 count.

B79 intentionally changes **no public visitor pages, ads, public map pins, canonicals or sitemaps** and introduces no Supabase or Redis.
