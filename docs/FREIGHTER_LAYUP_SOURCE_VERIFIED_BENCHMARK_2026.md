# Winter layup source-review benchmark III: 41 original-publisher cases

Date: 2026-11-05  
Owner: `izworskic/chrisizworski-com`  
Public page: `https://chrisizworski.com/great-lakes-freighter-winter-layup/`

## Scientific question

**Can a nonpublishing Python evidence scanner find articles worth further investigation for a documented Great Lakes vessel winter layup, while ignoring ordinary shipping, cargo visits, seasonal scenery, and unproven repairs?**

This is **article triage**, not identification of a ship's confirmed berth, not fleet occupancy, and not a calibrated forecast. The existing Node evidence and source-class publication safeguards remain untouched. No AIS inference, external Python runtime, redis, Supabase, new provider request, media republication, or visitor-submitted observations.

## Ground-truth construction, independent of the classifier's outputs

The frozen corpus at `data/freighter-layup-source-checked-evaluation-2026.json` has 41 actual publisher reports from four source identities, all with an original publisher link, a dated publication, a review disposition, source/evidence class, and rationale code. Labels were determined by reading original publisher article text/archives **rather than from the shadow model's predictions**.

| Publisher source | Selection and verification | Rows |
|---|---|---:|
| [Duluth Harbor Cam January 2024](https://www.duluthharborcam.com/2024/01/) | All 20 dated January feed entries reviewed against the original publisher's full month archive. Some individual permalinks intermittently block automation; the publisher's readable archive is the primary source of the text. | 20 |
| [BoatNerd November 2026](https://www.boatnerd.com/) | All 14 November 1–5 original posts from its first-party WordPress feed/API, verified as original publisher HTTP 200 pages with original article text. | 14 |
| [Wisconsin Marine Historical Society](https://wmhs.org/) | Six targeted, individually read first-party reports: Mesabi Miner, Joseph L. Block, Frontenac, James R. Barker, Edgar B. Speer and Stewart J. Cort. Direct programmatic access sometimes returns 406, so first-party article page text was checked through web-page retrieval, not treated as a successful feed fetch. | 6 |
| [Community Waterfront Heritage Centre](https://waterfrontheritage.ca/the-algoma-compass-arrives-for-winter-layup/) | Original published article about Algoma Compass at Owen Sound. | 1 |
| **Total** | Source-dated, original-article review | **41** |

The source-backed label is **worth additional editorial examination** of a particular winter-season ship event. A positive label is **not** a confirmed winter berth. The two shipyard-arrival cases with contextual winter language are review-worthy but are not auto-approved as layup events.

Source checks were performed November 5, 2026. Third-party article bodies, photos and videos are **not** stored or republished; the fixture stores titles, original links, publication dates, source types, concise rationale codes and review methods.

**Important independence limitation:** these original publisher texts are evidence independent of the Python classifier, but the editorial labels were constructed through assistant-led review. There was **no separately blinded second human adjudicator**, and source selection was purposive rather than random. The correct term is **source-checked retrospective benchmark**, not independently human-certified ground truth.

## Measured result on frozen sample

| Audited season | Review-worthy source reports | Nonlayup reports | Python shadow found | Python shadow missed | Incorrect flags |
|---|---:|---:|---:|---:|---:|
| Winter 2023–24 | 7 | 13 | 0 | 7 | 0 |
| Winter 2024–25 | 3 | 0 | 1 | 2 | 0 |
| Winter 2025–26 | 4 | 0 | 4 | 0 | 0 |
| Early winter 2026–27 (Nov 1–5) | 0 | 14 | 0 | 0 | 0 |
| **Total** | **14** | **27** | **5** | **9** | **0** |

The simple headline rule flags only one of the 14 review-worthy articles and ignores all 27 nonlayup cases. The Python shadow improves the **raw selected-case** discovery count from 1 to 5, but nine genuine publisher leads are still missed. Seven misses are Duluth Harbor Cam headlines where the winter-berth evidence appears **in the publisher's article body, not in the title**. Two more are real winter shipyard stories about vessels not yet in the curated alias registry: Frontenac and Joseph L. Block.

These patterns reveal two future investment directions: bounded source-excerpt triage and a separately verified vessel identity catalog. **Do not adjust the scanner based on the frozen benchmark and then evaluate on these same cases.** A new source/season holdout is required before claiming any improvement.

The current-season November 2026 subset contains **14 real negative controls but no positive ship-layup reports**. It can catch false alarms; it cannot establish detection sensitivity/recall, which requires verified positives from subsequent winter reporting. Do not call zero reports a harbor-occupancy measurement.

## Validity limits

- The sampling windows were fixed by available publisher archives, not randomly drawn from the full Great Lakes reporting universe; positive/negative prevalence is not representative.
- The ship alias catalog already includes later historical winters. Back-testing 2023–24 cases against this current catalog is **not** a clean out-of-time or historical production replay.
- Original articles and historical archives may be edited later; dates are publication dates, never inferred ship arrival times.
- The single positive-class criterion is review-worthy winter stay reporting, not truth of berth or exact vessel position.
- Independent human re-adjudication, inter-rater agreement, source licensing for full-text ingestion and a truly prospective 2026–27 positive sample are still missing.
- Therefore do **not** publish population precision, recall, specificity, confidence calibration, forecast performance, or audience growth as a consequence of this benchmark.

## Implementation and acceptance gates

The fixture is source-only research data outside the public `public/` tree. Updated `evaluate.py` validates unique links, HTTPS publisher hosts, real winter publication dates, original-source verification methods, label/rationale consistency, and reviewed-date bounds. Failure is loud and does not generate a partially trusted public result.

The CI script:

```bash
python3 scripts/freighter-layup/evaluate.py \
  --cases data/freighter-layup-source-checked-evaluation-2026.json \
  --check --require-large-sample \
  --output /tmp/freighter-layup-large-source-check.json
```

It requires at least 40 source-checked records, at least 10 positive and 10 negative cases, multiple source identities and seasons, and at least 10 current-winter negatives. It does **not** pretend a current-winter positive sample exists. The result explicitly includes `retrospectiveSampleSizeThresholdMet: true`, `prospectiveCurrentSeasonCalibrationCompleted: false` and `publicationEnabled: false`.

The existing four-times-daily winter source-watch records the larger evaluation alongside the earlier 15-case baseline and the actual source-status shadow output, as private short-lived CI artifacts. The PR release gate checks reproducibility and browser behavior. No new public URL, sitemap entry, ad-policy change, HTML modification, or map/ledger change is warranted for this research-only milestone.

Rollback: revert the benchmark PR. Existing 20-source Node maritime scanner and winter publication rules do not depend on the evaluation artifact.

## Next independently measurable threshold

Once genuine 2026–27 winter events have occurred, collect a systematic sample of publisher posts *not used for tuning*, including at least ten source-backed positive review leads and ten source-backed nonleads; add a blinded independent second review (with disagreements resolved by documented original evidence), then run an out-of-time frozen evaluation. Current sources may be monitored automatically; no visitor contribution or ship-position self-report is required.

This milestone **meets the larger retrospective source-checked sample-size threshold**. It does **not** meet prospective calibration or independent second-adjudicator thresholds.
