# NYC crossing real-source scientific threshold — November 7, 2026

## Objective
Run real official NYC DOT observations through Python Intelligence OS rather than synthetic test fixtures; report every link's source integrity and independent held-out model quality before allowing a historical travel comparison into the visitor tool.

## Discovery: dataset heartbeat is not valid travel-time evidence
Dataset: https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds/i4gi-tjb9
Official endpoint: https://data.cityofnewyork.us/resource/i4gi-tjb9.json

The public catalog displayed **Data Last Updated: October 28, 2026**, but direct group-by API queries on November 7 showed that **all six link IDs continued to issue records**, with latest `data_as_of` near 2026-11-07 12:12–12:13 (floating NYC timestamps). The catalog display must not be used as an authoritative operational freshness test.

When constrained to `status='0'` and `0 < travel_time::number < 3600`, the independent 2026-08-01 onward query showed:

| Audited link | Crossing | Last valid positive travel time as of Nov. 7 | Interpretation |
| --- | --- | --- | --- |
| 4456510 | Queens–Midtown Tunnel | 2026-11-01 01:28:00 | Outdated |
| 4456501 | Hugh L. Carey Tunnel | 2026-11-01 01:53:02 | Outdated |
| 4616339 | Brooklyn Bridge approach | 2026-11-07 12:12:13 | Recent valid observations |
| 4616340 | Manhattan Bridge approach | 2026-11-07 12:12:13 | Recent valid observations |
| 4456452 | RFK Manhattan approach | No matching valid observation since 2026-08-01 | Insufficient usable evidence |
| 4763652 | Verrazzano eastbound link | No matching valid observation since 2026-08-01 | Insufficient usable evidence |

This is NOT evidence of physical bridge/tunnel closure or a confirmed device outage: the NYC DOT data's `status` field is not a documented operational closure code. Multiple recent `status=-101` records have unusable/zero travel times, so the only warranted statement is that this archival measurement is not currently usable.

## Reproducible official queries
Query 1, raw heartbeat: `$select=link_id,max(data_as_of) as latest,count(*) as recent_records&$where=link_id in('4456510','4456501','4616339','4616340','4456452','4763652') and data_as_of between '2026-10-20T00:00:00.000' and '2026-11-09T00:00:00.000'&$group=link_id`.

Query 2, independently usable observation: same six link IDs, `data_as_of >= '2026-08-01T00:00:00.000'`, `status='0'`, `travel_time::number>0`, `travel_time::number<3600`, grouped by link with `max(data_as_of)`.

Both queries were retrieved from the official live Socrata API November 7. Metadata is not interpreted as a source substitute. The absence of valid readings within this query window does not prove no other source exists.

## Model science, deliberately held out
The 70 calendar days of training data and 14 most recent held-out calendar days remain separate. Evaluate each NYC DOT link's *daily-hourly mean*, not individual five-minute polls treated as independent days. Compare weekday/weekend hourly median and empirical 10–90 percentile range against a same-link all-hour median. Gate on >=100 scored held-out date-hours, >=30 qualified hour slots, >=5% MAE reduction, >=55% holdout interval coverage, 72-hour source freshness, and exact link/segment scope. Never infer a fastest door-to-door crossing from unlike segments.

**Real Python evaluation completed successfully on November 7, 2026.** Exact GitHub Actions run: https://github.com/izworskic/chrisizworski-com/actions/runs/42407765008

| Link | Valid date-hours | Independent holdout result | Gate |
| --- | ---: | --- | --- |
| Brooklyn approach 4616339 | 2,104 | 275 scored held-out date-hours; 3.241 min MAE vs 3.277 min naive, +1.09% improvement, 58.18% range coverage | **FAIL** — less than 5% gain |
| Manhattan approach 4616340 | 897 | 206 independently scored hours but only 22 eligible hour slots | **FAIL** — at least 30 slots required; error statistic withheld |
| Queens–Midtown 4456510 | 1,563 | 95 scored holdout hours; 20 qualifying slots; last usable November 1 | **FAIL** — stale and insufficient coverage |
| Hugh Carey 4456501 | 1,378 | 88 scored holdout hours; 18 qualifying slots; last usable November 1 | **FAIL** — stale and insufficient coverage |
| RFK 4456452 | 0 | No usable positive travel-time rows in the 93-day ingestion window | **FAIL** — no evidence |
| Verrazzano 4763652 | 0 | No usable positive travel-time rows in the 93-day ingestion window | **FAIL** — no evidence |

Total usable date-hours: **5,942**. Rejected aggregated date-hours: **465**. `modelReadyLinks=[]`; `publishingCandidateState=UNAVAILABLE`. There is **no publishable real-data model** under the current source and documented threshold. The fact that the source endpoint returns newer timestamps must never override these results.

**Ingestion integrity repair made during this audit:** the first real-data run returned exactly 1,000 grouped Manhattan records and did not include the newest valid date. The Python ingest now queries **non-overlapping, at-most-30-day calendar partitions**. Each query can contain at most 720 distinct date-hour buckets; the explicit server limit is 800. The parser checks completeness bounds, exact link ID, date window, unique date/hour groups and rejects suspicious batches. On rerun it recovered the missing current-day rows and produced 1,016 grouped Manhattan source records. This is evidence of a retrieval-completeness risk, not proof of its provider-side cause. Deterministic tests reproduce and reject the partial-response condition.

## Implemented investment
- `scripts/nyc_departure_intelligence.py audit-live --report /tmp/nyc-source.json`: queries six exact official links and a seven-day raw-status heartbeat; normalizes, evaluates genuine out-of-time holdout skill even if it **fails**, and reports per-link `MODEL_ELIGIBLE`, `STALE_LINK`, `BACKTEST_FAILED`, or `NO_USABLE_HISTORY`.
- Uses `America/New_York` calendar dates at UTC rollover, rather than assuming the runtime's UTC date equals the local traffic-date partition.
- New PR-only source-audit job stores dated actual-source evidence for review. Existing daily workflow retains its audit artifact even when Python cannot publish a validated model.
- The existing Node/HTML toll and live traffic tool continues uninterrupted. **No fabricated timing recommendation, no new persistent service, no Redis/Supabase.**

## Scientific acceptance
This milestone is **not** accepted as a forecast until an independently verified model meets all gates on actual observations. New tests cover false freshness from continued invalid records, latest valid source-day versus raw heartbeat, timezone midnight, out-of-time skill failure and synthetic-only isolation. Continue to prefer `UNAVAILABLE` over plausible-looking but unsupported historic departure advice.

## Rollback and measurement
Remove this specific scientific audit workflow/command without changing the established live toll API. Monitor source last-usable day, valid hourly coverage, sample quality, source lag and out-of-time skill. GSC/CTR changes remain unmeasured; source scientific truth must not be confused with organic search growth.

**Next scientific threshold:** obtain two or more weeks of independently validated, fresh segment observations and demonstrate materially superior holdout accuracy, or research an officially licensed alternative archive with adequate local coverage. Do not lower gates merely to fill the UX.
