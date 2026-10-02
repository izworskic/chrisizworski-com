'use strict';

const UPSTREAM = 'https://national-coastal-water.vercel.app/api/oregon-coastal';

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');

  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const date = typeof req.query?.date === 'string' ? req.query.date : '';
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const url = new URL(UPSTREAM);
  if (date) url.searchParams.set('date', date);

  try {
    const upstream = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'ChrisIzworski-OregonCoast-Proxy/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    if (req.method === 'HEAD') return res.end();
    return res.send(text);
  } catch (error) {
    console.error('[oregon-coastal-proxy] upstream failure', error instanceof Error ? error.message : String(error));
    return res.status(502).json({
      error: 'Oregon coastal decision service is temporarily unavailable',
      degraded: true,
    });
  }
};
