// Open Waters uses [south, west, north, east]; GeoJSON uses [longitude, latitude].
const BBOX = [46.3, -84.6, 46.7, -84.1];
const MAX_AGE_MS = 30 * 60 * 1000;
function number(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}
function normalize(raw, now = Date.now()) {
  if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Invalid AIS response');
  const vessels = new Map();
  for (const f of raw.features) {
    if (f?.type !== 'Feature' || f?.geometry?.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue;
    const [lon, lat] = f.geometry.coordinates || [];
    if (number(lat, BBOX[0], BBOX[2]) === null || number(lon, BBOX[1], BBOX[3]) === null) continue;
    const p = f.properties || {};
    const mmsi = String(p.mmsi ?? f.id ?? '');
    const seen = Date.parse(p.seen || '');
    if (!/^\d{9}$/.test(mmsi) || !Number.isFinite(seen) || seen > now + 60000 || now - seen > MAX_AGE_MS) continue;
    const vessel = { mmsi, name: String(p.name || '').trim().slice(0, 100) || null, lat, lon,
      seen: new Date(seen).toISOString(), speedKnots: number(p.sog, 0, 102.2),
      course: number(p.cog, 0, 359.9), heading: number(p.heading, 0, 359),
      shipType: number(p.type, 1, 99), source: String(p.source || 'unknown').slice(0, 100) };
    if (!vessels.has(mmsi) || seen > Date.parse(vessels.get(mmsi).seen)) vessels.set(mmsi, vessel);
  }
  const sources = [...new Set([...vessels.values()].map(v => v.source))];
  const attribution = sources.map(source => ({ source, credit: String(raw.attribution?.[source] || source).slice(0, 1000) }));
  return { ok: true, checkedAt: new Date(now).toISOString(), maxAgeMinutes: 30, bbox: BBOX,
    vessels: [...vessels.values()].sort((a,b) => (a.name || a.mmsi).localeCompare(b.name || b.mmsi)), attribution };
}
module.exports = { BBOX, MAX_AGE_MS, normalize };
