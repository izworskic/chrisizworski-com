# White Christmas growth release — 2026-09-25

## Scope

The authoritative `izworskic/national-white-christmas` product was expanded from 28 to 50 materially distinct city/destination guides before this shell release. The owner repository passed its full test suite and its production Vercel deployment reported success before these URLs were added to discovery surfaces.

This shell change does not copy White Christmas product logic. It publishes the 22 newly proven canonical city routes in the dedicated White Christmas, winter, and main sitemaps and refreshes `lastmod` for White Christmas city/region surfaces materially changed by the owner release.

The shell release is gated through the repository's normal `agent/**` full verification workflow; no search or routing gate is bypassassed for this publication.

## Search evidence and reason for expansion

The September 25 Search Console review showed the White Christmas forecast surface already receiving 2,017 impressions at average position 9.13 in the latest 28-day export, while city guides such as Buffalo, Minneapolis, Pittsburgh, Syracuse, Duluth, Santa Fe, and Bozeman were already appearing on page one or near it. The expansion is therefore concentrated in the same proven snow-region and winter-destination query family rather than a nationwide city-page spray.

## Canonical boundary

- Flagship owner: `/national-tools/white-christmas/` — local probability/current-year outlook.
- Forecast support page: `/national-tools/white-christmas/forecast/` — when Christmas 2026 forecast evidence becomes useful.
- City guides: materially local climate/snowpack context plus a handoff to the live estimator.
- Region pages: regional explanation and discovery into local guides.
- No query-string estimator state is indexable.

## Measurement plan

Operating mode remains **ship-and-observe**. No active experiment freeze is created.

Leading review: compare the first complete 7-day Search Console window after recrawl with the pre-release query/page mix.

Decision review: use a complete 28-day comparable window. Measure:

1. impressions and average position for the forecast query family;
2. clicks/CTR at comparable positions for `/forecast/`;
3. impressions, clicks, and average position across the 50 city guides;
4. number of city guides earning meaningful impressions and page-one positions;
5. cannibalization between flagship, forecast, region, and city intent owners.

Do not add another large city batch merely because these URLs are indexed. Expand again only when Search Console shows demand or a distinct user decision that the current network does not satisfy.
