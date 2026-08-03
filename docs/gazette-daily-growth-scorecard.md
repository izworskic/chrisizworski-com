# Great Lakes Gazette daily growth scorecard

This is an internal execution and measurement document. It is not published on the website.

## What the incident showed

The August 3 edition existed, but it did not meet the standard for a healthy daily newspaper. It was generated at 11:52 UTC, after 7:00 a.m. Eastern, and all seven BoatNerd passage calls failed because the old `passage/getPassageData` endpoint had been retired. The writer then led with older vessel news even though the prompt advised against doing so.

The archive itself was intact: 92 issues from March 17 through August 3 and a ten-day current publication streak. The failure was freshness and source health, not archive loss.

## Baseline

The supplied Search Console export does not isolate enough data to claim a landing-page CTR baseline for `/great-lakes-gazette/`. Those values remain `null`, not zero. The first complete 28-day post-release page and non-brand query export becomes the search baseline.

| Product measure before this build | Baseline |
| --- | ---: |
| Headline cards linking directly to the dated edition | 0 |
| Relevant owned pages carrying the current headline | 0 |
| Above-fold archive and RSS links | 0 |
| Healthy AIS ports in the August 3 edition | 0 of 7 |
| Hard current-news age filter | No |
| Cross-scheduler publication lock | No |
| Post-publication source-health verification | No |

## Release benchmark

PR 15 is ready only when:

- The landing page matches “Great Lakes shipping news today” intent while preserving its canonical URL.
- Its card links to the actual dated newspaper issue, with crawlable fallbacks to the publication, archive, and RSS feed.
- The current headline is distributed on the homepage, Great Lakes hub, ship tracker, Soo Locks, Mackinac Bridge, and Freighter View Farms authority page. Birding receives one contextual related-resource link, not an unrelated takeover.
- The Gazette publisher uses BoatNerd's current public web-client API path, reports source errors honestly, and never stores or exposes the discovered client key.
- Vessel news and port reports older than 48 hours are mechanically removed before the writer sees them.
- Vercel and two timezone-aware GitHub attempts are duplicate-safe; a distributed lock prevents overlapping runs.
- A live check requires a current headline, at least five healthy AIS ports, three NOAA level stations, and three NWS lake forecasts.

## Measurement gates

| Window | Reliability | Engagement | Search |
| --- | --- | --- | --- |
| First 7 days | Every date has one public issue; inspect any run after 7:30 a.m. | Confirm `great-lakes-gazette-edition` events arrive from every placement | Indexing and canonical diagnostics only |
| First complete 28 days | 100% daily availability; at least 96% by 7:30 a.m.; at least 95% with 5+ healthy AIS ports | Edition opens at least 2% of widget-bearing pageviews | Establish page and non-brand query baseline |
| Day 90 | No duplicates or stale-current-news incidents | Returning visitors at least 15% | Once 250 impressions exist, target at least 2.0% landing CTR |

Do not change the title or first answer during the first complete 28-day window unless indexability, factual accuracy, or publication reliability regresses.
