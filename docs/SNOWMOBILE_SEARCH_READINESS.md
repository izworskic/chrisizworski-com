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
