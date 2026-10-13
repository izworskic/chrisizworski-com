# Pictured Rocks canonical SEO growth push — 2026-10-13

## Verified baseline (Windsor.ai → Google Search Console; sc-domain:chrisizworski.com)
- Target URL: https://picturedrocks.chrisizworski.com/
- Sep 10–Oct 10, 2026: 12 impressions, 0 clicks, average position ~10.58. Query-level sample extremely sparse; do not infer CTR opportunity or a rank trend from this.
- Older Sept 26 baseline also recorded low visibility; do not attribute the change to V5 without settled post-release data.
- Competition: NPS dominates authority topics; trip guides cover one-day itineraries; official cruise operator owns live tickets and seat availability.

## Release decisions
1. Protect V5's decision engine and original canonical. Title and meta snippet experiment remain FROZEN until query-level GSC serving is stable enough to test.
2. Make direct answers (one day, two days, boat, park pass, without boat, dogs, season and camping) crawlable; each directly links to the relevant NPS/official operator source and deeper planner.
3. Repair known wrong-host exposure: Google indexed unrelated main-site pages on the Pictured Rocks subdomain. Redirect explicit confirmed foreign-page routes to the primary hostname, retaining existing middleware's narrow matchers to avoid a cost-increasing site-wide function invocation.
4. Add only two natural internal authority links (Munising aurora and U.P. fall color). Relevant beaches, Lake Superior Circle Tour and /tools already link to the canonical; preserve winners rather than mass-edit.
5. Update true substantial-change dateModified and sitemap lastmod to Oct 13. No invented FAQ rich-results claims, new thin pages, cron, map API cost or unnecessary rebuilds.
6. Keep shared creator ID https://chrisizworski.com/#person and visible Built by Chris Izworski attribution.

## Value/loss gates (100 points; target >=90 before release)
- Host/canonical/anti-cannibalization 25
- Source-grounded intent coverage 25
- UX and core V5 preservation 20
- Relevant internal link quality 15
- Index/crawl/measurement integrity 15

Hard veto: second indexable generic planner, incorrect NPS pass/tour details, misleading ticket availability, broken main-site winner links, red CI, errors on canonical runtime, using a wildcard global middleware matcher for redirects, claiming 1M impressions or 5% CTR without real observed data.

## Outcome measurement
- Week 1: inspect Search Console URL ownership, sitemap fetch, rich metadata, and selected search phrases. Avoid treating indexation as implied by sitemap publication.
- Day 14: compare settled impressions, clicks, distinct queries, and the canonical/foreign-host split. Investigate remaining wrong-host routes by actual index evidence.
- Day 28: measure impression growth and organic CTR across Pictured Rocks canonical, not the whole site, using exactly the same window definitions. Segment query families: trip planner, map, day itinerary, boat/schedule, hikes/Chapel, family/access, fees and dog.
- One million impressions/month and 5% CTR are north-star goals for the network, not a forecast for this low-volume page. Only scale distinctive decision tools when GSC validates demand.
