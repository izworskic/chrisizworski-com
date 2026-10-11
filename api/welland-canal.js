'use strict';

// AIS only: no invented lock appointments, order-of-turn, or arrival estimates.
// Reuses the provider already used by Soo Locks and Duluth.
const { normalize } = require('../lib/soo-ais');
const BBOX = [42.83, -79.34, 43.28, -79.10];

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Access-Control-Allow-Origin', 'https://chrisizworski.com');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ok:false,error:'Method not allowed'});
  }
  try {
    const headers = {Accept:'application/geo+json,application/json', 'User-Agent':'WellandCanalLive/1.0 (+https://chrisizworski.com/welland-canal/)'};
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
    const upstream = await fetch('https://ais.openwaters.io/v1/vessels?bbox=' + BBOX.join(','), {headers,signal:AbortSignal.timeout(8500)});
    if (!upstream.ok) throw new Error('AIS upstream status ' + upstream.status);
    const data = normalize(await upstream.json(), Date.now(), BBOX);
    res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
    return res.status(200).json({
      ok:true, checkedAt:data.checkedAt, maxAgeMinutes:30, vessels:data.vessels,
      attribution:data.attribution, coverage:'public AIS reports within Welland Canal corridor',
      source:'Open Waters public AIS', isSchedule:false,
      caveat:'Recent AIS vessel positions do not establish a lock booking, confirmed passage, or estimated arrival time.'
    });
  } catch (_) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({
      ok:false, error:'Recent AIS positions are temporarily unavailable. Consult the official Seaway vessel-transit and lock order-of-turn information.'
    });
  }
};
