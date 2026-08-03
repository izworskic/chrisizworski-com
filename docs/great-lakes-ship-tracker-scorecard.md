# Great Lakes Ship Tracker Growth Scorecard

This is an internal execution and measurement document. It is not published on the website.

## Search Console baseline

Baseline supplied in the August 2026 Search Console export for `/great-lakes-freighter-tracking/`:

| Metric | Baseline |
| --- | ---: |
| Impressions | 996 |
| Clicks | 1 |
| CTR | 0.10% |
| Average position | 23.87 |

Supporting query signals include `great lake freighter tracker` at average position 18, `track freighters great lakes` at 17.5, `vessel tracker great lakes` at 21.5, and several ship-tracker variants between positions 22 and 28.

## Product benchmark

The build must pass all of these gates before release:

- The existing canonical URL remains unchanged.
- The title and first answer match live Great Lakes ship-tracker intent.
- A supported public AIS map loads without exposing an API key.
- Users can switch among all five lakes, Soo Locks, Straits of Mackinac, Duluth-Superior, Port Huron, Detroit River, and Saginaw Bay.
- Each corridor connects to its relevant named-passage source without copying or republishing third-party schedules.
- Corridor views load the nearest available NOAA station context through the site's existing same-origin buoy endpoint.
- The page remains useful without the third-party map or JavaScript.
- Mobile map height stays bounded at phone and tablet widths.
- Internal links connect the tracker with Soo Locks, Mackinac Bridge, Great Lakes Buoys, Great Lakes Gazette, the tools hub, and the Great Lakes hub.
- Structured data, sitemap metadata, analytics events, and static integration tests pass.

## Search targets

Use a same-length Search Console comparison window; do not compare a partial window with the full baseline export.

| Horizon | CTR target | Position target | Impression target |
| --- | ---: | ---: | ---: |
| First complete 28 days | at least 1.0% | 18 or better | leading indicator only |
| 90 days | at least 1.5% | 15 or better | 3x baseline-window impressions |

The seven-day check is diagnostic only. It may detect indexing, canonical, iframe, or internal-link failures but cannot declare the experiment a winner.

## Release measurement

When the PR reaches production, set `releaseDate` in `benchmarks/growth-experiments.json`, add a complete 28-day evaluation window beginning the following day, and leave the title and description unchanged through that window unless a technical regression triggers the stop condition.
