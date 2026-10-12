const { stateReady, stateCommand } = require('../lib/tool-state');
const { authorizeGscRequest } = require('../lib/gsc/github-actions-oidc.js');

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'no-store');
  const view = (req.query && req.query.view) || 'health';

  if (view === 'health') {
    let storageReady = false;
    if (stateReady()) {
      try { storageReady = await stateCommand(['PING']) === 'PONG'; } catch {}
    }
    const gscReady = Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON || (process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY));
    res.status(gscReady && storageReady ? 200 : 503).json({ ok: gscReady && storageReady, gscReady, storageReady, siteUrl: process.env.GSC_SITE_URL || 'sc-domain:chrisizworski.com' });
    return;
  }

  const authorized = await authorizeGscRequest({
    authorization: req.headers.authorization || '',
    cronSecret: process.env.CRON_SECRET || '',
  });
  if (!authorized) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const { collectGscAnalytics, compactLogSummary } = await import('../lib/gsc/collector.mjs');
    const { getLatestReport } = await import('../lib/gsc/state.mjs');
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
