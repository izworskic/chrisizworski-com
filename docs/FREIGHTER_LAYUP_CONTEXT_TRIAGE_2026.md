# Winter layup scientific investment IV: bounded publisher-feed context triage

Date: 2026-11-06  
Scope: Research-only Python shadow auditor for Great Lakes winter layup.  
Production ledger, ship identity registry, website, vessel positions, map, metadata, ads, and source admission rules are unchanged.

## Research problem and intervention

The source-checked retrospective benchmark (41 selected first-party reports) found 14 source-based review leads, of which the **old headline-only shadow detector selected 5 and missed 9**. Seven missed leads documented a winter berth in article bodies, not headlines; two involved ships not in the curated alias catalog. The benchmark itself clearly prohibits retuning against those same cases and claiming improved performance on them.

This change introduces a **research-only, optional input** `sourceExcerpt` to the current observation schema. The existing Node scanner already fetches Blogger content/RSS description to classify the feed. From that **already-retrieved** text, it selects at most 720 plain-text characters, centered near the first winter-stay cue when present. There is **no new HTTP request or article scraper**. The transient Node-to-Python JSON remains only on the ephemeral workflow runner; the Python output reports evidence flags, known vessel keys and tentative names, not original excerpts. Existing full-article content is not copied into the repository, GitHub artifact, or visitor page.

Python can flag a previously ignored observation for review when an explicit winter-stay excerpt is paired with a relevant arrival/stay phrase and one of:

1. A ship already in the curated alias registry, appearing in the title **or** excerpt.
2. A tightly formatted, named-arrival title suggesting a *tentative* unregistered vessel.

It suppresses unqualified seasonal weather, absent winter evidence, negated winter status, planned-only arrival headlines, retrospective headlines, out-of-season or future-dated reports, malformed excerpts and generic vessel names. The unknown name is a review hint, **never an added registry identity**.

## Scientific and public safety controls

- Research-only: `publicationEnabled: false`, `publishEligible: false`; Python never changes the authoritative Node ledger, registry, vessel statuses, harbor map, or vessel location.
- Dated source metadata and original publisher links are still required. A feed description is not equivalent to independently reading the publisher's original article.
- A winter-stay cue is not proof of layup. The source text may be edited, generic, incomplete or wrong; editorial verification is still mandatory.
- No downstream input to automatic source corroboration or official-berth admission.
- The 41-case benchmark and older 15-case source-checked comparison remain **frozen and title-only**. Their historical 5/14 and 5/7 results must not be presented as post-intervention field performance.
- Synthetic tests exercise false-positive controls, title-only legacy behavior, unknown-vessel caution and no-excerpt-publication, but **synthetic tests are not independent observational performance evidence**.
- The new optional schema field preserves compatibility with existing direct API/tests. Missing and malformed excerpts fail without a review upgrade.

## Pre-registered out-of-time evaluation threshold

After this change, collect dated original-publisher articles systematically rather than choosing examples because they match the new rules. Freeze a candidate frame drawn across every reachable original-source feed, including **all** posts in defined weekly source windows (not just model-flagged posts); document unavailable feeds, duplicate URLs and the article publication date. Retain full article text only at the original publisher, with source links, article date, compact rationale code and SHA-256 excerpt digest in the private non-public evaluation record if needed.

Before looking at classifier results, have a second independent reader adjudicate whether the original article is *worth investigating* for a dated winter layup event, recording disagreements and resolution. Prevent the second reviewer seeing the classifier or prior editorial label where feasible. Evaluate both headline-only and context-aware versions **on the same frozen out-of-time set**. Aim for at least 10 independently reviewed positives and 10 independently reviewed nonleads from new post-change reports, across at least two publishers. Report the explicit numerator/denominator of correctly surfaced leads, missed leads, unnecessary leads and unreviewable/unavailable sources, along with date and source coverage. Report no population precision, calibrated recall or real-world uplift if the convenience sample or blinding constraints remain unmet.

**As of November 6, 2026:** this independent holdout and current-winter positive evidence threshold have not been met. Do not claim empirical model improvement. The deliverable here is safer evidence capture, more complete research-only capability, and a testable prospective scientific protocol.

## How to validate

```bash
node --test tests/freighter-layup-feeds.test.js
python3 -m unittest discover -s scripts/freighter-layup -p 'test_*.py' -v
python3 scripts/freighter-layup/evaluate.py --check
python3 scripts/freighter-layup/evaluate.py --cases data/freighter-layup-source-checked-evaluation-2026.json --check --require-large-sample
npm run verify:all
```

Normal branch CI must pass before merge. Source watch automatically includes the new unittest in its existing private research gate. Rollback: revert this branch; no visitor data migration or runtime service is involved.
