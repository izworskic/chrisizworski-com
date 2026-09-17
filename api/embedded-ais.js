const { normalize } = require('../lib/soo-ais');
const regions={ballard:[47.63,-122.45,47.70,-122.32],melvin:[38.65,-90.45,39.05,-89.95]};
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'Method not allowed'}); }
  const BBOX=regions[req.query?.region];
  if(!BBOX)return res.status(400).json({ok:false,error:'Unknown map region'});
  try {
    const headers = {Accept:'application/geo+json,application/json','User-Agent':'VisitorAIS/1.0 (+https://chrisizworski.com/)'};
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
    const upstream = await fetch('https://ais.openwaters.io/v1/vessels?bbox=' + BBOX.join(','), {headers,signal:AbortSignal.timeout(9000)});
    if (!upstream.ok) throw new Error('AIS provider unavailable');
    const data = normalize(await upstream.json(), Date.now(), BBOX);
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (_) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ok:false,error:'Vessel reports are temporarily unavailable. Try again or check the original provider.'});
  }
};
