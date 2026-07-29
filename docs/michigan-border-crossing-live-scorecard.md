# Michigan–Ontario Border Crossing Live launch benchmark

Build date: July 28, 2026 (America/Detroit)

This benchmark is the acceptance contract for a year-round Michigan border-crossing tool. It covers the three Detroit–Windsor choices, the Blue Water Bridge at Port Huron–Sarnia, and the Sault Ste. Marie International Bridge in the Upper Peninsula.

The launch threshold is **95/100 with every safety and data-integrity gate passing**. A high total cannot offset an invented wait, a mislabeled direction, or a failure that presents a crossing as clear.

## Product-quality scorecard

| Area | Weight | Launch requirement |
| --- | ---: | --- |
| Immediate crossing decision | 25 | The first mobile screen answers which Detroit crossing has the lowest currently reported border-processing delay for the selected direction, vehicle, and lane. Blue Water and Sault remain one tap away. Ties are stated as ties. |
| Data integrity and traveller safety | 25 | CBSA controls U.S.→Canada estimates; CBP controls Canada→U.S. estimates and lane counts. Approach incidents and weather warnings remain separate. Unknown never becomes zero, open, or “all clear.” |
| Live reliability | 20 | Independent sources fail softly; API and media routes use timeouts, validation, CDN caching, and useful source states. Camera stills load through the site’s own domain. |
| Search and answer readiness | 20 | The main live page and five substantial crossing pages have unique intent-led metadata, self-canonicals, crawlable links, structured data, visible questions, sitemap coverage, and hub discovery. |
| Experience and measurement | 10 | Keyboard and touch controls, reduced motion, accessible status language, 390 px–1440 px layouts, no horizontal overflow, analytics events, Web Analytics, and Speed Insights are present. |
| **Total** | **100** | **95 minimum; target 99** |

## Live-data acceptance gates

| Gate | Requirement |
| --- | --- |
| Crossing inventory | Include Gordie Howe International Bridge, Ambassador Bridge, Detroit–Windsor Tunnel, Blue Water Bridge, and Sault Ste. Marie International Bridge. |
| Direction | Use “To Canada” and “To United States.” Do not rely on northbound, southbound, eastbound, or westbound shorthand. |
| Canada-bound waits | Parse the official CBSA current border-wait CSV and expose its own update time. |
| U.S.-bound waits | Parse the official CBP Border Wait Times JSON, including passenger, commercial, NEXUS, Ready Lane, and FAST states where published. |
| Fastest Detroit answer | Compare only the three Detroit–Windsor crossings, only within the same direction, vehicle class, and lane class. Report a tie rather than choosing arbitrarily. |
| Wait meaning | Say “reported border-processing delay.” Explain that toll-plaza and approach-road time are excluded. Never claim total trip time. |
| Port state | Show official open/closed/pending/unknown states without inferring from a missing row or a zero-minute report. |
| Trends | Use official CBP daily/typical graph data only for U.S.-bound trends. Do not predict a closure or publish a fabricated best crossing window. |
| Warnings | Keep CBP notices, Ontario 511 incidents/alerts, and NWS weather alerts visibly separate from border-processing estimates. |
| Cameras | Provide a useful official operator or Ontario 511 view for each crossing. Label approach cameras as approach cameras, not proof of a queue. |
| Camera reliability | Proxy still images through an allowlisted same-origin function, validate content types, cache briefly, and provide a direct official fallback. |
| Tolls | Show a dated passenger-vehicle planning snapshot with currency and payment context. Link to the operator and warn that rates can change. |
| Outage behavior | A failed source produces “unavailable” with its direct official link. It never produces “no delay,” “open,” or a recommendation. |
| Freshness | Show source-specific update times and the tool fetch time. Treat stale reports as stale rather than current. |
| Refresh | Refresh automatically no faster than the underlying feeds and provide a manual refresh control. |

## Search-intent benchmark

| Search family | Required answer surface |
| --- | --- |
| Michigan border wait times | Main live comparison page with all five crossings |
| Fastest Detroit border crossing | Direction-aware comparison of Gordie Howe, Ambassador, and the tunnel |
| Gordie Howe Bridge wait time | Dedicated indexable page plus live card, toll, approach camera, and opening-era questions |
| Ambassador Bridge wait time | Dedicated page plus both-direction waits, toll, camera link, and alternatives |
| Detroit–Windsor Tunnel wait time | Dedicated page plus vehicle restrictions, toll direction, camera link, and alternatives |
| Blue Water Bridge wait time | Dedicated Port Huron–Sarnia page with both directions, toll context, queue cameras, and approach traffic |
| Sault Ste. Marie border wait time | Dedicated Upper Peninsula page with both directions, official live bridge cameras, tolls, and 24-hour status |
| Canada border documents by car | Visible, cautious answer with links to current CBSA and CBP requirements |
| Can I bring food / alcohol / cannabis / a firearm? | Visible answers that send travellers to the controlling government rules and never summarize changing allowances as legal advice |
| NEXUS / FAST / Ready Lane | Lane-selector explanation and current availability only where the official source publishes it |

## Competitive benchmark

| Capability | CBSA | CBP | Individual operators | Launch target |
| --- | --- | --- | --- | --- |
| Both countries in one view | No | No | Usually no | Yes |
| Three Detroit choices compared | No | No | No | Yes |
| Blue Water and Upper Peninsula included | List only | List only | Separate sites | Yes |
| Passenger and commercial | Yes | Yes | Varies | Yes |
| NEXUS / Ready / FAST state | No | Yes | Varies | Yes |
| Approach incidents and weather warnings | Links only | No | Varies | Yes, clearly separated |
| Camera reliability | No | No | Fragmented | Same-origin stills plus official live links |
| Toll comparison | No | No | One crossing at a time | Dated cross-operator snapshot |
| Source freshness and outage states | Partial | Partial | Varies | Per source, fail-safe |
| Search pages for each crossing | No | No | Operator pages | Five useful pages cross-linked to the live comparison |

## Performance and accessibility budgets

| Measure | Launch gate |
| --- | --- |
| JavaScript | No client framework; first-party app script under 75 KB uncompressed |
| CSS | Shared first-party stylesheet under 90 KB uncompressed |
| Initial cameras | Load only the selected camera; lazy-load alternatives |
| Core answer | Present in server-rendered HTML before live data arrives |
| Layout | No horizontal overflow at 390 px, 768 px, or 1440 px |
| Accessibility | Zero serious or critical automated findings; all controls keyboard reachable; status is not communicated by color alone |
| Resilience | Core page remains useful when every live request fails |

## Launch and measurement gates

1. Run unit, API-contract, static SEO, sitemap, indexing, source-verification, and production-readiness checks.
2. Exercise all five crossing selections, both directions, vehicle types, applicable lanes, camera switches, refresh, copy-link action, and mobile layout in a real browser.
3. Confirm the Vercel preview host is `noindex` and the custom-domain canonicals remain indexable.
4. Verify the two core wait sources and every configured media source against live upstream responses.
5. Open a draft pull request and leave it unmerged for review.
6. After production launch, record Search Console and analytics baselines at 7, 28, 90, and 180 days. Compare query impressions, organic entrances, return visits, engaged sessions, and Core Web Vitals with Northern Lights, Soo Locks, and Mackinac Bridge Live without manufacturing a traffic forecast.
