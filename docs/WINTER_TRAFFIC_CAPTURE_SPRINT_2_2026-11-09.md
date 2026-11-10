# November 9, 2026 — Winter Traffic Capture, sprint 2

## Decision and ownership

Continue November search-growth work without launching a new tool, duplicating winter pages or disrupting Sprint 1 measurement. The owner of `/national-tools/white-christmas/forecast/` and the national Christmas calculator remains `izworskic/national-white-christmas`; these routes were **not edited**. Main-site `/michigan-snow-totals/` is the source for observed NWS snowfall, distinct from modeled snow-on-ground or forecast snowbelts.

## Search baseline: not an outcome

From the Nov 9, 2026 property-wide Google Search Console export retained in the private Growth Command Center. Page/query aggregate rows in this export cover the available long interval (not just Nov 1–7); never present as current daily traffic or page revenue.

| Exact page or disclosed query | Impressions | Clicks | CTR | Average position |
| --- | ---: | ---: | ---: | ---: |
| Page: `/michigan-snow-totals/` | 1,876 | 10 | 0.53% | 8.49 |
| Page: `/national-tools/white-christmas/forecast/` | 4,023 | 4 | 0.10% | 7.0 |
| Query: `white christmas forecast 2026` | 1,047 | 2 | 0.19% | 10.25 |
| Query: `will it snow on christmas 2026` | 450 | 0 | 0% | 6.8 |

Page totals are not derived from disclosed query totals. The query `will it snow for christmas` (2,305 impressions, 0 clicks) is **ambiguous with an existing film title**; it is not proof the weather page failed on 2,305 qualified weather searches. The national Christmas owner already published a location-first 2026 weather/snow-cover distinction and a controlled meta-description treatment on Oct 26. Wait for like-for-like measured post-test weather-specific results before any new search-title intervention.

## Visitor jobs assessed

1. **How much snow fell in my Michigan town recently?** — NWS observer reports, source/time, place and real measurement window. Existing `/michigan-snow-totals/` already has the right H1 and NWS-first map. Add four truthful quick-entry city links as optional 7-day `?town=` deep links, not fabricated town totals. Deep links reopen the real city search in the existing client, via `SnowCore.parseParams`.
2. **Where is snow still on the ground?** — Michigan Snow Depth's modeled NOAA/NOHRSC field checked against observations. Do not use today's reported snowfall as a snow-depth measurement. Add a visible, distinct decision link in the snow-report section.
3. **Where might lake effect hit in the next 72 hours?** — Existing lake-effect NWS forecast with uncertainty. Not a measured storm total, not a band-track prediction. Connect the existing dedicated route rather than building or promoting a competing forecast URL.
4. **Will my city have snow at Christmas?** — Christmas 2026 historical odds now, and a useful NWS short-range snowfall/weather forecast only closer to Dec 25. Link to the national owner's existing city-first, weather-qualified forecast. No 2026 outcome invented.

## Actual changes

- Keep the report form and live 24h/48h/72h/168h data controls first. Add small, crawlable and keyboard-accessible 7-day city shortcuts for Marquette, Gaylord, Grand Rapids and Bay City. They open `?town=` plus `?window=168h`, without claiming a report exists.
- Replace the generic "heading out to ride or ski" links with a compact, source-differentiated, responsive **three-choice winter decision surface** immediately after the live snow summary and before the map. Keep the weather observation map, measured values, active NWS alerts, and source notices intact.
- Keep trail-status links but disclose that snowfall does not prove a trail is safe, open or groomed.
- Collapse the historical 2025–26 52-station table by default, leaving it accessible; the current 2026–27 season panel and the existing JS fallback behavior are untouched.
- Preserve route title/meta/H1, canonical, robots, Person identity, local weather computations, published NWS/NOAA timestamps, AdSense positions and sitemaps except truthful `lastmod`.
- CI test includes exact deep-link URLs, audience-intent separation, 2025–26 historical distinction and page/sitemap date parity.

## Release gates, safeguards, and expected learning

Require full repository gate, emitted-page public audit, Vercel production SHA, and actual readback of HTML and relevant city links before declaring the release live. Check compact 360px presentation and that today's observed reports still lead. Avoid treating a successful CI run as a verified Google crawl or a CTR/revenue result.

After a complete post-release 7-day and 28-day Search Console Web window, compare `/michigan-snow-totals/` and four relevant winter intent destinations at comparable rank and season. Record impressions, clicks, CTR, ranking, repeat engagement (if GA4 attributable) and verified AdSense page RPM only when an accurately dated export exists. If navigation benefits cannot be substantiated and mobile readability worsens, simplify/revert.

No new indexable page, no automatic title churn, no weather-model or forecast-window changes, no ad density changes. **This sprint is visitor utility/discovery, not a claim to have earned new revenue.**
