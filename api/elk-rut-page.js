'use strict';

const PAGE_URL = 'https://raw.githubusercontent.com/izworskic/rocky-mountain-elk-rut-live/4d4f2a20d22d19a11231376559903f5e134eb5cf/public/national-tools/elk-rut/index.html';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }

  try {
    const upstream = await fetch(PAGE_URL, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'ChrisIzworskiSite/1.0 (+https://chrisizworski.com/)'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!upstream.ok) {
      throw new Error(`Elk page source returned ${upstream.status}`);
    }

    const html = await upstream.text();
    if (!html.includes('Rocky Mountain Elk Rut Live') || !html.includes('https://chrisizworski.com/national-tools/elk-rut/')) {
      throw new Error('Elk page source failed integrity check');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Source', 'izworskic/rocky-mountain-elk-rut-live');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send(html);
  } catch (error) {
    console.error('Elk rut page proxy failure', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).send('Rocky Mountain Elk Rut Live is temporarily unavailable.');
  }
};
