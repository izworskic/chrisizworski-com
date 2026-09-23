const { normalize } = require('../lib/soo-ais');
const BBOX = [41, -93, 49, -76];
// Three adjoining lake regions, 82 square degrees in one request, within the
// documented 100-square-degree anonymous area cap. No unbounded map proxy.
const BOXES = [[46, -93, 49, -84], [41, -88, 46, -81], [41, -81, 45, -76]];
// Detroit's public decision surface has a hard 10-minute AIS freshness limit.
// Admit only reports <=8 minutes old here so the specialist endpoint's own
// 10-second hard-expiry cache plus the Detroit shell's bounded response cache
// cannot carry a valid-at-generation vessel beyond that 10-minute boundary.
const DETROIT_SIGNAL_MAX_AGE_MS = 8 * 60 * 1000;
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'Method not allowed'}); }
  try {
    const headers = {Accept:'application/geo+json,application/json','User-Agent':'GreatLakesShipTracker/1.0 (+https://chrisizworski.com/great-lakes-freighter-tracking/)'};
    if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
    const upstream = await fetch('https://ais.openwaters.io/v1/vessels?' + BOXES.map(box => 'bbox=' + box.join(',')).join('&'), {headers,signal:AbortSignal.timeout(9000)});
    if (!upstream.ok) throw new Error('AIS provider unavailable');
    const data = normalize(await upstream.json(), Date.now(), BBOX);

    // Detroit Outdoors asks a narrower question than the lake-wide tracker:
    // "is a freighter actually passing Detroit now?" A nearby ship that is
    // stopped or crawling should not pin the focused Detroit page for hours.
    const caller = String(req.headers && req.headers['user-agent'] || '');
    const detroitSpecialist = /Detroit Outdoors specialist adapter/i.test(caller);
    if (detroitSpecialist) {
      const now = Date.now();
      data.vessels = data.vessels.filter(vessel => {
        const seen = Date.parse(vessel && vessel.seen || '');
        const speed = Number(vessel && vessel.speedKnots);
        return Number.isFinite(seen) && now - seen <= DETROIT_SIGNAL_MAX_AGE_MS && Number.isFinite(speed) && speed > 0.5;
      });
      data.detroitSignal = {
        movingOnly: true,
        minSpeedKnotsExclusive: 0.5,
        maxAgeMinutes: 8,
        publicDecisionMaxAgeMinutes: 10
      };
      res.setHeader('Cache-Control','public, s-maxage=10, must-revalidate');
    } else {
      res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
    }
    return res.status(200).json(data);
  } catch (_) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ok:false,error:'Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.'});
  }
};