# Snowmobile winter discovery release — October 5, 2026

The statewide canonical remains `/snowmobile/`. Seven existing regional pages own local maps and route-planning decisions. No new indexable content URLs were created.

## Shipped coverage

- Query-aligned titles and descriptions explain mapped route planning and condition evidence; Chris Izworski remains in every title.
- Eight static 1200 × 630 PNG social cards identify the area and builder. Open Graph and X/Twitter metadata include image dimensions and alt text; no invented account handle, photograph or live-condition claim.
- WebPage, WebApplication, ImageObject and statewide regional ItemList connect the planner, image, page and canonical Person. Existing breadcrumbs and author/publisher relationships remain.
- Static coverage, route instructions, condition limitations and linked official sources are readable without fetching the live API.
- Regional sibling links, the existing winter tools network, a Mackinac Bridge sled-trip handoff and a Works-index entry provide crawlable discovery. The AI discovery file documents canonical routes and evidence limits.
- Visible bottom credit links to Chris's canonical profile, other work and the problem-report contact page. Sharing controls open a page link on X/Twitter or Facebook; they do not publish automatically, retain location or serialize a route.

Generate HTML with `node scripts/generate-snowmobile-region-pages.mjs`. Generate social assets manually with `python scripts/generate-snowmobile-social.py` (Pillow and DejaVu Sans); committed PNGs require no Python in production.

## Observe after deployment

Use comparable complete 28-day Search Console windows, separating statewide and regional pages, branded and nonbranded queries, and seasonal demand. Track impressions, position, CTR and clicks for conditions, trail-map and route-planner queries. Compare mobile engagement and actual planner use before interpreting search gains. No ranking or revenue uplift is established by metadata changes alone. Existing URLs may be requested for recrawl; no new-page indexing submission is needed. Do not turn off-season or missing evidence into a positive riding claim to improve a snippet.

## November 23, 2026 town-level discovery investment

- Existing seven region URLs own 27 demand-proxy towns. No town landing pages, routes, functions, cron jobs, databases or extra sitemap entries were added.
- Selection has **two separately auditable tests**. Google autocomplete in US English was pulled for 52 `snowmobile trail conditions/report a–z` seeds plus named-town trail seeds, which indicates possible phrasing, **not Google Search Console volume**. `data/snowmobile-town-proximity/{region}.json` preserves the matched suggestion and seed, then a dated Michigan DNR `DNRTrailsOPENDATA` layer 15 point query requiring a designated trail feature within 5 km. Per-town generalized DNR centerlines are committed as reproducible build inputs; the existing runtime DNR feed remains the source for actual trail status and closures. Excluded if no designated DNR segment within 5 km: Petoskey, Traverse City, Manistee, Charlevoix and Boyne City; other examined towns without a positive autocomplete result are also excluded.
- `lib/snowmobile/town-discovery.mjs` computes from those snapshots, at every build: nearby official DNR trail codes, the nearest *mapped* network endpoint/junction, a bounded existing club source link when available, and the nearest geolocated NWS ACIS climate station already used by Michigan Snow Totals. A mapped endpoint **is not** a verified staging location, parking lot, junction crossing or navigable road destination.
- The town cards have static h3 anchors, numbered trails, NWS reference station, the scoped original report link (or the MISORVA directory when no club is matched) and a focus link into the *existing* region map. The client fills town evidence from the existing `/api/snowmobile-local-reports` endpoint; it shows source dates and never converts snow, DNR designation or a stale/undated report into rideable/groomed claims. Grayling and Gaylord use their original two club sources, now also exposed through the same local-report endpoint for the town cards. The legacy corridor score and map behavior are not replaced.
- Original regional page titles, canonical URLs, the Person identity, site advertising and all existing report/closure hierarchies are preserved. Descriptions include up to three actual source-verified town names, capped at 158 characters. Generated regional `dateModified` and its regression test change together to November 23, 2026.
- Verification must include `npm run verify:all`, a full-history Actions checkout (`fetch-depth: 0`), built-page audit, and post-PR checks. Unmeasured search traffic, CTR, revenue and actual visitor behavior are not described as improved.
