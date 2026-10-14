# Utah Ski Access V2 — Production release and source safety

Release candidate: 2026-10-13. URL: https://chrisizworski.com/utah-ski-access/

## Decision promise
Four-resort, two-canyon practical trip choice: UDOT alert interpretation for SR-210 (Snowbird, Alta) and SR-190 (Solitude, Brighton); separate 2026–27 parking reservation windows, carpool-dependent published charges and Ikon Base/full access. Every result preserves blockers, required actions, unknowns and official next-click sources. No safe-to-drive, road-open, vacant-space, ticket ownership or vehicle-traction compliance guarantee.

## Source validation and provenance
UDOT developer account verified by owner directly 2026-10-13: events 268 records, roadconditions 145, message signs 221; both SR-190 and SR-210 represented across UDOT datasets. This is owner-supplied validation, **not** an authenticated end-to-end result observed by the release pipeline. Source docs:
- https://prod-ut.ibi511.com/developers/doc (10 requests per 60 seconds)
- https://prod-ut.ibi511.com/help/endpoint/event
- https://prod-ut.ibi511.com/help/endpoint/roadconditions
- https://prod-ut.ibi511.com/help/endpoint/messagesigns
- https://cottonwoodcanyons.udot.utah.gov/ (authoritative current canyon notices)
- https://www.alta.com/getting-here/parking-info
- https://www.brightonresort.com/getting-here-and-parking
- https://www.solitudemountain.com/discover-solitude/getting-here-parking
- https://www.snowbird.com/the-mountain/parking/parking-overview/

The offline adversarial classifier tests cover full vs segmented closures, one-direction closures, partial Alta bypass restrictions, traction notices, old event updates, lack of coverage, conflicting notices, empty data, upstream HTTP 429 and no-pass blockers. Actual winter closures cannot be hand-validated in October; compare future live notices with official UDOT reporting, update fixtures, and retain unknown states on disagreements.

## Vercel cache and quota
- Exactly one GET-only, unparameterized `/api/utah-ski-road`. The secret `UDOT_API_KEY` exists server-side in Vercel Production and Preview; never shipped to browser/logs. 3 UDOT feed calls **only on an origin cache refresh**, not per visitor.
- Built-in Vercel CDN shared response cache: 600-second TTL and 45-second stale-while-revalidate, with 30-second browser caching. Failure snapshots are cached 120 seconds.
- In-process single-flight coalescing plus 600-second local refresh guard; 429 and errors are distinguished and fail to UNKNOWN. No Redis, paid KV, Cron or additional database required.
- **Important limit:** Vercel's CDN response cache is regionally segmented, not a global atomic provider quota. Multiple simultaneous cold regions or evicted CDN entries can exceed UDOT's published ten-calls-per-minute key limit. The implementation *minimizes* requests but cannot enforce a hard global limit. Monitor for 429s; if volume grows, install durable distributed scheduling before claiming guaranteed quota enforcement.
- Client treats any snapshot older than 20 minutes or with bad/future timestamps as UNKNOWN. Provider event/sign rows have their own freshness gates, and feed silence NEVER becomes ROAD_OPEN.

## SEO/discovery and experience
- Canonical single indexable URL; short query-first title, OG/X metadata, structured WebPage+SoftwareApplication with the canonical Person ID.
- Route sequence diagram explicitly not to scale, mobile breakpoints with single-column cards, source links to official parking and canyon notices, searchable questions embedded as actual answers (no false claims about FAQ rich results).
- National Tools card and ItemList JSON-LD entry inserted **idempotently** by `scripts/add-utah-ski-discovery.mjs`; sitemap URL and freshness included. No shallow duplicate resort pages.
- Keep the existing Epic vs Ikon cross-link and discreet creator attribution.

## Acceptance / regression gates
1. `npm test` includes Utah offline decision scenarios, provider failures, browser parity, no guaranteed access, and per-instance concurrent single-flight test.
2. `npm run verify:all`, `npm run build:site`, `npm run benchmark:serp-length`, plus public HTML output audit.
3. Once deployed: GET `/api/utah-ski-road` returns HTTP 200 with `sourceHealth`, `observedAt`, `apiCoverage`, two canyon summaries and no upstream key or raw feeds. Cached GET keeps identical observed time; parameterized GET rejects 400, POST 405. Check `x-vercel-cache` on consecutive requests.
4. Browser sample: Jan 9, 2027 9 a.m., Ikon Base, 2 people, one used day at Snowbird and Brighton, no parking booking: Alta blocked by pass; Brighton/Solitude require parking actions; Snowbird requires parking-option verification. Date tomorrow does not reuse today's road hazard as an active trip verdict.
5. A live full-canyon closure blocks that canyon only; partial Alta bypass restriction does not automatically block Snowbird; feed empty/failed/old must NOT appear green. Verify no mobile horizontal scrolling at 360/700/1024px widths.
6. Inspect production National Tools card + sitemap; benchmark Search Console impressions, nonbranded canyon/parking queries, and CTR at day 14/28. No promise of one million impressions from a new page.

## Rollback
Revert the V2 code merge to restore preview-only mode; page should be re-marked noindex and removed from National Tools if the API repeatedly fails or unsafe classifications are seen. Immediate official UDOT links remain useful during fallback.
