const OPEN_WATERS = 'https://ais.openwaters.io/v1/vessels';
const BBOX = '47.63,-122.45,47.70,-122.32';
const UA = 'BallardLocksLive/1.0 (+https://chrisizworski.com/ballard-locks/tour/)';

function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sanitizeFeature(feature) {
  if (feature?.type !== 'Feature' || feature?.geometry?.type !== 'Point') return null;
  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lon = finite(coords[0]);
  const lat = finite(coords[1]);
  if (lon == null || lat == null || lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
  const p = feature.properties || {};
  const mmsi = String(p.mmsi ?? feature.id ?? '').replace(/[^0-9]/g, '').slice(0, 9) || null;
  const name = String(p.name || '').trim().slice(0, 80) || null;
  return {
    type: 'Feature',
    id: mmsi || undefined,
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
      mmsi,
      name,
      sog: finite(p.sog),
      cog: finite(p.cog),
      heading: finite(p.heading),
      nav_status: p.nav_status ?? null,
      type: p.type ?? null,
      source: String(p.source || '').slice(0, 80) || 'Open Waters AIS',
      received: String(p.received || p.timestamp || p.ts || '').slice(0, 40) || null,
    },
  };
}

async function handler(req, res) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    let response;
    try {
      response = await fetch(`${OPEN_WATERS}?bbox=${encodeURIComponent(BBOX)}`, {
        headers: { accept: 'application/geo+json,application/json', 'user-agent': UA },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(`Open Waters AIS returned ${response.status}`);
    const raw = await response.json();
    if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Open Waters AIS response was not GeoJSON');
    const features = raw.features.map(sanitizeFeature).filter(Boolean);
    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      source: 'Open Waters AIS',
      sourceUrl: 'https://openwaters.io/ais/',
      cadence: 'live; page refreshes approximately every 15 seconds',
      coverage: 'AIS-equipped vessels received by participating terrestrial stations',
      bbox: BBOX.split(',').map(Number),
      count: features.length,
      featureCollection: { type: 'FeatureCollection', features },
    };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=8, stale-while-revalidate=20');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(JSON.stringify(payload));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(JSON.stringify({ ok: false, generatedAt: new Date().toISOString(), source: 'Open Waters AIS', error: error.message }));
  }
}

module.exports = handler;
module.exports._test = { sanitizeFeature, BBOX };
