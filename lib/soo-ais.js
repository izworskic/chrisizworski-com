const {utcMs,observedFields,motion,latestReports}=require('./ais-movement');
// Open Waters uses [south, west, north, east]; GeoJSON uses [longitude, latitude].
const BBOX = [46.3, -84.6, 46.7, -84.1];
const MAX_AGE_MS = 30 * 60 * 1000;
function number(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}
function normalize(raw, now = Date.now(), bbox = BBOX) {
  if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Invalid AIS response');
  const reports = [];
  for (const f of raw.features) {
    if (f?.type !== 'Feature' || f?.geometry?.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue;
    const [lon, lat] = f.geometry.coordinates || [];
    if (number(lat, bbox[0], bbox[2]) === null || number(lon, bbox[1], bbox[3]) === null) continue;
    const p = f.properties || {};
    const mmsi = String(p.mmsi ?? f.id ?? '');
    const seen = utcMs(p.seen);
    if (!/^\d{9}$/.test(mmsi) || !Number.isFinite(seen) || seen > now + 60000 || now - seen > MAX_AGE_MS) continue;
    const vessel = { mmsi, name: String(p.name || '').trim().slice(0, 100) || null, lat, lon,
      seen: new Date(seen).toISOString(), ...observedFields(p),
      shipType: number(p.type, 1, 99), source: String(p.source || 'unknown').slice(0, 100),
      lengthMeters: number(p.length, 1, 500), destination: String(p.destination || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 80) || null };
    reports.push({...vessel,motion:motion(vessel,now)});
  }
  const vessels=latestReports(reports);
  const sources = [...new Set(vessels.map(v => v.source))];
  const attribution = sources.map(source => ({ source, credit: String(raw.attribution?.[source] || source).slice(0, 1000) }));
  return { ok: true, checkedAt: new Date(now).toISOString(), maxAgeMinutes: 30, bbox,
    vessels: vessels.sort((a,b) => (a.name || a.mmsi).localeCompare(b.name || b.mmsi)), attribution };
}
module.exports = { BBOX, MAX_AGE_MS, normalize };
