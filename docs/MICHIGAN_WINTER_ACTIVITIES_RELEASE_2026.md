# Michigan Winter Activities — first-guide-only release

Work based on FIELD_GUIDE_V1. This branch deliberately publishes **one** of the seven prototype guides while the other six stay in draft PR #1221. The flagship has 18 source-backed activity cards; category, region and effort filters; location-specific licensed archival photos with visible source and date/provenance language; accessible early map; and condition handoffs to existing published specialist tools. No unreleased sibling links appear. No weather prediction engine or AdSense policy/code changed, aside from the standard loader on a new published content page.

## Scope
Public route: /michigan-winter-activities/. CSS: winter-field-guide.css and michigan-winter-activities.css. JS: winter-field-guide.js. Site: discover via /tools/ and /michigan-destinations/. Registry node/links and sitemap-winter only for flagship; no six other new URL sitemaps. Own canonical and Person author graph preserved.

## Release gates
Run npm run verify:all and visual workflow .github/workflows/winter-field-guide-visual.yml; inspect 390 and 1366 screenshots, all photos after real scrolling, marker + tile coverage, filter count/reset, no JS fallback, ad interference and attribution. Screenshot review in feature branch found micro-step label wrapping and mismatched seasonal images, corrected in source. Independently verify release preview before merging, as Vercel preview protection may preclude unauthenticated browser examination. No 100/100 claim until all hard gates and eight scored axes meet 5/5.

## Search integrity
This guide answers *which winter activity*, not *where should I go in Michigan any season*, *current snow depth*, *snowfall totals*, *ice safety*, *eagle sighting now*, or *aurora visible tonight*. Links delegate those intents to existing canonical tools. The source texts are not real-time opening statuses.

## Next action
Check the final exact-head GitHub Actions workflow and photo/source evidence and browser QA, then review 100-point rubric before production merge. Never merge broad seven-guide draft PR #1221 as a proxy for this one-guide release.

## Source access blocker and policy — October 26
The one-time source download workflow successfully fetched and resized the first 10 archived photos (17 total originals required) but the Wikimedia host returned HTTP 429 with an explicit robot-policy notice for a later USFWS source. The workflow deliberately aborted without committing incomplete assets. Do NOT evade that denial with automated proxies, IP rotation, or other bypasses. The import workflow is now **manual-only**, not triggered on code pushes. Future locally hosted assets require compliant source access or explicitly authorized photo supply. Existing browser QA with remote images found intermittent photo-load failures; until fully resolved, the photo reliability gate remains red and the 100/100 target is not achieved. Do not merge the flagship PR yet.
