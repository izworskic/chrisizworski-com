const { BBOX, normalize } = require('../lib/soo-ais');
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'Method not allowed'}); }
  try {
    const headers = {Accept:'application/geo+json,application/json','User-Agent':'SooLocksLive/1.0 (+https://chrisizworski.com/soo-locks/)'};
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
    const upstream = await fetch('https://ais.openwaters.io/v1/vessels?bbox=' + BBOX.join(','), {headers,signal:AbortSignal.timeout(9000)});
    if (!upstream.ok) throw new Error('AIS provider unavailable');
    const data = normalize(await upstream.json());
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (_) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ok:false,error:'Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.'});
  }
};
