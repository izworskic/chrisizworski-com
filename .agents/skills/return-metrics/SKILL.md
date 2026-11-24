---
name: return-metrics
description: "Measure returning visitors per chrisizworski.com tool from GA4, before and after a retention change, using the repository's existing read-only GA4 path. Use when a return contract needs a baseline, when an alert, saved-spot or calendar feature ships and needs a result, or when asked whether visitors come back."
---

# Return metrics: measure before and after, never guess

Every retention feature needs a baseline and a result. This repository already has a measurement-gap rule: unmeasured numbers are null and labeled, never estimated. This skill applies that rule to returning visitors.

## The data path that already exists

- GA4 measurement ID `G-Y5D2V2W7HN` is injected on hub pages by `scripts/inject-ga4.mjs`.
- `lib/growth/auto-ingest.mjs` already calls the GA4 Data API `runReport` with a read-only service account (`GROWTH_GA4_PROPERTY_ID` and the service account variables it reads), and its page records carry `returningUsers: null`. Extend that function; do not add a second GA4 client.
- For ad hoc questions an agent may use the official [google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) server (Apache-2.0) with the `analytics.readonly` scope only. Never pass `--allow-write`.
- Credentials are the owner's. Ask once; if none are available, report every number as NOT MEASURED and stop. Never put a key in the repository, a PR or chat.
- Vercel Web Analytics has no public API for this (checked August 2026); do not rely on it.

## The report

`runReport` for the tool's paths, by `newVsReturning` and `landingPagePlusQueryString` (or `pagePath`), with `activeUsers`, `sessions`, `engagedSessions` and `screenPageViews`:

- **Returning share:** returning active users divided by all active users, per tool, per 28 days.
- **Trigger-day returns:** the same, limited to days when the tool's alert condition fired.
- **Channel returns:** sessions by `sessionSource` equal to `ntfy`, `calendar` or `rss`, from the `utm_source` tags `condition-alerts` adds.

Write results to `benchmarks/return-baseline.json`: property, query, date range, timestamp, values. Any field not measured stays `null` with a `measurementGap` note, matching `growth-100x-baseline.json`.

## Reading it honestly

- Minimum sample: 200 active users in the window before stating a rate; under that, report the counts only.
- Compare like with like. These tools are seasonal: compare the same weeks year over year, or trigger days against non-trigger days in the same season. Never compare across a season change.
- GA4 undercounts returning visitors: Safari limits script-set cookies to 7 days, and consent or blockers remove some visitors. Say so beside the number, and judge changes by direction and size, not decimals.
- One change at a time per tool, with the ship date recorded in `docs/changelog.md`, so a movement can be attributed.

## Output

A short table per tool: window, active users, returning share, trigger-day share, channel sessions, and NOT MEASURED where applicable, plus the one-line verdict the return contract's success test asked for. Changes to code follow the owning repository's gates; Experience OS and Auto ads are unaffected by measurement. Do not auto-merge.
