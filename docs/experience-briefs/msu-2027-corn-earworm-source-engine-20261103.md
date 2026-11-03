# MSU 2027 corn earworm: official reporting ingestion and publication gate

Status: implementation dated **November 3, 2026**. There are **no verified 2027 corn earworm trap records** yet. Existing 2026 county data are immutable and remain displayed as a prior-season archive.

## Why this investment

MSU Extension publishes actual corn earworm pheromone-trap records in the Michigan vegetable crop reports. They are scientific field evidence, not a model or voluntary image reports. A separate lane can support growers without inventing emergence, countywide infestation, or pesticide thresholds.

The source has changed within a single season: the August 12, 2026 report includes **Allegan County** with blank cells, while the September 2 final report has eight other county columns. The two-week sampling and wire Hartstack versus cloth Heliothis distinctions are real measurement qualifications. A fixed county-index scraper risks silently putting a count under the wrong county.

Authoritative verification references:
- 2026 final report and published collection table: https://www.canr.msu.edu/news/michigan-vegetable-crop-report-september-2-2026
- 2026 mid-season table with different county roster: https://www.canr.msu.edu/news/michigan-vegetable-crop-report-august-12-2026
- Official article listing: https://www.canr.msu.edu/vegetables/news

## The scientific ingestion path

- **Discovery:** `scripts/ingest_msu_earworm_2027.py` queries at most five pages of the first-party MSU Vegetables news listing; opens at most eight recognized same-origin report URLs, 2027 only. No speculative date-based URLs, social search, hidden APIs, scraping unknown domains, user observations or cached inferred dates.
- **Identity:** Require exact report title, official Open Graph article title matching the visible heading, canonical URL, and a single publication `<time datetime>`. Reject cross-year, future, malformed, or off-domain sources.
- **Table selection:** Require a unique corn earworm table beginning with `Week`, explicitly labeled county columns, strictly ordered Michigan-season collection dates, bounded rows, and exact cell grammar. An earlier table of unrelated pests cannot be misread as the corn earworm table.
- **Source structure:** County headings are parsed by name, not assumed indexes. Detect new/unknown county names, roster changes, blank rather than dash, ambiguous trap method, missing footnote definitions, unexpected starred collections, and period gaps.
- **Data contract:** Preserve original reported cell as text, moth total, printed nightly average (including insignificant-looking trailing zeros), missing state, double-period annotation, county name and trap type. No count interpolation, county extrapolation, zero as unknown, spray threshold or unverified 2027 records.
- **Freshness:** Reject a table published over 21 days ago from *new discovery*; an already reviewed older source remains visible with an explicit dated label. The source's publication date and latest collection date are separate.
- **Failure:** A 404, source layout drift, source method ambiguity or source outage yields a failed source check or scientific review veto. These cannot produce data labeled as no moths, and never replace 2026 with invented 2027 values.

## Review gate and operational behavior

`.github/workflows/msu-earworm-2027-source-review.yml` is scheduled Thursdays, May–September, starting effectively in 2027 via a hard year check. It has a manual run option for source discovery and an optional 2026 published-source backtest.

An official 2027 table yields candidate CSV, per-source provenance JSON with a hash of source *table cells* (not changing website chrome), and a review-only browser bundle. It creates a **draft GitHub PR** with source URL, publication date, counties, trap types and science flags. If GitHub Actions cannot create PRs under repo policy, the workflow attempts to open a review issue pointing to the retained source branch. No automatic PR merge, deploy, database, or persistent hosting costs.

The webpage loads `window.GardenEarwormTrap2027Data=null` today. When a candidate PR has been **explicitly reviewed and merged**, the source-specific 2027 viewer can display independent 2027 measurements if all data-contract checks pass and `reviewFlags` is empty. A flagged candidate remains hidden, even if mistakenly merged; the visitor sees an explicit source-unverified state while the 2026 archive remains available.

To resolve review flags, the reviewer must inspect the actual MSU article and footnotes and document a defensible change, not simply delete flags to make charts appear.

## Release benchmarks and vetoes

1. **2026 historic backtest:** all 80 published cells (8 counties × 10 weeks) match the archived source; 25 missing reports remain missing, zeros stay zeros.
2. **Column drift:** synthetic reproduction of the 2026 Allegan extra column never shifts Oceana or another existing county.
3. **Source authenticity:** reject wrong-domain links, absent canonical/title/date, future-dated articles, invalid cell grammar, merged table cells and unexplained sampling asterisks.
4. **Publication gate:** production 2026 displays no fabricated 2027 data; a valid reviewed 2027 synthetic fixture renders in a browser at 360, 390, 768 and 1440 px; invalid, missing and stale source states are understood.
5. **SEO/UI stability:** existing pest page canonical, crop-stage desk, Japanese beetle source, 2026 archive and responsive layout remain functional.
6. **Maintenance:** zero 2027 report dates invented; future season changes may require a new approved year and source contract.

Validation commands: `python3 -m unittest discover -s tests -p test_msu_earworm_2027_ingest.py -v`; `python3 scripts/ingest_msu_earworm_2027.py --mode check-window`; `node scripts/verify-garden-earworm-2027.cjs`; `node scripts/verify-garden-earworm-2027-browser.cjs`.

No Supabase, Redis, user-supplied sightings or live direct-from-browser MSU scraping.
