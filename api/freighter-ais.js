const { loadFreighterFeed } = require('../lib/freighter-feed');
const { normalize } = require('../lib/soo-ais');

// Duluth and Soo Locks query Open Waters with a waterway-specific bbox.
// The existing lake-wide feed remains unchanged for every other caller.
const CUYAHOGA_BBOX = Object.freeze([41.40, -81.85, 41.60, -81.58]);
const CUYAHOGA_SCOPE = 'cuyahoga-regional-openwaters';

// St. Clair River + Lake St. Clair + Detroit River corridor, for the passage-window pages.
// The bbox is the reviewed corridor bounding box (data/passage-corridors/st-clair-detroit.json).
const ST_CLAIR_DETROIT_BBOX = Object.freeze(require('../data/passage-corridors/st-clair-detroit.json').bbox.slice());
const REGIONS = Object.freeze({
  cuyahoga: { bbox: CUYAHOGA_BBOX, scope: CUYAHOGA_SCOPE, agent: 'CuyahogaRiverWatch/1.0 (+https://chrisizworski.com/cuyahoga-freighter-watch/)' },
  'st-clair-detroit': { bbox: ST_CLAIR_DETROIT_BBOX, scope: 'st-clair-detroit-regional-openwaters', agent: 'StClairRiverShipWatch/1.0 (+https://chrisizworski.com/st-clair-river-ships/)' }
});

async function loadRegionalFeed(region) {
  const r = REGIONS[region];
  const headers = { Accept: 'application/geo+json,application/json', 'User-Agent': r.agent };
  if (process.env.OPEN_WATERS_API_TOKEN) headers.Authorization = 'Bearer ' + process.env.OPEN_WATERS_API_TOKEN;
  const url = 'https://ais.openwaters.io/v1/vessels?bbox=' + r.bbox.join(',') + '&max_age=30m';
  const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(9000) });
  if (!upstream.ok) throw new Error('Regional AIS provider unavailable');
  const data = normalize(await upstream.json(), Date.now(), r.bbox);
  return { ...data, scope: r.scope };
}

// Detroit's public decision surface has a hard 10-minute AIS freshness limit.
// Admit only reports <=8 minutes old here so the specialist endpoint's own
// 10-second hard-expiry cache plus the Detroit shell's bounded response cache
// cannot carry a valid-at-generation vessel beyond that 10-minute boundary.
const DETROIT_SIGNAL_MAX_AGE_MS = 8 * 60 * 1000;
module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'Method not allowed'}); }
  const region = req.query && req.query.region;
  if (region !== undefined && !Object.prototype.hasOwnProperty.call(REGIONS, region)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ok:false,error:'Unknown AIS region'});
  }
  const isRegional = region !== undefined;
  try {
    const data = isRegional ? await loadRegionalFeed(region) : await loadFreighterFeed();

    // Detroit Outdoors asks a narrower question than the lake-wide tracker:
    // "is a freighter actually passing Detroit now?" A nearby ship that is
    // stopped or crawling should not pin the focused Detroit page for hours.
    const caller = String(req.headers && req.headers['user-agent'] || '');
    const detroitSpecialist = /Detroit Outdoors specialist adapter/i.test(caller);
    if (detroitSpecialist) {
      const now = Date.now();
      data.vessels = data.vessels.filter(vessel => {
        const seen = Date.parse(vessel && vessel.seen || '');
        const speed = vessel && vessel.speedKnots;
        return Number.isFinite(seen) && now >= seen && now - seen <= DETROIT_SIGNAL_MAX_AGE_MS && Number.isFinite(speed) && speed > 0.5;
      });
      data.detroitSignal = {
        movingOnly: true,
        minSpeedKnotsExclusive: 0.5,
        maxAgeMinutes: 8,
        publicDecisionMaxAgeMinutes: 10
      };
      res.setHeader('Cache-Control','public, s-maxage=10, must-revalidate');
    } else if (isRegional) {
      // Match the 45-second bounded specialty AIS cache used by Soo and Duluth.
      res.setHeader('Cache-Control','public, s-maxage=45, stale-while-revalidate=60');
    } else {
      res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=30');
    }
    return res.status(200).json(data);
  } catch (_) {
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ok:false,error:'Vessel reports are temporarily unavailable. Try again or use the BoatNerd passage list below.'});
  }
};
