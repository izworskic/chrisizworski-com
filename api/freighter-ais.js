const { normalize } = require('../lib/soo-ais');
const BBOX = [41, -93, 49, -76];
// Three adjoining lake regions, 82 square degrees in one request, within the
// documented 100-square-degree anonymous area cap. No unbounded map proxy.
const BOXES = [[46, -93, 49, -84], [41, -88, 46, -81], [41, -81, 45, -76]];
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'Method not allowed'}); }
  try {
    const headers = {Accept:'application/geo+json,application/json','User-Agent':'GreatLakesShipTracker/1.0 (+https://chrisizworski.com/great-lakes-freighter-tracking/)'};
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
    const upstream = await fetch('https://ais.openwaters.io/v1/vessels?' + BOXES.map(box => 'bbox=' + box.join(',')).join('&'), {headers,signal:AbortSignal.timeout(9000)});
    if (!upstream.ok) throw new Error('AIS provider unavailable');
    const data = normalize(await upstream.json(), Date.now(), BBOX);
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (_) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ok:false,error:'Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.'});
  }
};
