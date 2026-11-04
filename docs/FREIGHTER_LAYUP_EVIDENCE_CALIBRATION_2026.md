# Freighter layup scientific investment II: source coverage and review triage

Date: 2026-11-04  
Owner: `izworskic/chrisizworski-com`  
Public route: `/great-lakes-freighter-winter-layup/` (same canonical; no new page)

## Outcome and risk control

Visitors need source-backed layup records, never inferred overnight occupancy or invented arrivals. This change improves the *evidence scanner* without altering the existing Node publication rules, current winter ledger, source-class authority, AIS separation, historical record counts, ad exception, map or page identity.

### Before/after repeatable source run

| Benchmark | Baseline (Nov 3) | New scan (Nov 4) |
|---|---:|---:|
| Source inputs | 20 | 20 |
| HTTP-successful feeds | 18 | 19 |
| Failed feeds | 2 | 1 |
| Articles observed | 197 | 205 |
| Flagged for additional shadow review | 8 | 0 |
| Duplicate rows from overlapping feeds | Mixed into flags | 7 counted separately |
| Dated publisher feeds | Not distinguished | 16 |
| Empty publisher RSS feeds | Counted as success | 2 |
| Roster lookup (not yet announced) | Counted as success | Separately reported |
| 2026–27 verified winter entries | 0 | 0 |

**Interpretation:** The old `portofthunderbay.ca/feed/` returned a 403 to the Node scanner; the official canonical `www.portthunderbay.ca/feed/` delivered ten dated items (latest June 12, 2026) and original links on Nov 4. The live public newsroom is `https://www.portthunderbay.ca/news/`. None of those articles themselves proves a 2026–27 layup. The remaining Great Lakes Now feed returns 403 and is not bypassed. Existing regional discovery feeds remain review-only. The 0 flags are *not* proof that the scanner found every relevant layup or that the harbors are empty.

No feed scraping expansion, credential workaround, paid source, Redis, Supabase, new public JSON endpoint, runtime Python, third-party data download to the page or novel copyright use. Only article metadata and URLs from the site's existing source fetchers enter a private, seven-day audit artifact.

## Main scientific defect repaired

The Python v1 shadow audit reported seven redundant RSS/article URLs and one August 2026 two-vessel harbor movement as eight potential investigation leads. Those items were out-of-season or routine traffic; the flags were *not* ground-truth winter arrivals. v2 counts duplicates as overlapping feed coverage, and only considers source-backed review leads within the relevant winter, or an existing Node candidate requiring checks.

The official Thunder Bay host mismatch mattered twice: the old request was blocked, and the canonical site's actual article URLs would fail the Node strict hostname check. The source host, RSS URL, visitor newsroom link and regression tests now agree. `greatlakesnow.org/feed/` remains explicitly BLOCKED (HTTP 403). A malformed HTML/access-denied response returning HTTP 200 now fails RSS validation instead of becoming a false healthy source.

The shadow adds a **review-only** cue for named ships in winter-month maritime museum arrival headlines even if the headline omits the words "winter layup"; it cannot publish a berth, location, event or confirmation. Node remains the only automatic publication authority.

## Retrospective source-adjudicated check

`data/freighter-layup-shadow-adjudications.json` contains 15 explicitly source-linked, editorially reviewed examples, not artificial synthetic vessel records: seven genuine articles worthy of winter-layup **investigation** and eight nonlayup/off-season titles. Sources include Wisconsin Marine Historical Society, Community Waterfront Heritage Centre, Duluth Harbor Cam, Bayshore Broadcasting, Maritime Executive and dated BoatNerd examples. A genuine lead includes preliminary/intended layup reporting and is **not** equivalent to a confirmed berth.

| Counts on this hand-selected retrospective set | Simple exact winter-layup headline rule | Python shadow v2 |
|---|---:|---:|
| Relevant articles suggested for review (of 7) | 1 | 5 |
| Relevant articles missed (of 7) | 6 | 2 |
| Irrelevant examples correctly ignored (of 8) | 8 | 8 |
| Irrelevant examples incorrectly flagged (of 8) | 0 | 0 |

The **two missed cases stay documented**. They have generalized headlines that do not identify the vessel or explicitly describe a winter berth. We cannot infer the true positive rate of the full scanner from these examples; they were deliberately chosen. There is no randomly sampled prospective winter dataset, no out-of-time performance validation and no calibrated precision/recall. The script returns `EXPLORATORY_NOT_CALIBRATED`, raw case counts and comparison to a naive baseline, **not** population accuracy percentages or a confidence badge. The fixture's `decision: not_layup` is deliberately hypothetical to evaluate "what if Node skipped this headline"; it is not a reconstruction of Node's actual 2025–26 decisions.

## Implemented architecture

Option A (keep existing JS rules only) was rejected because it cannot distinguish source reachability from evidence quality and has no independent evaluation. Option B (bounded Python shadow report + tiny curated source corpus + Node feed health metadata) was chosen: no runtime cost for visitors, no page rendering dependency and the same production safeguard. Option C (continuous Python service/LLM summarization) was rejected for cost, licensing, hallucination and source-corroboration risks.

The updated shadow report now adds `sourceFreshness` (feed ID, last observed publication, age in days, empty/undated state), `duplicateArticleRows`, `uniqueSourceURLs`, `outOfSeasonObservations` and bounded `evaluationSample`. Version 1 contract remains backward-compatible with the earlier per-case report. Empty/dated/blocked counts are non-forecast descriptive measurements, **not** assertion of ship activity. The existing source-watch runs Python audit and retrospective check and retains both outputs privately for seven days. The branch release gate also runs the checks.

## Reproducible gates and rollback

- `python3 -m unittest discover -s scripts/freighter-layup -p 'test_*.py' -v`
- `python3 scripts/freighter-layup/evaluate.py --check`
- `node --test tests/freighter-layup-source-health.test.js tests/freighter-layup-feeds.test.js tests/freighter-layup-season.test.js`
- `python3 scripts/freighter-layup/history.py --check`
- `npm run verify:all` (full-history clone); release browser CI, 360/390/768/desktop; and post-production public checks.

Fail cases: 403/total source failure, valid 200 but empty XML, 200 HTML WAF page, bad publication date, out-of-season ship traffic, duplicate RSS URLs, ambiguous museum arrival, wrong-year negatives and contradictory harbor reports. All events remain nonpublishing until approved by Node's existing source rules. Rollback: revert this PR; it only adds read-only evidence instrumentation and adjusts one official feed/catalog link.

**Next scientific benchmark:** 40+ representative, independently source-verified current-season article dispositions, including at least ten genuinely actionable and ten nonactionable cases, sampled prospectively from feeds and shadow misses. Only then consider out-of-time evaluation and any statement about detection precision/recall. No visitor participation or self-reported ship positions required. Track season-to-season source coverage and GSC 28-day windows separately; no organic traffic uplift is claimed.
