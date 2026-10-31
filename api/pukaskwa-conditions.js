'use strict';

/**
 * Read the independently monitored public GitHub data branch; never scrape
 * Parks Canada from a visitor request. An unavailable feed never becomes Open.
 */
const FEED_URL = 'https://raw.githubusercontent.com/izworskic/chrisizworski-com/pukaskwa-conditions-data/pukaskwa/conditions-latest.json';
const FEED_TTL_MS = 5 * 60_000;
const ERROR_TTL_MS = 30_000;
let cached = null, validUntil = 0, inFlight = null;

async function fetchFeed(fetchImpl = fetch) {
  const response = await fetchImpl(FEED_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'ChrisIzworski-PukaskwaVisitorGuide/1.0 (+https://chrisizworski.com/pukaskwa-national-park/)' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Monitored source unavailable');
  const resolved = new URL(response.url || FEED_URL);
  if (resolved.protocol !== 'https:' || resolved.hostname !== 'raw.githubusercontent.com' ||
      resolved.pathname !== new URL(FEED_URL).pathname) throw new Error('Unexpected monitored source redirect');
  const length = Number(response.headers.get('content-length') || '0');
  if (length > 150_000) throw new Error('Source record exceeds expected size');
  const text = await response.text();
  if (text.length > 150_000) throw new Error('Source record exceeds expected size');
  return JSON.parse(text);
}
async function readFeed() {
  const now = Date.now();
  if (cached && now < validUntil) return cached;
  if (inFlight) return inFlight;
  inFlight = fetchFeed()
    .then(value => {cached = value; validUntil = Date.now() + FEED_TTL_MS; return value;})
    .catch(err => {
      // Never substitute a cached Open on a source failure. Keep the old feed
      // outside the visitor path; retry after the short failure backoff.
      cached = null;
      validUntil = Date.now() + ERROR_TTL_MS;
      throw err;
    }).finally(() => { inFlight = null; });
  return inFlight;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Access-Control-Allow-Origin', 'https://chrisizworski.com');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  }
  if ((req.url || '').includes('?')) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ok:false,error:'UNSUPPORTED_PARAMETERS'});
  }

  const { projectPukaskwaFeed, unavailablePukaskwa } = await import('../lib/pukaskwa/public-status.mjs');
  try {
    const result = projectPukaskwaFeed(await readFeed(), Date.now());
    // HTTP caching is shorter than the independent monitor TTL; no stale
    // cached response is allowed to assert a fresh official observation.
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(result);
  } catch (_) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json(unavailablePukaskwa());
  }
};

module.exports._test = { fetchFeed, reset() {cached = null; validUntil = 0; inFlight = null;} };
