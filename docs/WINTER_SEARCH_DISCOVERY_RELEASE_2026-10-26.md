# Winter Search Discovery & Indexing release — October 26, 2026

## Scope and non-negotiable boundaries
- Execute once through the on-demand **Million impressions cohort** GitHub Actions workflow, plus the existing full `Agent branch verification` and emitted public HTML audit. The cohort workflow is `workflow_dispatch` and limited to edits to its own script/workflow in PRs; it does **not** run on every merge.
- Preserve the site's established canonical URLs, independent tool intents, byline/Person identity, live weather and AIS logic, data freshness labels, AdSense and all monetization configuration.
- New winter discovery is on the `/tools/` page: native, visible links for Michigan Snow Depth, Lake Effect Snow, Michigan ski hills, Michigan ice caves, and Great Lakes freighter winter layups, plus relevant neighboring winter decisions.
- The unverified parking/access snowshoe research preview `/winter-hike-snowshoe-lab/` is intentionally `noindex`; it is **not** promoted as a search-ready landing page. No thin city/keyword URLs are created.

## Four release gates

### Gate 1: Crawl, canonical, sitemap, and initial HTML
- Source: main-site shell and owning repositories; inspect public URL HTTP status, `X-Robots-Tag`, meta robots, singular self-declared canonical, HTML title, H1, useful main copy and native `<a href>` links **with JavaScript disabled**. The 17-URL cohort audit covers six proven GSC pages and eleven winter destinations; the ordinary full gate tests more routes and emitted HTML.
- Source-level pages `/lake-effect-snow/` and `/michigan-snow-depth/` both declare self-canonicals with index/follow. Lake-effect initial HTML supplies conceptual snowbelt explanations and static links; live hour-by-hour verdicts come from the tool. Michigan Snow Depth initial HTML supplies methodology, input labels, warnings and links; location-specific rankings come from the tool. Avoid SSR claims about volatile condition results without a reliable fresh evidence pipeline.
- The root `public/sitemap-winter.xml` and related sitemaps contain winter pages; connected Search Console sitemap metadata reports the HTTPS `sitemap-winter.xml` submitted (116 URLs, 0 errors, 0 warnings, last retrieved October 20, 2026). This is **not** evidence every submitted URL has been indexed.
- Search Console **URL Inspection** is required to confirm *individual URL indexing status, Google-selected canonical and last crawled*; the connected analytics/sitemaps reader does not expose those fields. Do not claim Google has selected declared canonicals on the basis of HTML, sitemaps or impressions alone. Do not programmatically request indexing unless an authorized, supported action is available.

### Gate 2: Distinct query ownership (search hypotheses, not verified rankings)
| Intended owner | Queries / search intent | Deliberately does not own |
| --- | --- | --- |
| `/lake-effect-snow/` | lake effect snow forecast; where lake effect snow will fall; Great Lakes snowbelt hourly outlook | observed accumulation after a storm; ground depth |
| `/michigan-snow-depth/` | Michigan snow depth map; snow on the ground Michigan; where to find natural snow for a day trip | latest storm totals; groomed trail status |
| `/michigan-snow-totals/` | Michigan snowfall totals; how much snow fell in a city yesterday | ground snow survival and snowbelt forecast |
| `/national-tools/snow/` | US snowpack; snow water equivalent; snowmelt by location | Michigan-specific closest snow trip |
| `/michigan-ice/` | Michigan lake ice conditions; freezing degree days; observed ice cover | declaring safe ice for travel |
| `/michigan-ice-caves/` | Michigan ice caves formation; Eben ice caves conditions; frozen waterfall viewing | fishing ice or verified trailhead access today |
| `/michigan-cross-country-skiing/` | Michigan XC ski trails and trip planning | destination's operator-confirmed groomer report |
| `https://xcski.chrisizworski.com/` | northern Michigan cross-country skiing current snow/trail conditions | downhill ski resort choice |
| `/michigan-ski-hills/` | which Michigan downhill ski hill is worth the drive this weekend | trail closures for snowmobiles or backcountry |
| `/snowmobile/` | Michigan snowmobile trails and riding-window conditions | generic measured snowpack |
| `/great-lakes-freighter-winter-layup/` | which Great Lakes freighters are laid up and where, by winter/year | live vessel location (owned by `/great-lakes-freighter-tracking/`) |
| `/white-christmas-probability-map/` | historical white Christmas probability map; NOAA 1991–2020 climate odds | a 2026 forecast |
| `/national-tools/white-christmas/` | will my location have a white Christmas; local calculator | historical-only national map |
| `/national-tools/white-christmas/forecast/` | will it snow Christmas 2026; upcoming Christmas forecast | historical probability map |

Cannibalization control: do not reuse near-identical titles/H1s for each role; link with intent-descriptive anchor text. Evaluate actual overlapping **page × query** GSC results, not superficial similar terms, before ever using redirect, consolidation or `noindex`.

### Gate 3: Internal discovery and useful no-JavaScript answer
- The established main `/tools/` hub now supplies five descriptive native winter decision routes in source HTML. Lake Effect Snow already has an always-visible static multi-tool winter handoff in main; do not replace it with the branch's older mirror.
- The primary answer for an up-to-the-minute condition should remain clearly described to non-JavaScript crawlers as **what the tool evaluates**, where evidence comes from, the difference between forecast/observations and limits. It must never fabricate a live answer or imply stale data is current.
- On future source-repo product work, improve evergreen plain-HTML destination explanations and links before considering an evidence-timestamped server-rendered condition summary. Product logic belongs in extracted owning repositories; preserve public canonical URLs.

### Gate 4: Quality checks, release, measurement
- Run `npm run verify:all` on the final reconciled commit via Agent branch verification, including all tests, search strategy, identity, sitemap freshness and emitted public HTML audit.
- Run the 17-URL read-only cohort audit through the scoped GitHub Actions PR/workflow path; preserve the artifact. Inspect indexability, HTTP status and canonical. Check that all five newly promoted live tools load at their existing URLs.
- Merge **only** when all branch-head checks are successful and there are no unresolved routing or ownership conflicts. This release does **not** assert performance uplift or confirmed Google-selected canonical.
- After actual production deployment, compare finalized 7-day and 28-day GSC Web `page` totals (impressions, clicks, CTR, average position), also `page × query`, branded vs nonbranded and season/weather event demand. Preserve the pre-release dates and distinguish Google data lag.

## Pre-release baseline from connected Google Search Console
**Property:** `sc-domain:chrisizworski.com`  
**Period:** September 26–October 23, 2026 (28 inclusive days).  
**Source:** connected Windsor.ai Search Console Search Analytics page totals; blank means no row returned, not proven non-indexing.

| Canonical URL path | Impressions | Clicks | Average position |
| --- | ---: | ---: | ---: |
| `/lake-effect-snow/` | no row | no row | n/a |
| `/michigan-snow-depth/` | 5 | 0 | 38.80 |
| `/michigan-snow-totals/` | 1,190 | 8 | 8.49 |
| `/michigan-ice/` | 113 | 0 | 14.19 |
| `/michigan-ice-caves/` | 7 | 0 | 19.71 |
| `/snowmobile/` | 90 | 0 | 18.52 |
| `/michigan-cross-country-skiing/` | 57 | 0 | 14.86 |
| `/michigan-ski-hills/` | 14 | 0 | 7.43 |
| `/great-lakes-freighter-winter-layup/` | no row | no row | n/a |
| `/national-tools/snow/` | 8 | 0 | 20.00 |
| `/white-christmas-probability-map/` | 407 | 2 | 8.60 |
| `/national-tools/white-christmas/` | 205 | 2 | 10.52 |
| `/national-tools/white-christmas/forecast/` | 1,600 | 2 | 3.92 |

White Christmas map previously had an owner-reported 275 impressions/0 clicks in a different interval; this new 28-day window has 407/2 (0.49% CTR). The **forecast** page is the more urgent impression/CTR mismatch at 1,600 impressions, 2 clicks, position ~3.92 (0.125% CTR). The historical map and forecast have separate useful jobs; do not canonicalize one to the other without proof of duplication. Investigate precise query patterns and shown SERP titles for forecasts, including potential mismatch between a Christmas forecast published before deterministic forecasts are meteorologically feasible and an answer stating lead-time limitations.

## Owner/source and safety notes
- `izworskic/national-snowpack-melt` owns lake-effect and snow-depth engine code; `izworskic/national-white-christmas` owns Christmas product logic; `izworskic/chrisizworski-com` owns the site-shell navigation and canonical routing.
- Canonical identity `https://chrisizworski.com/#person` and visible creator credit are preserved.
- No AdSense/Auto-ads code, policies or CSS are modified. Current winter-map/ice safety disclaimers and historical-versus-live season isolation are preserved.
