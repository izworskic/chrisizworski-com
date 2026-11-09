# Revenue Command Center — private owner workbench

**Status:** working source-only dashboard. It is intentionally under ops/, not public/. Do not relocate it into public/ without proper owner authentication and a privacy review. It is not part of the sitemap, GA4 or AdSense injection.

## What it does

- Joins GSC page rows, GA4 page rows, and AdSense page-revenue rows by normalized first-party URL, preserving subdomain boundaries.
- Shows imported clicks, impressions, CTR, position, GA4 views, and actual AdSense estimated earnings only if those fields are genuinely present.
- Calculates observed AdSense earnings/day and the gap to $300/day **only** for an owner-confirmed complete-site AdSense export with explicit dates.
- Never apportions site revenue to pages or estimates revenue from traffic.
- Compares current versus previous GSC only when windows are consecutive and equally long; overlapping exports are not accepted as a growth comparison.
- Uses rank-peer CTR medians (minimum three pages with at least 100 impressions per ranking bucket) to show *descriptive* potential-click gaps, not predictions.
- Filters shipping/winter pages and saves/loads explicit private JSON snapshots. The data never leaves the browser.

## Launch

**Fastest option:** download the single file at ops/growth-command-center/Revenue-Command-Center.html, save it to your computer, and open it in Chrome, Edge or Firefox. No server or login is needed. Alternatively, from a local checkout, open ops/growth-command-center/index.html. No API key, internet connection or build step is necessary. Alternatively run:

    node scripts/build-growth-command-center.mjs

This emits a self-contained HTML file to the OS temporary directory and prints its exact path. **Keep that file private.** The dashboard is empty until an actual data file is imported.

## Import sources

1. Google Search Console → Performance → Search results → Pages → Export CSV. Select the Pages.csv file containing Top pages, Clicks, Impressions, CTR and Position. If using a prior export, keep property, search type and filters identical. Enter the exact two reporting date ranges.
2. Google Analytics 4 → Pages and screens or Landing page → Export CSV with page path and Views (or Sessions). A page-path-only export is treated as the main chrisizworski.com hostname. Pageviews are not visitors, and page/screen sessions are not necessarily landing sessions.
3. Google AdSense → Reports → Export CSV with Estimated earnings. A revenue export without a Page URL column supplies sitewide revenue *only*; many AdSense reports do not offer page-URL earnings. The historical AdSense URL channels format (URL channels / Page views / Estimated earnings (USD)) is accepted as a site-level report and produces observed AdSense page RPM; it does **not** establish the reporting dates. Do not infer a daily rate without dates. Do not substitute Google Ads spend data. Set the actual AdSense reporting period and confirm complete, unfiltered site coverage only if true.
4. Confirm the AdSense account's revenue currency is USD before interpreting dollar amounts.

No browser telemetry, automatic persistence, localStorage or server uploads. The private JSON snapshot contains all imported rows. Do not add a snapshot or input CSV to this public repository.

## Truth and security notes

- The repo has a secured daily GSC collector at api/gsc-analytics.js; this release does not bypass its authorization, publish raw queries or expose CRON_SECRET to a browser.
- GA4 is already installed on public pages; it is not a verified AdSense earnings source.
- The currently connected Windsor.ai service refuses live reads due to free-plan account limits. Nothing in the command center represents those unavailable numbers as live data.
- GA4 distinct users cannot be summed across multiple pages to get site unique visitors. Returning visitors need their own correctly scoped GA4 report.
- The GSC page table need not equal the Search Console property total. A GA4 export may omit low-traffic pages. The dashboard therefore says "imported pages".
- The CTR peer gap is a prioritization clue, not a forecast or a basis to rewrite titles without page-query evidence.
- This release does not alter production pages, SEO, ad formats, analytics instrumentation or site routing.

## Tests

    node --test tests/growth-command-center.test.js

The test joins the normal npm test suite (tests/*.test.js).

## Future live integration gates

An authenticated owner-only endpoint, a legitimate AdSense publisher earnings source, confirmed GA4 property and source windows, and acceptance tests must exist before automatically collecting revenue. Do not make the public static site expose protected earnings or the collector's CRON secret.

## Automated owner dashboard

The daily ingestion and password-protected hosted dashboard are documented in [AUTO_INGESTION.md](AUTO_INGESTION.md).
Once the required production environment variables are configured, open `https://chrisizworski.com/api/growth-dashboard`, enter the owner credentials, and the latest stored GSC/GA4/AdSense snapshot will load automatically. The offline file and CSV import remain available for fallback. The hosted dashboard is intentionally unavailable until its separate owner password is configured.
