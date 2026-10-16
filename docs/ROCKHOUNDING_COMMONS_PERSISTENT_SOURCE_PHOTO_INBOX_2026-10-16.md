# Grand Marais rockhounding: persistent original-camera photo review inbox

**Development milestone: October 16, 2026.** This is a no-key evidence-retention and triage system, not a live beach condition, safety or agate prediction engine.

## Why this follows the 2026 storm-specific photo matcher

The existing rockhounding GLOS Spotter archive verified **5,243 original offshore readings**, **11 grouped elevated-wave episodes**, and **8 sampling-qualified episodes**. The new per-event photo board found **one ambiguous later July 2026 named-beach media source and zero verified same-vantage pre/post shoreline pairs**. The already installed [Commons GeoSearch](https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image) research query returns camera-location metadata; it does **not** prove the photograph faces Agate Beach or shows new stones.

Our original weekly workflow previously produced a 30-day Actions artifact and warning for new geotagged media. An image could disappear from the query's limited response or the artifact retention window before it was reviewed. This phase creates **durable research metadata retention** without duplicating the one-per-week MediaWiki request.

## Mechanism

- The existing `.github/workflows/rockhounding-commons-geotag-watch.yml` still schedules just **one original Wikimedia API metadata query every Monday at 11:23 UTC**. No external lookup occurs on visitor page loads.
- Source code checks out from `main`, with code-tree push credentials disabled. A second checkout of `research/rockhounding-photo-review-inbox` receives the one authorized metadata-only commit. Neither visitors nor the public-indexed pages consume unreviewed media from this branch.
- `data/rockhounding/commons-photo-review-inbox.json` on that dedicated branch retains the source page ID/URL, original capture **day** with timezone-uncertainty label, upload UTC **separately**, camera GPS, license display label, time when the photo first appeared in the weekly check, and possible links to **original measured** GLOS offshore episodes.
- The source's *nearby* geographic location is distinguished from a verified view *of* Agate Beach. Photos cannot be automatically approved as same-view pairs or independent sediment observations. Photos dated during a storm do not become after-event images. Unknown source dates cannot be backfilled from upload time.
- Previously discovered candidates are retained even when the original result is no longer among the latest 50 nearby results. Later source-metadata changes increment a version/re-review marker; they cannot silently promote a candidate to a verified beach scene.
- A separate dated research-artifact report shows new/changed/retained photo counts and direct original source links with actual wave event association. Links are original Commons file pages, not copies of user-created imagery. No Flickr/Reddit copyrighted media are downloaded.

## Expected source behavior and gates

| Condition | Behavior |
| --- | --- |
| Six already verified original geotags, no new images | Persist source check time; do not report any new photographic evidence |
| A new camera geotag within 2 km, with source capture date | Save metadata for human view/landmark review, not confirmed Agate Beach |
| New dated image during the 2026-10-08–14 offshore episode | Preserve the **during-storm** classification; never classify as after-storm |
| Source image disappears from a bounded future search | Keep the original research candidate in the ledger |
| Original photo GPS/date/rights/title changes | Update source metadata but mark `SOURCE_METADATA_CHANGED_NEEDS_REVIEW`; preserve first discovered time |
| Source metadata is malformed, page ID repeated, query fails or date is implausibly future | Fail closed; do not write a falsely completed/source-empty report |
| NWS marine warnings absent | Does **not** create shoreline safety clearance |
| Candidate photo appears at a nearby *other* Michigan Agate Beach | Do not assign it to the Grand Marais site; origin location must match and the image's *scene* still requires review |

**Every persisted unreviewed record explicitly denies** a verified Agate Beach image view, matched camera geometry, observed agate exposure, public beach safety, and visit-window publishing.

## Implementation

- `lib/rockhounding/commons-photo-review-inbox.cjs` — source identity, 2 km camera radius, original capture vs upload date, safe review-inbox schema, deduplication by immutable Commons page ID, review-state preservation, source revisions, actual offshore event associations and storage-size guard.
- `scripts/rockhounding/archive-commons-photo-review-inbox.cjs` — one-pass original free provider query from the existing watch function, atomic research ledger and human-readable artifact write. Any upstream source error occurs before a ledger update.
- `scripts/rockhounding/watch-commons-camera-sources.cjs` — now optionally receives a prior ledger and returns both original source-change watch info and the metadata-only rolling candidate register. It still performs **exactly one Wikimedia request**.
- `.github/workflows/rockhounding-commons-geotag-watch.yml` — research-branch-only metadata write on its existing Monday schedule, with no new user-facing route; research verification workflow provides direct source integration evidence.
- `tests/rockhounding-commons-photo-review-inbox.test.js` — no new-source control, single-upload archival provenance, repeated-source dedupe, source-field changes, source-results disappearance, future data and altered/publication-enabled ledger rejection; one-request adapter and source HTTP error behavior.

## Research conclusion and next gate

The system makes **future independently dated camera candidates retainable and reviewable**, but cannot conjure a matching pre/post Agate Beach pair where none is in source archives. The physical signal missing remains **two original, same-reach, same-view, storm-bracketing image captures**, with human-checked fixed landmarks, camera orientation, original capture timestamps, water-level/runup, ice/lighting and rights.

No scraping credits, paid imagery, per-visitor source calls, public SEO/indexed route changes, ad implementation changes, new rock-exposure probability or municipal/onsite requests.
