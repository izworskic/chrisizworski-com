# Michigan Snowmobile local-source desk — November 13, 2026 audit

## Observed live source coverage

Checked `https://chrisizworski.com/api/snowmobile-local-reports?region=...` for all six non-legacy regions late November 13 EST. **18/18 MISORVA club pages were retrieved**, with **zero** recent report headers. All were dated prior to the present riding season. This is normal for November pre-season; it is *not* evidence that riding is possible. Existing dates and local scope remain visible.

Observed examples:
- Sault Snowmobile Association: header `Reported On January 15, 2026`; the narrative begins `1/13/25`. Wrapper date and narrative **disagree by about one year**.
- Moose Country Snowmobile Club: `Good` condition field published March 6, 2026. An old `Good` label must not appear as a current November ride verdict.
- Cadillac Winter Promotions: `Poor` published December 10, 2025; last-groomed December 2021. No new grooming evidence exists in that field.
- Sault source's `January 1, 1970` last-groomed value is a placeholder, not an observed grooming date.
- Petoskey's `Closed` operator field was published January 15, 2026, and is **not a current official DNR legal closure.**

Primary references:
- https://misorva.org/trail-reports/sault-snowmobile-association/
- https://misorva.org/trail-reports/moose-country-snowmobile-club/
- https://misorva.org/trail-reports/cadillac-winter-promotions/
- https://misorva.org/trail-reports/petoskey-snowmobile-club/
- Michigan DNR states that third-party club reports are not controlled for accuracy or timeliness: https://www.michigan.gov/dnr/things-to-do/snowmobiling/trail-reports

## Fixes

1. Keep the original **18 MISORVA local sources** across six regions and add one
   direct Keweenaw Snowmobile Club page. 19 monitored sources total.
2. Official Keweenaw Snowmobile Club trail-conditions page lists a dated
   `4/1/26` season-ending note. This is a dated first-party operator note,
   **not** permission to ride in the 2026/27 snow season.
   https://www.keweenawsnowmobileclub.com/trail-conditions/
3. Parse an explicit numeric date **immediately after** the MISORVA
   `Groomer Report` heading, only if it begins the narrative. A difference
   of over 14 days from the structured `Reported On` date is a **date
   conflict**; suppress current condition and current grooming claims even
   when the wrapper timestamp would otherwise be fresh.
4. Preserve both reported and narrative dates for provenance. Clearly
   label the conflict on the page. Do not turn old narrative text into a
   present-day open/closed/safety verdict.
5. Keep the independently existing DNR legal closure feed, Rust routing
   graph, segment score and seasonal restrictions unchanged. All 19 club
   sources are **local-only**, not sufficient for whole-region score upgrades.
6. The updated copy distinguishes a checked local source directory from a
   verified route-wide trail-surface observation.

## Validation contract

- Dates in 1970 are never real grooming observations.
- Invalid dates (e.g. February 30) and dates more than one day in the
  future are rejected.
- Archived or conflicting source condition strings are not promoted to
  a current quality score or route status.
- Browser checks verify a date-conflict warning on 390px phones and
  desktops, as well as source-outage behavior and the absence of invented
  route stops.
- The timestamp when this tool fetched a source must not appear as the
  original club report date.
- No changes to AdSense, canonical page URLs, schema metadata or search
  sitemap.

## Remaining external limitations

MISORVA club pages can display dated fields that do not correspond to the
age of the text under `Groomer Report`. A `DATE_CONFLICT` warning requires
manual verification at the original source. Club posts often require a
separate Facebook page or paid GroomerTracker account for newer grooming
updates; this release does not silently scrape closed services or claim
access to their live activity.

The six-source-area desk is independent of the original two-report
Grayling–Gaylord corridor engine. A site-wide season report still requires
geographically matched current condition evidence and official DNR closure
checks; a recent club post about one trail does not qualify a region.
