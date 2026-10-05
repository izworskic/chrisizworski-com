module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'no-store');
  const view = (req.query && req.query.view) || 'health';

  if (view === 'health') {
    const redisReady = Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
    const gscReady = Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON || (process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY));
    res.status(gscReady && redisReady ? 200 : 503).json({ ok: gscReady && redisReady, gscReady, redisReady, siteUrl: process.env.GSC_SITE_URL || 'sc-domain:chrisizworski.com' });
    return;
  }

  const auth = req.headers.authorization || '';
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : '';
  if (!expected || auth !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const { collectGscAnalytics, compactLogSummary } = await import('../lib/gsc/collector.mjs');
    const { getLatestReport } = await import('../lib/gsc/redis.mjs');
    if (view === 'collect') {
      const { report, stored } = await collectGscAnalytics();
      console.log(JSON.stringify(compactLogSummary(report)));
      res.status(200).json({ ok: true, generatedAt: report.generatedAt, stored, totals: report.totals.current, breakoutCount: report.pages.breakout.length });
      return;
    }
    if (view === 'report') {
      const report = await getLatestReport();
      if (!report) return res.status(404).json({ error: 'no-report-yet' });
      res.status(200).json(report);
      return;
    }
    res.status(400).json({ error: 'unknown-view' });
  } catch (error) {
    console.error('gsc_analytics_error', error && error.stack ? error.stack : String(error));
    res.status(500).json({ error: 'gsc-analytics-failed', detail: String(error && error.message ? error.message : error) });
  }
};
