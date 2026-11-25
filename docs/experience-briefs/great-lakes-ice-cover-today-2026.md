# Great Lakes ice cover today: experience and source brief
Date: 2026-11-23 · Owner: `/michigan-ice/ice-cover-history.html` · Release: PR review only

## Visitor decision and source truth
A Great Lakes visitor asks: **How much is frozen today, and is this unusual?** The answer is a whole-lake ice-cover percentage, which is *not* a local thickness or access assessment. The existing Michigan Ice hub continues to answer local accumulated-cold and water-specific questions; this existing history URL is the canonical national daily-coverage and historical-comparison destination. The official source is [NOAA GLERL daily ice climatology](https://www.glerl.noaa.gov/data/ice/glicd/daily/bas.txt) and the GLERL current ice-year series. The historical answer's reported peak is calculated at generation time against the pinned source snapshot (1973–2026), not a hardcoded guess. The static answer is usable with JavaScript off.

## Two viable concepts
1. **Record-first comparison board, then seasonal envelope (selected).** One row for each of the five lakes and basin total, current percentage, rank and range marker, then a reversible lake selector controlling one SVG daily chart and parallel accessible HTML data table. A single board exposes comparisons on phones without suggesting spatial precision that NOAA does not provide. Independent missing-value handling makes gaps visible.
2. **Five separate map-first lake panels (rejected).** Offers visual geography but demands an unjustified map source, increases navigation and API payload complexity, and risks making a whole-lake fraction look like verified local ice. The chart is more honest for the user's question.

The nearest existing experiences are the Michigan Ice hub (local thermal and regional context) and the Great Lakes freighter winter-layup page (shipping decisions). This experience differs by opening with a cross-lake historical **distribution**, and by coupling a single switchable day-by-day observed-vs-archive plot with a full data table rather than a trip picker or a vessel map.

## States and controls
- In season with same-day observation: show measured values, rank within only those ice years actually recorded for that date, same-date previous-year value and the observed season-to-date peak/date.
- Missing GLERL file/lake/date: display unavailable, not 0; do not infer a trend or promise ice. Each lake file fails independently.
- June to mid-November: no current-day comparison; show last recorded ice year's peak for each lake and basin when available.
- Lake selector changes the SVG, alt text and table together; repeat selection must not accumulate chart elements; native select works with a keyboard.
- No JavaScript or outage: the static HTML answer and official source links remain; visible live surfaces state the unavailable condition.
- The existing SAFETY_BANNER and Michigan DNR position remain; never imply safe ice.

## Technology, verification, release boundary
Reuse Python generator for the static peak calculation, the existing Edge `/api/ice` function for server-only GLERL retrieval and six-hour cache, and existing browser JavaScript for SVG. No extra Vercel function, cron, project, database, Rust, Java, React or paid data source is justified. Test dynamic-day fixtures, NA and measured 0, six independent lakes, rank, metadata, generated manifests, sitemaps, freshness and entire full-history CI. Browser QA at mobile/desktop viewports and production availability are **not verified** by source/tests alone; no merge without Chris's review. No GSC/AdSense uplift claim.
