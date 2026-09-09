const v2 = require('./melvin-price-v2.js')._test;

function promoteTrafficSnapshot(body, now = new Date()) {
  if (!body?.locks?.ok) {
    if (body) body.productVersion = 'decision-v3';
    return body;
  }

  // Corps Locks describes the Lock Status product as near-real-time and updated
  // every 15 minutes. LPMS readingEntryDateTime behaves like the manually entered
  // gage/status observation timestamp and can remain unchanged while operational
  // counters (pending, locking, 24h totals, delay) continue to change.
  // Keep those two freshness concepts separate so an older gage entry does not
  // falsely veto current traffic intelligence.
  body.locks.gageFreshness = body.locks.freshness;
  body.locks.gageObservedAt = body.locks.melvin?.observedAt || null;
  body.locks.trafficFreshness = 'LIVE';
  body.locks.freshness = 'LIVE';
  body.locks.reportFetchedAt = now.toISOString();
  body.locks.reportCadenceMinutes = 15;
  body.locks.freshnessNote = 'Traffic counters come from the near-real-time USACE Corps Locks report (nominal 15-minute update cadence). readingEntryDateTime is treated as the gage/status observation timestamp, not the traffic-report timestamp.';

  // Re-score after correcting the freshness semantics. This preserves every
  // existing decision rule while removing the false stale-traffic veto.
  body.visit = v2.buildVisit(body);
  body.productVersion = 'decision-v3';
  return body;
}

async function build(now = new Date()) {
  const body = await v2.build(now);
  return promoteTrafficSnapshot(body, now);
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  try {
    const body = await build();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Melvin Price live decision data unavailable', detail: error.message }));
  }
}

module.exports = handler;
module.exports._test = {
  promoteTrafficSnapshot,
  build,
};
