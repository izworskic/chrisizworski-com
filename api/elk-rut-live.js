'use strict';

const LIVE_URL = 'https://raw.githubusercontent.com/izworskic/rocky-mountain-elk-rut-live/main/public/live.json';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(LIVE_URL, {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        'user-agent': 'ChrisIzworskiSite/1.0 (+https://chrisizworski.com/)'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!upstream.ok) {
      throw new Error(`Elk live source returned ${upstream.status}`);
    }

    const data = await upstream.json();
    if (data?.title !== 'Rocky Mountain Elk Rut Live' || !Array.isArray(data?.windows) || !data?.primary) {
      throw new Error('Elk live source failed integrity check');
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.setHeader('X-Content-Source', 'izworskic/rocky-mountain-elk-rut-live');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Elk rut live proxy failure', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'Elk rut live data temporarily unavailable',
      detail: error instanceof Error ? error.message : 'Unknown error',
      generatedAt: new Date().toISOString()
    });
  }
};
