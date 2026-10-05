import { getGoogleAccessToken } from './google-auth.mjs';
import { buildWindows, collectTotals, collectWindow } from './search-console.mjs';
import { buildReport } from './classify.mjs';
import { storeReport } from './redis.mjs';

export async function collectGscAnalytics({ env = process.env, fetchImpl = fetch, now = new Date(), persist = true } = {}) {
  const siteUrl = env.GSC_SITE_URL || 'sc-domain:chrisizworski.com';
  const accessToken = await getGoogleAccessToken({ env, fetchImpl });
  const windows = buildWindows({ now, finalLagDays: Number(env.GSC_FINAL_LAG_DAYS || 2) });
  const maxPages = Math.max(500, Math.min(25000, Number(env.GSC_MAX_PAGE_ROWS || 10000)));
  const maxQueries = Math.max(500, Math.min(25000, Number(env.GSC_MAX_QUERY_ROWS || 10000)));

  const [
    totalCurrent, totalPrevious, totalYearAgo, totalCurrent7, totalPrevious7,
    pagesCurrent, pagesPrevious, pagesYearAgo,
    queriesCurrent, queriesPrevious, queriesYearAgo,
  ] = await Promise.all([
    collectTotals({ accessToken, siteUrl, window: windows.current, fetchImpl }),
    collectTotals({ accessToken, siteUrl, window: windows.previous, fetchImpl }),
    collectTotals({ accessToken, siteUrl, window: windows.yearAgo, fetchImpl }),
    collectTotals({ accessToken, siteUrl, window: windows.current7, fetchImpl }),
    collectTotals({ accessToken, siteUrl, window: windows.previous7, fetchImpl }),
    collectWindow({ accessToken, siteUrl, window: windows.current, dimension: 'page', maxRows: maxPages, fetchImpl }),
    collectWindow({ accessToken, siteUrl, window: windows.previous, dimension: 'page', maxRows: maxPages, fetchImpl }),
    collectWindow({ accessToken, siteUrl, window: windows.yearAgo, dimension: 'page', maxRows: maxPages, fetchImpl }),
    collectWindow({ accessToken, siteUrl, window: windows.current, dimension: 'query', maxRows: maxQueries, fetchImpl }),
    collectWindow({ accessToken, siteUrl, window: windows.previous, dimension: 'query', maxRows: maxQueries, fetchImpl }),
    collectWindow({ accessToken, siteUrl, window: windows.yearAgo, dimension: 'query', maxRows: maxQueries, fetchImpl }),
  ]);

  const report = buildReport({
    generatedAt: now.toISOString(),
    siteUrl,
    windows,
    totals: { current: totalCurrent, previous: totalPrevious, yearAgo: totalYearAgo, current7: totalCurrent7, previous7: totalPrevious7 },
    pages: { current: pagesCurrent, previous: pagesPrevious, yearAgo: pagesYearAgo },
    queries: { current: queriesCurrent, previous: queriesPrevious, yearAgo: queriesYearAgo },
  });
  const stored = persist ? await storeReport(report, { env, fetchImpl }) : null;
  return { report, stored };
}

export function compactLogSummary(report) {
  return {
    marker: 'gsc_analytics_summary',
    generatedAt: report.generatedAt,
    window: report.windows.current,
    totals: report.totals,
    breakout: report.pages.breakout.slice(0, 15).map((r) => ({ page: r.page, family: r.family, classification: r.classification, score: r.breakoutScore, impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position, growth: r.impressionGrowthPct })),
    ctrOpportunities: report.pages.ctrOpportunities.slice(0, 10).map((r) => ({ page: r.page, impressions: r.impressions, ctr: r.ctr, expectedCtr: r.expectedCtrPct, potentialClicks: r.potentialClicks, position: r.position })),
    families: report.families.slice(0, 15),
  };
}
