# ChrisIzworski.com 100x growth scorecard

Baseline created: August 3, 2026 (America/Detroit)

This scorecard turns the supplied Google Search Console export into a reproducible operating benchmark. The north star is a goal, not a forecast or guarantee.

## Verified baseline

The comparable baseline is the 28 days ending August 1, 2026:

| Metric | Current 28 days | Previous 28 days | Change |
| --- | ---: | ---: | ---: |
| Impressions | 21,335 | 16,758 | +27.3% |
| Clicks | 284 | 311 | -8.7% |
| CTR | 1.331% | 1.856% | -28.3% |
| Weighted average position | 11.94 | 11.44 | 0.50 positions weaker |
| Daily impressions | 761.96 | 598.50 | +27.3% |
| Daily clicks | 10.14 | 11.11 | -8.7% |

The supplied export does not contain a 12,000-impression day. Its verified maximum is 2,056. The literal 100x benchmark therefore uses the 761.96-impression daily run rate, not the unverified 12,000 figure.

## Milestones

| Milestone | Impressions/day | CTR | Google clicks/month | Commercial proof |
| --- | ---: | ---: | ---: | --- |
| Day 90 | 2,000 | 2.5% | 1,500 | First $500 sponsor pilot |
| Month 12 | 10,000 | 3.0% | 9,000 | Repeatable multi-stream revenue |
| Month 24 | 50,000 | 3.25% | 48,750 | Premium ads plus sponsor portfolio |
| 100x north star | 76,196 | 3.5% | 80,006 | $10,000+ modeled monthly net-contribution path |

Monthly clicks use a standardized 30-day month. Revenue is scenario modeling, not historical earnings.

## First experiment portfolio

| Page | Export impressions | CTR | Position | Experiment | Target CTR |
| --- | ---: | ---: | ---: | --- | ---: |
| Northern Lights Michigan | 18,461 | 1.85% | 10.36 | Useful non-JavaScript tonight answer and intent-led title | 2.5% |
| Soo Locks | 11,919 | 1.26% | 9.41 | Put today’s passage sources and schedule caveat above the map | 2.5% |
| Michigan tomatoes | 5,479 | 0.26% | 8.37 | Year-specific regional title and direct transplant answer | 2.0% |
| Michigan frost dates | 2,651 | 0.11% | 9.56 | City-and-calendar title and statewide date range | 2.0% |
| Saginaw Bay ecology | 1,671 | 0.54% | 11.13 | Depth title, H1, first answer, and FAQ alignment | 1.5% |

The page figures come from the Pages dimension in the supplied export, while the headline baseline comes from property totals. Search Console can aggregate those views differently, so they are not forced to reconcile.

## Decision rules

- Compare complete 28-day windows and use seven-day metrics only as leading indicators.
- Separate brand and non-brand queries.
- If impressions rise while clicks fall, repair title, description, first answer, and intent before adding more pages.
- Prefer an existing page at position 4–15 with at least 250 impressions and weak CTR.
- Do not run multiple snippet experiments on the same page in one measurement window.
- Pause new experiments after two comparable weekly click declines greater than 20%, an unexpected canonical/indexing change, or a material Core Web Vitals regression.
- Never republish named vessel schedules or commercial AIS data without an official, licensed, or expressly permitted source.

## Reproduce the release gate

Run:

```bash
npm run benchmark:growth
```

The machine-readable baseline is in `benchmarks/growth-100x-baseline.json`; the experiment log is in `benchmarks/growth-experiments.json`.

Source: [supplied Search Console workbook](https://docs.google.com/spreadsheets/d/10G1bscGWFzfURptcOAIkLrNtSRTOwuoKIKARZRYvIDU/edit).
