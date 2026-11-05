# Evergreen shipping-winter archive: automatic November rollover

Date: 2026-11-05  
Canonical page: `https://chrisizworski.com/great-lakes-freighter-winter-layup/`  
Owning repository: `izworskic/chrisizworski-com`  
Purpose: keep the live winter current and automatically preserve every completed source-backed season, without annual code changes.

## Visitor decision and baseline

Visitors need to know **which winter they are viewing**, which vessel reports belong to that winter, and which historical winter records have sources. The existing Node ledger already computed a Detroit November 1 boundary but the browser defaulted to the 2025–26 archive when the 2026–27 live ledger was empty, and multiple UI links and scripts hardcoded those years. The Python historical manifest was compiled only when edited by a developer. Without automation, 2027–28 would not acquire a permanent historical page record.

New contract: **November 1 at 00:00 America/Detroit begins each shipping winter.** Throughout November–October, that winter is the selected living season; in the next November it becomes historical. This is the product's archival calendar, not a claim about a specific ship's sailing or the Soo Locks' operating schedule. It is not a global statement about when every vessel's shipping year starts.

## Architecture evaluation

| Pattern | Visitor value | Source integrity | Distinctive experience | Ongoing cost | Discovery continuity | Weighted priority |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A. Client-only yearly switch | 3 | 2 | 2 | 5 | 3 | 59 |
| **B. Existing Node evidence scanner + scheduled Python offline snapshot + browser clock fallback** | **5** | **5** | **4** | **5** | **5** | **97** |
| C. New Python request-time backend | 3 | 3 | 3 | 1 | 3 | 55 |

Scores follow Python Intelligence OS prioritization (30/25/15/15/15). They are design assessments, not observed traffic, prediction probabilities or measured conversion gains. B retains the existing attractive harbor-map narrative, current-vs-history semantics, and static SEO while removing annual hand edits. No Supabase, Redis, new database, API key, requests, AIS inference or server-side runtime service.

## Data truth and source ownership

- `lib/freighter-layup-season.js`: definitive Detroit winter-year calculation and reversible, fail-closed Node rollover. A completed year is stored even with zero reported vessel events. A missed cycle can create intervening zero-report *archive slots*, not imagined arrivals. More than 12 skipped years fails for reconciliation rather than dropping old evidence.
- `public/assets/freighter-layup-live-season.json`: authoritative currently active source-events ledger. Published `confirmed` events require existing authoritative evidence classes, while weaker journalism/community reports stay `reported`. No AIS fields are copied to the history. The current ledger is emptied when the year advances.
- `scripts/freighter-layup/evergreen.py`: offline Python stdlib reconciler, after the Node scan. Freezes each completed ledger into `freighter-layup-registry.json`, preserves curated historic reports, creates the next active season with **no vessels**, and calls the existing `history.py` to update the crawlable historical archive and versioned JSON. It validates dates, sources, harbor IDs, exact vessel keys, source authority, duplicate entries, and same-season arrivals. Python cannot upgrade an unverified report to confirmation or construct precise berth coordinates. Existing curated snapshots are not overwritten. Unknown IMO/MMSI values remain null.
- `public/assets/freighter-layup-registry.json`: permanent append-only-in-principle historical snapshot store in Git, not just a rolling temporary client array. A working winter becomes `historical_snapshot` at rollover. `previousSeasons` in the live ledger is bounded for operational size; the permanently committed registry retains older years.
- `public/assets/freighter-layup-history.json` and the single existing page's `<!-- WINTER_FLEET_HISTORY -->` HTML region: static, source-linked, readable even without JavaScript, regenerated on an actual rollover. A year without records displays an explicit evidence gap, **not zero vessels or zero winter layups**.
- `public/assets/freighter-layup.js`: keeps the actual current winter selected, with historical winters and historical map pins in the year selector. No fallback to 2025–26 or other fixed year. The current year comes from the Detroit clock even if GitHub's publishing job is delayed. A stale ledger is **not** treated as current: the source desk enters an honest provisional/pending state, with zero claimed berths and unchanged historical records.
- `public/assets/freighter-layup-history.js`: dynamically filters all historical years including empty years, with source links preserved and explicit zero-report messages. One unique history section rather than a new SEO URL every year.

## Annual work cycle (no annual human edits)

1. The existing `freighter-layup-source-watch.yml` scans four times per day during November–April and runs an extra pass November 1 at 04:09 UTC, shortly after local midnight in Michigan.
2. Node chooses the Detroit season from the actual timestamp and rolls the current ledger to that year. Old source-backed events move to `previousSeasons`, never to the new current season.
3. Offline Python converts only valid historic source events, creates the fresh empty live slot and rebuilds static manifest + HTML. The HTML's schema.org `dateModified` and the **single** winter-sitemap `lastmod` update only if content changes.
4. Only changed files are committed to `main`. Normal Vercel publication takes over. Repeated scheduled checks with unchanged data do not produce an annual artifact commit.
5. The browser's current-year fallback protects visitors even between local midnight and the next job, or if source polling fails. It does not assert source coverage or ship occupancy.

Annual coverage intentionally retains a fixed canonical page; a unique year URL, sitemap expansion, and mass-generated archive pages would risk duplicate content and maintenance. All documented years remain available in one indexed ship-by-ship archive.

## Failure modes and quality gates

- **Clock:** boundary at 2027-11-01T04:00Z, 2028-11-01T04:00Z and subsequent Novembers; May–October remains the same winter label from the preceding November.
- **Empty:** empty 2026–27 is preserved as a documented *coverage gap*. It does not become an empty-harbor fact. A future live ledger always starts empty.
- **Identity:** no fuzzy aliases, invented IMO/MMSI, exact berth GPS, or carryover location from another winter.
- **Confidence:** journalistic and community reports can never become confirmed simply by archival conversion. Invalid source/harbor/date/kind or duplicate source events fail closed.
- **Source unavailability:** an unavailable or stale live ledger remains a provisional current-season message, not the previous year's ship roster.
- **Idempotence:** running Python twice across the same registry+ledger yields byte-identical assets and unchanged sitemap. `--check` fails if any generated artifact drifts.
- **Historical immutability:** existing manually curated snapshots have priority and must not be overwritten by a later partial ledger.
- **Access and appearance:** 360/390/tablet/desktop behavior, current year default, harbor selection, year-to-year browsing, live story cards, source links, no-JS readable history and publisher citations. Preserve current Page/Person schema, canonical URL, ad exclusion, map marker integrity and ship biographies.
- **Operational:** no extra external data calls, zero request-time Python execution, no new scheduled workflows or persistent services. RSS scanners and reviewed editorial pipeline remain unchanged.

Regression suite: `python3 -m unittest discover -s scripts/freighter-layup -p 'test_*.py'`; `python3 scripts/freighter-layup/evergreen.py --check`; `python3 scripts/freighter-layup/history.py --check`; `node --test tests/freighter-layup-evergreen.test.js tests/freighter-layup-season.test.js tests/freighter-layup-history.test.js`; complete `npm run verify:all`; and the real Chrome winter-layup release gate.

## Source/cost/SEO register

Source rights are unchanged from prior implementations. The only inputs are Git-tracked curated identity, original published URL/date metadata, existing Node source ledger, and America/Detroit calendar rules (system timezone database). No novel license, feed, scraping or media expansion. Temporal contract distinguishes source report day, local winter boundary, Git commit last-modified date, and live feed as-of. When source day is absent or invalid, the archive fails instead of treating the report as today's ship position. Historical count is always a **count of documented sources**, never total fleet population.

Performance expectation: static JSON and HTML plus the same existing browser assets; negligible Python batch cost. Real bundle sizes, GSC impressions, CTR and completed visitor journeys must be measured separately; no growth is claimed from evergreen maintenance alone.

## Rollback and next action

Revert the merged PR for a code rollback. Keep the previously committed historical snapshots, rather than deleting a year that acquired real source evidence. Annual scheduled source scans can be paused or reverted without changing the current verified historical facts.

**Next scientific investment:** run a full 2027-11-01 forced-calendar rehearsal on GitHub Actions before the first real transition, then inspect source coverage and newly committed historical manifest against the existing 2026–27 ledger. Manual proof of source reports should not be requested from visitors.
