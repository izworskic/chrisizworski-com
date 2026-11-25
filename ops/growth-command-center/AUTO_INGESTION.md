# Revenue Command Center: automatic ingestion

**Release target:** private, server-side daily ingestion for ChrisIzworski.com. This is not a public website analytics feature. Data and credentials are never embedded in static HTML, sent to visitor browsers, indexed, or committed to Git.

## What runs automatically

- Existing native Google Search Console collector runs from the scheduled GitHub Actions workflow daily at 11:37 UTC. It stores its finalized 28-day / prior 28-day report in private tool state.
- The same protected workflow then **POSTs** to `/api/growth-command-center?view=collect` with a short-lived GitHub OIDC token scoped to the existing GSC workflow. It does not carry a permanent token in GitHub secrets. This endpoint reads the most recent finalized GSC report and separately collects any configured GA4 and AdSense sources.
- The collector stores one private, date-stamped snapshot plus a latest pointer using existing Postgres-backed `lib/tool-state.js`. It uses no Upstash Redis, third-party ETL provider, browser storage, or new database.
- The password-protected owner page at `https://chrisizworski.com/api/growth-dashboard` automatically reads that latest snapshot from the **same-origin** owner-only `GET /api/growth-command-center?view=report`. Refresh reloads the saved report; it does not create live Google API calls.
- Missing or denied GA4/AdSense credentials produce **unavailable** status, not sample/estimated earnings. No one can query those stored reports without the owner password.

## Configuration: production environment variables only

Use the **correct Vercel project** owning the GitHub repository `izworskic/chrisizworski-com`, not a similarly named legacy site. In Vercel Project Settings -> Environment Variables, add variables to **Production**. Do not paste values into ChatGPT, GitHub issues, commits, logs, screenshots or URLs.

| Variable | Purpose | Required for |
| --- | --- | --- |
| `TOOL_STATE_URL` | Existing private, OIDC-protected Postgres tool-state gateway | All report persistence |
| `GSC_SERVICE_ACCOUNT_JSON` or `GSC_CLIENT_EMAIL` + `GSC_PRIVATE_KEY` | Existing GSC service-account credentials (must be authorized on the Search Console domain property) | GSC and GA4 (with separate GA4 permission) |
| `GSC_SITE_URL=sc-domain:chrisizworski.com` | Existing property selection | GSC |
| `GROWTH_GA4_PROPERTY_ID` | Numeric GA4 **property** ID (verify against the site's GA4 measurement ID and property settings before entering; do not assume it from other connector accounts) | GA4 |
| `GROWTH_ADSENSE_ACCOUNT` | AdSense account resource ID, e.g. `accounts/pub-...` or `pub-...`; must correspond to the publisher account containing chrisizworski.com | AdSense |
| `GROWTH_ADSENSE_CLIENT_ID` | Google OAuth client ID, authorized to access AdSense Management API | AdSense |
| `GROWTH_ADSENSE_CLIENT_SECRET` | Google OAuth client secret | AdSense |
| `GROWTH_ADSENSE_REFRESH_TOKEN` | Offline user OAuth refresh token obtained with `https://www.googleapis.com/auth/adsense.readonly` consent | AdSense |
| `GROWTH_ADSENSE_PAGE_BREAKDOWN=off` | Optional: turn off PAGE_URL breakdown if Google returns an unsupported or high-volume report; sitewide earnings still load | Optional |
| `GROWTH_DASHBOARD_USER` | Owner username; defaults to `owner` | Dashboard |
| `GROWTH_DASHBOARD_PASSWORD` | A unique high-entropy password of at least 24 characters, stored only as a Vercel secret | Dashboard |
| `CRON_SECRET` | Existing collector fallback for internal operations. Never supply this to a browser. | Existing GSC and growth collector |
| `GROWTH_AGENT_TOKEN` | Separate random bearer token (at least 32 characters) for the read-only agent summary. Must differ from the dashboard password; unset, short or equal disables agent access | Agent summary |

### Google access

1. **GSC:** The existing GSC collection workflow and service account must already function. It uses Search Console API read access. Do not create a second GSC service account unnecessarily.
2. **GA4:** Enable **Google Analytics Data API** in the Google Cloud project. Grant the same service-account email **Viewer** access to the correct Google Analytics 4 property. Enter its numeric Property ID as `GROWTH_GA4_PROPERTY_ID`. The collector requests only `analytics.readonly`, filters precisely to `chrisizworski.com` and `www.chrisizworski.com`, and reads dated pagePath/screenPageViews/sessions. GA4 page sessions can overlap across pages.
3. **AdSense:** Enable **AdSense Management API v2** and authorize a Google user who owns the appropriate AdSense publisher account using the `adsense.readonly` scope. **AdSense does not accept service accounts**. Obtain a refresh token through the standard OAuth authorization-code/offline-consent flow for your own Google OAuth application; configure the client ID, client secret and refresh token in Vercel. Keep them out of the repository. In Google OAuth Testing mode, refresh-token lifetimes can be limited; ensure the app's consent/publishing status supports unattended scheduled use.
4. When both source credentials are present, trigger the existing GitHub Actions **Native GSC Analytics** workflow using `workflow_dispatch`, or allow its daily schedule to run. A successful workflow checks the GSC collection first and the owner growth collector second. Visit the protected owner page and verify each source shows **connected** and its as-of timestamp. An HTTP 200 for the collector can mean a configured source was unavailable; verify the per-source statuses.

## Agent read access (read-only)

Coding agents (Codex, Claude Code) read a compact decision summary of the stored snapshot without the dashboard password:

    GET https://chrisizworski.com/api/growth-command-center?view=agent
    Authorization: Bearer $GROWTH_AGENT_TOKEN

- **What it reads:** the latest stored snapshot only. It makes no Google API call. It is one more view on the existing `api/growth-command-center.js` function: no new function, route, rewrite, cron, build step or dependency. Each agent read is one short function invocation and one private-state read.
- **What it returns:** the snapshot window and as-of time, `stale` (older than 36 hours), per-source status, the sitewide revenue direction (later half of the window against the earlier half) and observed daily average against the target, top pages by AdSense earnings (only when page attribution is available), top pages by GSC impressions, high-impression low-CTR pages (the dashboard's CTR-gap measure), and the biggest risers and fallers against the prior 28 days. `?limit=` sets list length, 1 to 25, default 10. Pages are paths; account IDs, property IDs and credentials are never included. Responses carry the same `noindex` and `no-store` headers as the owner views.
- **What agents may do with it:** rank work. The figures never go into commits, PRs, comments, issues, docs or skill files, because the repository is public; agents cite page paths and direction only (AGENTS.md, Private growth data for agents). Use the view only for an explicitly authorized private measurement task; if it is unavailable, fall back to an authorized export or NOT MEASURED. Automatic skill integration is deferred until trigger and paired behavioral evaluations pass.
- **Failure states:** 401 without the exact token, 404 before the first snapshot, 503 when private storage is unavailable. The owner health view reports `agentAccessConfigured` without revealing the token.

### Owner setup

1. On your own computer, generate a random value, for example `openssl rand -base64 48`. Do not paste it into chat, GitHub, commits, logs or screenshots.
2. Vercel, project for `izworskic/chrisizworski-com`, Settings, Environment Variables: add `GROWTH_AGENT_TOKEN` to **Production**, marked **Sensitive**. It takes effect on the next production deployment.
3. Codex environment for this repository:
   - Use an owner-approved runtime environment variable available to the agent. Do not print it, persist it in shell initialization files, or add it to the repository. If a configured secret is not available during the agent phase, leave access unavailable rather than copying it into a file.
   - Turn on agent internet access for the environment, allowing only the domain `chrisizworski.com` and the `GET` method.
4. Claude Code sessions that should rank work need the same variable in their environment and network access to `chrisizworski.com`.
5. Check: the owner health view shows `agentAccessConfigured: true`, and after the next daily collection an agent request returns 200 with `stale: false`.

To rotate, replace the value in Vercel and in the Codex environment; the old token stops working with the next production deployment.

## Privacy and accuracy

**Authentication:** The dashboard and private GET health/report endpoints use Basic authentication over HTTPS, with a minimum 24-byte password and timing-safe equality. An unconfigured password **disables the owner dashboard**; it does not make it public. No cookies, browser-local credentials, Google access tokens, OAuth refresh tokens or AdSense account secrets are sent in report JSON. Browser Basic authentication may be cached by the browser for the session.

**Collector authentication:** The POST endpoint requires the existing main-branch GitHub OIDC token from the GSC scheduled workflow or the existing CRON secret. The browser cannot trigger collection. The private database is the only sink for collected data.

**Periods:** The current and prior GSC snapshots use a finalized 2-day lag and consecutive 28-day windows. GA4 and AdSense are requested for the exact same 28-day calendar window. Each source records dates and collection times. Different reporting time zones / adjustment windows can make daily metrics differ; compare trends with these caveats.

**Source coverage:** The native GSC report stores only its top 250 page rows; the command center must not treat summed page clicks as the full GSC property total. GSC's native property total is separately shown in source metadata. GA4 pages are fetched up to a 15,000-row cap; if truncated, the snapshot flags it. A GA4 session or active-user count summed across page paths is not a unique visitor count.

**AdSense earnings:** AdSense **sitewide** earnings are retrieved via `DATE` + `ESTIMATED_EARNINGS` and `PAGE_VIEWS`, with a verified owned-site domain filter and an explicit USD currency request. Daily average is actual summed earnings divided by all days in the exact requested interval, not modeled RPM. A separate optional `PAGE_URL` report supplies the **only** per-page earnings attribution. Its 10,000-row cap and warnings are tracked. If the page report fails, sitewide revenue survives without fabricated page values; if it is truncated, per-page attribution is marked partial. Some ad impressions may not have reliable page URLs, and Google can revise estimated earnings.

**No automatic public changes:** The collector does not rewrite SEO titles, insert more ads, send outreach, deploy tools, or alter GSC settings. Existing public tools remain unchanged.

## Operations and testing

Run:

    node --test tests/growth-auto-ingestion.test.js tests/growth-command-center.test.js tests/growth-agent-summary.test.js
    npm test

Inspect source status via the owner dashboard, not a public health probe. The dashboard is deliberately unavailable until production credentials are configured. This release cannot verify live GA4/AdSense retrieval, authenticated UI access, or actual publisher income without those owner-side configurations.

Google reference docs:
- https://developers.google.com/analytics/devguides/reporting/data/v1/basics
- https://developers.google.com/adsense/management/direct_requests
- https://developers.google.com/adsense/management/reference/rest/v2/accounts.reports/generate
- https://developers.google.com/adsense/management/metrics-dimensions
