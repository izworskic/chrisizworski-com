---
name: freshness-watch
description: "Keep live tools honest after release: declare each tool's data age contract, register its feed with portfolio-sentinel, probe data instead of page bytes, and alert only once false positives are gone. Use when shipping or changing a tool that depends on a live feed, cron, scheduled workflow or scheduled commit, or when a page loads fine but its data may have stopped updating."
---

# Freshness watch: catch the tool that looks fine and is dead

A tool can return 200, pass every gate and show week-old data. AGENTS.md 6d records `/connect/` sitting 14 days stale with every gate green. On 2026-08-02 NOAA removed `/products/solar-wind/` and two northern lights cards went dead behind a healthy page.

The network already has a watchdog: `izworskic/portfolio-sentinel`, a daily GitHub Actions sweep with state in Supabase, a dashboard on GitHub Pages, and an outbound feed registry in `feeds.js`. This skill makes every live tool visible to it. It does not add a second monitor.

## 1. Declare the freshness contract at release

Put this table in the PR body of any tool that shows live or scheduled data:

| Field | Example |
| --- | --- |
| Feed or own API route | `/api/buoys` |
| Field holding the newest timestamp | `observations[].time` |
| Real publish cadence | hourly |
| Max age before stale | 6 hours, never below the cadence |
| What the visitor sees when stale | last good value labeled with its age |
| What writes the data | workflow file, cron or client fetch |

A tool whose data carries no timestamp is NOT MONITORED for freshness. Say so; never call it monitored.

## 2. Register it with the sentinel

Add an entry to `feeds.js` in `izworskic/portfolio-sentinel` through that repository's own reviewed PR; this repository grants no cross-repo authority. Fields: `id`, `url`, `owners`, `kind` (`json`, `text` or `binary`), `minBytes`, optional `must`, and `maxAgeH`.

When the upstream needs an API key, register the tool's own API route instead. A healthy internal route is the only probe-able proof that a keyed upstream still works.

## 3. Probe data, not page bytes

- Client-rendered tools: never judge staleness by an HTML hash. Their HTML legitimately never changes. Probe the data route.
- Generated pages such as daily editions: check that the newest item has a real body. Empty stub posts change the hash every day and hide an outage.
- Severity: non-200, under `minBytes`, parse failure or missing `must` is critical. Data older than `maxAgeH` is a warning. A 429 that survives one retry is a warning, not an outage.

## 4. Alerting comes after false positives

A monitor that fires false criticals every day trains everyone to ignore it, which is how a real outage stays invisible. Propose alerting only when the latest sweep has no known false criticals. Then use one GitHub issue per failing property in the sentinel repository, updated each sweep and closed on recovery. No new email, SMS or paid alerting service.

## 5. Scheduled workflow hygiene

Every 90 days, or when asked: list the scheduled workflows in `.github/workflows` with each one's newest successful run.

```
gh api "repos/izworskic/chrisizworski-com/actions/workflows?per_page=100" --paginate -q '.workflows[] | [.id, .name, .state] | @tsv'
gh api "repos/izworskic/chrisizworski-com/actions/workflows/ID/runs?status=success&per_page=1" -q '.workflow_runs[0].updated_at'
```

A schedule with no success in 30 days is fixed or retired in its own PR. GitHub disables scheduled workflows after 60 days without repository activity, so a quiet repository can stop silently.

## Output

The freshness contract table, the sentinel entry (or the PR that adds it), and anything unchecked marked NOT VERIFIED.

## Boundaries

Complements data-contract-validation (freshness at ingestion and source contracts) and condition-alerts (visitor-facing calendars and feeds). Adds no Vercel function, cron, route or paid service here: the sentinel runs on GitHub Actions and existing Supabase. Do not auto-merge.

## Sources

Upptime (upptime/upptime, MIT) was considered and not adopted: it checks up or down, which the sentinel already does across its properties. Reference only.
