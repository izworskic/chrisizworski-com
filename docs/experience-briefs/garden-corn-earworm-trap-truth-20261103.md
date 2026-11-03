# MSU corn earworm trap truth: official measured evidence pilot (2026)

**Scope:** Existing Michigan Garden Pest Watch. No new route, database, Redis, Supabase, cron, API, or live pest warning.

## Visitor decision

A sweet-corn grower asks: *Did MSU Extension actually capture corn earworm moths in a reporting trap, and when?* We now present the **published measurements**, explicitly distinct from forecast conditions, voluntary photographs, and private garden observations.

Source: [Michigan State University Extension, Michigan vegetable crop report – September 2, 2026](https://msu-prod.dotcms.cloud/news/michigan-vegetable-crop-report-september-2-2026), published September 4, 2026. Its final-season table covers 8 reporting counties, 10 week-ending dates (June 28 through September 1), 55 reported cells, and 25 not-reported cells. The report explicitly calls it the **last vegetable crop report for 2026**.

## Truth and safety contract

1. Published total moths and average moths/night are preserved **as printed**. We don't derive average/night from an assumed 7-day week, redivide two-week totals, or fill missing with zero.
2. **Hartstack wire traps** (Ottawa, Oceana) generally catch more moths than cloth Heliothis traps (Washtenaw, Monroe, Saginaw, Lapeer, Genesee). Midland type is **not specified** in the source. Values from different trap designs must not be interpreted as a direct county ranking.
3. August 18 Ottawa (188, 11.8/night) and Oceana (83, 5.9/night) reflect **two-week totals**, as MSU marked with an asterisk. We retain this footnote in data, charts, and table notes.
4. County label means a participating trap identified by county, **not the entire county**, your ZIP, or a point-verified home-garden count. We never map ZIP to county automatically.
5. The latest published monitoring week is September 1, 2026. The source article was published September 4. In November 2026 and all of 2027, **2026 is an archive** until a separate audited dataset is published. Do not claim live 2027 monitoring.
6. No insecticide decision, treatment threshold, risk percentage, population estimate, predicted emergence date, or active-outbreak warning is derived from these regional counts. MSU IPM guidance remains available at the original link.

## Data pipeline

`data/garden-earworm-msu-2026.csv` retains the exact 10 x 8 transcribed data cells, including missing ("-") and marked two-week entries.

`scripts/build_garden_earworm_traps.py` validates county roster, season dates, cell syntax, sampling footnotes, missing vs zero, published averages as strings, and known anchor facts. It generates deterministic `public/assets/garden-earworm-trap-data.js`. `--check` rejects source-data drift; no network is required to produce or render it.

`scripts/verify-garden-earworm-traps.cjs` enforces archive invariants, source links, frontend entry points, missing-as-null, and all county-week rows.

`public/assets/garden-earworm-trap-desk.js` provides a local, accessible county selector, same-county nightly-average chart, raw source table, sampling labels, off-season banner and crop-stage explanatory note. No external runtime fetch; JavaScript-disabled visitors retain a source-linked example.

## Quality and loss gates

- **Source accuracy:** 80/80 county-week cells match the published last-season table; 25 unreported are not zero; 2/2 starred samples are flagged.
- **Temporal honesty:** November and next-year rollover never imply current moth counts; exact source and collection dates are visible.
- **Interpretation:** county choice is manual, trap types identified, no county risk score, no pesticide advice.
- **Usability:** mobile widths 360, 390, 768, 1440; accessible table for all bar-chart data and functional no-JS fallback.
- **Release safety:** Python/Node checks, existing garden browser suite, full repository and published HTML audits, Vercel preview, production verification.

## Next scientific investment (not yet implemented)

Explore MSU's 2027 seasonal report format when published. A verified, season-scoped ingestion path must require official article publication date, parseable county-week table, source metadata and sampling type, and default to **UNAVAILABLE** rather than silently backfilling the closed 2026 season. Do not fabricate 2027 numbers or assume that a county/trap combination persists year-to-year.

## Source detail

- MSU original county trap table: https://msu-prod.dotcms.cloud/news/michigan-vegetable-crop-report-september-2-2026
- MSU Extension: https://msu-prod.dotcmscloud.com/resources/video_tutorials_on_using_pheromone_traps_to_monitor_corn_ear_worm_in_sweet
- Cornell IPM trap context: https://cals.cornell.edu/integrated-pest-management/outreach-education/fact-sheets/pheromone-traps-for-sweet-corn
