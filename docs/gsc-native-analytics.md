# Native Google Search Console analytics

This subsystem replaces the paid GSC Wizard dependency for first-party Search Console performance analysis.

## What it does

- Reads `sc-domain:chrisizworski.com` through the Google Search Console Search Analytics API.
- Uses finalized data with a two-day lag by default.
- Compares current 28 days, previous 28 days, same period one year ago, current 7 days, and previous 7 days.
- Retrieves page and query rows with Search Console pagination.
- Classifies pages as `BREAKOUT`, `EMERGING`, `STABLE`, `DECAYING`, `SEASONAL`, or `NEW_UNPROVEN`.
- Builds site-specific CTR benchmarks by ranking bucket and estimates recoverable clicks.
- Aggregates pages into tool families.
- Stores full reports privately in the existing Upstash Redis instance for 400 days.
- Emits a compact `gsc_analytics_summary` object to Vercel runtime logs so portfolio analysis can be inspected without publishing raw query data.

## Security

Raw Search Console data is never written to the public repository or a public endpoint. `/api/gsc-analytics?view=report` and `view=collect` require the existing `CRON_SECRET` bearer token. The health view exposes only readiness booleans.

The Google credential must be stored as a Vercel secret, never committed.

## One-time Google setup

1. Enable the Google Search Console API in a Google Cloud project.
2. Create a service account and a JSON key.
3. In Google Search Console, add the service-account email as a user on `sc-domain:chrisizworski.com` with read access.
4. Add the JSON key to Vercel as a sensitive environment variable named `GSC_SERVICE_ACCOUNT_JSON` for Production and Preview.

Alternatively set both `GSC_CLIENT_EMAIL` and `GSC_PRIVATE_KEY` as sensitive environment variables.

## Existing Vercel configuration

The deployment uses:

- `GSC_SITE_URL=sc-domain:chrisizworski.com`
- `GSC_FINAL_LAG_DAYS=2`
- `GSC_MAX_PAGE_ROWS=10000`
- `GSC_MAX_QUERY_ROWS=10000`
- existing `UPSTASH_REDIS_REST_URL`
- existing `UPSTASH_REDIS_REST_TOKEN`
- existing `CRON_SECRET`

## Endpoints

- `GET /api/gsc-analytics?view=health` — readiness only.
- `GET /api/gsc-analytics?view=collect` — protected collection run.
- `GET /api/gsc-analytics?view=report` — protected latest full report.

## Local/manual run

```bash
node scripts/gsc-report.mjs
```

Use `--no-persist` to calculate without writing to Redis.

## Tests

```bash
node --test tests/gsc-analytics.test.js
```

The repository-wide `npm test` command also includes this test automatically because it runs `tests/*.test.js`.

## Scheduling

The collector is safe to run once daily. The root `vercel.json` already owns production cron configuration. Add `/api/gsc-analytics?view=collect` to that cron list only through a full-file verified edit; do not replace or truncate the existing routing configuration. Until that source-controlled cron line is added, the endpoint can be invoked manually with the existing `CRON_SECRET`.
