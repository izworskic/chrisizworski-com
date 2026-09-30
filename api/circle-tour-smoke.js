'use strict';

const UPSTREAM = 'https://national-outdoor-core.vercel.app/api/national-smoke-window';

function finite(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }

  const lat = finite(req.query?.lat ?? req.query?.latitude, -90, 90);
  const lon = finite(req.query?.lon ?? req.query?.longitude, -180, 180);
  if (lat == null || lon == null) return res.status(400).json({error:'Valid lat and lon are required'});

  try {
    const url = new URL(UPSTREAM);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'ChrisIzworski-CircleTour-Smoke/1.0 (+https://chrisizworski.com/lake-superior-circle-tour/)',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Smoke product returned ${response.status}`);
    const data = await response.json();
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json({...data, source_product:'Wildfire Smoke & Outdoor Air Window'});
  } catch (error) {
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json({
      generated_at: new Date().toISOString(),
      status: 'insufficient_evidence',
      reason_code: 'smoke_upstream_unavailable',
      decision: null,
      current: null,
      source_product: 'Wildfire Smoke & Outdoor Air Window',
      note: 'The Circle Tour could not reach the existing smoke decision product, so smoke did not change route scoring.',
    });
  }
};

module.exports.UPSTREAM = UPSTREAM;
module.exports.finite = finite;
