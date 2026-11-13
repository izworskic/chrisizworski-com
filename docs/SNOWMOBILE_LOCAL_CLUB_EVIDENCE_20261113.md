# Michigan Snowmobile: local club condition evidence desk (2026-11-13)

## Visitor decision

Riders need to know what the local grooming operator **actually reported
and when** before heading to the trail. The DNR does not control the
accuracy or timeliness of third-party trail reports, and those reports
are specific to clubs/trails, not whole regional bundles.

Primary sources:
- DNR third-party reporting warning:
  https://www.michigan.gov/dnr/things-to-do/snowmobiling/trail-reports
- MISORVA directory:
  https://misorva.org/trail-report/
- Individual MISORVA club pages: `lib/snowmobile/local-reports.cjs` roster

## Coverage and truth

Six regional pages now monitor **three independently linked MISORVA clubs
each** (18 local reporting sources). Scope is disclosed on each card.

| Region | Selected local clubs |
| --- | --- |
| Eastern U.P. | Sault, Paradise Night Riders, Tahquamenon |
| Keweenaw | Keweenaw Trails Services, Baraga County, North Country Ontonagon |
| Central/Western U.P. | Moose Country, Big Bay 550, Gogebic Area |
| Northeast / Sunrise | Cheboygan, Presque Isle, Lewiston |
| Northwest | Petoskey, Jordan Valley, Grand Traverse |
| West Michigan | Cadillac, Pere Marquette, Benzie–Manistee |

Grayling–Gaylord retains the existing, separately tested detailed
two-club scoring and report reconciliation; no change to its API, code
or source hierarchy.

On **Nov 13, 2026**, MISORVA's Sault page displayed a report published
Jan 15, 2026 and a last-groomed date Jan 01, **1970**. The latter is
a placeholder, not grooming evidence. Other sources have March 2026
reports from the previous season. Showing their old "Good" or "Excellent"
verdicts as current would mislead. This release:
- parses the MISORVA **structured reported-on date**; the fetch timestamp
  is independently labelled *source check*, not observation;
- invalidates pre-2010 grooming dates including Jan 1 1970, future
  observations, and unparseable date headers;
- distinguishes RECENT (0–3 days), AGING (4–7 days), STALE (>7 days),
  UNDATED, UNAVAILABLE per club;
- suppresses old / pre-season **condition ratings** even if a page still
  says Excellent; grooming evidence is explicitly dated;
- includes linked operator reports and local scope on every card, but
  cannot assert current access, opened trail, groomed coverage or permission;
- never changes `scoreSegment`, DNR closure status, Rust/WASM routing,
  confidence calculations, regional condition recommendation or SEO title;
- displays an honest no-recent-report message when there is none.

The region-specific report service is read-only, fixed to 18 listed
MISORVA URLs, requests three pages concurrently at most, times out
each source after 6.2 seconds and caches a report set for 15 minutes
(Vercel CDN also caches success responses). Upstream parse failure
and missing source data never turn into an optimistic condition.

## Source revalidation

In-season reports will be monitored automatically when visitors open
a regional page. Owners should revisit source addresses and scope
seasonally: club coverage, trail closures, and posting frequency change.
The MISORVA directory is the primary link fallback, not an official DNR
permission notice. Other local report sources can be added with explicit
source and geographic scope only.

## Release checklist

```sh
node --test tests/snowmobile-local-reports.test.js tests/snowmobile-parking.test.js tests/snowmobile-access-evidence.test.js tests/snowmobile-route-ui.test.js tests/snowmobile-rust.test.js
node scripts/generate-snowmobile-region-pages.mjs
git diff --exit-code -- public/snowmobile/regions/
node scripts/verify-snowmobile-local-reports-browser.cjs # Playwright in CI
```

Post-merge: Vercel READY, verify the exact new API returns 18-link
regional data (3 per region), live regional HTML contains local club
desk and current report age is not confused with check time.
