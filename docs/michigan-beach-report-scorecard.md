# Michigan Beach Report scorecard

The launch gate is **90/100** and the stretch target is **95/100**. The legacy regional guide is benchmarked at **42/100**: it had a useful beach inventory and map, but it did not answer “should we go today?” with official notice checks, hazard overrides, transparent rankings, robust failure states, or indexable beach detail pages.

Run the deterministic implementation benchmark with:

```sh
npm run benchmark:beaches
```

## Weighted launch standard

| Category | Weight | Launch standard |
|---|---:|---|
| Decision usefulness | 25 | Four live input classes, 50+ places, practical exploration, and a daily shortlist |
| Truth and safety | 20 | Official notices override the score; no false all-clear; provenance and freshness are visible |
| Data reliability | 15 | Bounded parallel fetching, six-hour observation guard, and graceful per-source failure |
| UX and accessibility | 15 | Responsive keyboard-ready interface with loading, empty, error, no-JS, and location-denial states |
| Search and answer readiness | 15 | Structured primary pages, 50 canonical detail pages, sitemap, and strong internal discovery |
| Seasonal engagement | 10 | Automatic season switch, intent events, and an adoption measurement plan |
| **Total** | **100** | **90 launch / 95 stretch** |

## Product outcome targets

These are directional targets to evaluate after launch, not promises and not part of the deterministic code score.

| Outcome | Event or source | Initial target | Review window |
|---|---|---:|---|
| Search-to-detail engagement | `Beach Detail Open` ÷ report visitors who search/filter | ≥35% | First 30 in-season days |
| Location utility adoption | `Beach Near Me` ÷ report visitors | ≥12% | First 30 in-season days |
| Daily-pick engagement | `Daily Pick Open` ÷ daily-ranking visitors | ≥25% | First 30 in-season days |
| Seasonal return rate | Returning report visitors | ≥20% | 60 in-season days |
| Detail-page discovery | Beach detail pages indexed | ≥90% | 30–45 days after launch |
| Truth failures | False “all-clear” or stale-as-live claims found in audits | **0** | Continuous |
| Official-notice precedence | Matched closure/advisory appearing in daily picks | **0** | Continuous |

## Go/no-go rules

- Do not launch below 90/100.
- A closure, advisory, or matching hazard must outrank the numerical score every time.
- “No active alert found” must never be described as a recent test or a guarantee of water quality.
- A buoy observation older than six hours must not earn water-temperature or wave points.
- If BeachGuard is unavailable, the interface must say so and keep the official link visible.
- Review the official BeachGuard integration and a sample of matched names at the start of every season.

The benchmark definition lives in `benchmarks/michigan-beach-report.json`; the executable checks live in `scripts/benchmark-beach-report.mjs`.
