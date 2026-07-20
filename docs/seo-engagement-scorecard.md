# SEO and engagement scorecard

Baseline date: July 20, 2026 (America/Detroit)

The goal is a **10x improvement**, not a guarantee. The primary outcome is 28-day organic Google clicks to the measured tool cluster. Engagement is measured separately so a traffic increase is not mistaken for useful visitor activity.

## What counts as success

| Area | Metric | Formula | Target |
| --- | --- | --- | --- |
| SERP | Organic clicks | post-release 28-day clicks / baseline 28-day clicks | 2x by day 30, 5x by day 60, 10x stretch by day 90-180 |
| Discovery | Search impressions | post-release impressions / baseline impressions | 2x by day 30 |
| SERP clicks | CTR | Google clicks / Google impressions | 25% relative lift by day 30 |
| Engagement | Tool destination visits | scoped destination pageviews / Tools and Great Lakes hub pageviews | 2x by day 30; 10x stretch by day 90-180 |
| Direct clicks | Tool Open events | Vercel `Tool Open` event count by tool and placement | Directional; available only if the Vercel plan records custom events |
| Performance | Core Web Vitals, p75 | Vercel Speed Insights | LCP < 2.5s, INP < 200ms, CLS < 0.1 |

The pages in scope are `/`, `/tools/`, `/great-lakes/`, `/soo-locks/`, `/northern-lights-michigan/`, `/great-lakes-buoys/`, `/great-lakes-gazette/`, `/great-lakes-freighter-tracking/`, and `/great-lakes-beaches/`.

## Baseline discipline

- Google metrics are intentionally `null` until a real Search Console export is supplied. A missing measurement is never treated as zero.
- Use the 28 days ending July 19, 2026 as the pre-release baseline, split by **Pages** and **Queries**.
- Compare 28-day windows to smooth weekday, weather, and Great Lakes seasonality effects.
- Report brand queries containing `Chris Izworski` separately from non-brand tool queries. Both matter, but they answer different questions.
- Destination pageviews are the Hobby-plan fallback for engagement. Custom click events are instrumented, but Vercel may require a paid plan to retain them.

## Release checkpoints

### Day 0-2: safety

- Every existing canonical remains unchanged.
- Key pages return HTTP 200; `www` keeps redirecting to the canonical host.
- Preview deployments remain `noindex, nofollow, noarchive`.
- JSON-LD parses, internal links resolve, mobile controls remain usable, and no live API integration regresses.

### Day 7: leading signals

- Confirm Web Analytics pageviews and Speed Insights data are arriving.
- Check that `/tools/` and `/great-lakes/` send visitors to the featured destinations.
- Inspect Search Console indexing and enhancement reports; do not judge ranking success yet.

### Day 30

- Export Search Console Pages and Queries for the post-release 28-day window.
- Compare clicks, impressions, CTR, and average position with the baseline.
- Keep winners prominent. Rewrite weak card copy only when it has impressions but poor CTR.

### Day 60 and day 90-180

- Expand clusters that show impressions and useful visits.
- Build the next tool only from demonstrated query demand or repeat visitor behavior.
- A 10x result is achieved only when the primary organic-click multiplier reaches 10. Engagement and Core Web Vitals must also avoid regression.

## Stop-loss guardrails

Pause further SEO changes and investigate if organic clicks fall more than 20% across two comparable weekly windows, indexed scoped pages fall more than 10%, a canonical changes unexpectedly, or p75 Core Web Vitals move outside the good thresholds. Do not remove or redirect an established tool URL merely because a short measurement window is weak.

Run `npm run benchmark:seo` to print the reproducible structural before/after comparison. Search Console values are added only after a genuine export is available.
