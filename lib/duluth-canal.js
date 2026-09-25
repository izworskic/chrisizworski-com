const CANAL = { lat: 46.7783, lon: -92.0908 };
const WESTERN_LAKE_BBOX = [46.3, -92.5, 48.4, -86.8];
const MAX_AGE_MS = 30 * 60 * 1000;
const MAX_FORECAST_MINUTES = 24 * 60;

function number(value, min, max) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function clean(value, max = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

function distanceNm(a, b = CANAL) {
  const R_NM = 3440.065;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingTo(a, b = CANAL) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function angularDifference(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(((a - b + 540) % 360) - 180);
}

function normalizeEta(value) {
  if (!value) return null;
  const raw = clean(value, 80);
  const parsed = Date.parse(raw);
  return { raw, iso: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null };
}

function normalize(raw, now = Date.now(), bbox = WESTERN_LAKE_BBOX) {
  if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Invalid AIS response');
  const vessels = new Map();

  for (const feature of raw.features) {
    if (feature?.type !== 'Feature' || feature?.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) continue;
    const [lon, lat] = feature.geometry.coordinates;
    if (number(lat, bbox[0], bbox[2]) === null || number(lon, bbox[1], bbox[3]) === null) continue;
    const p = feature.properties || {};
    const mmsi = String(p.mmsi ?? feature.id ?? '');
    const seenMs = Date.parse(p.seen || '');
    if (!/^\d{9}$/.test(mmsi) || !Number.isFinite(seenMs) || seenMs > now + 60000 || now - seenMs > MAX_AGE_MS) continue;

    const vessel = {
      mmsi,
      name: clean(p.name, 100),
      lat,
      lon,
      seen: new Date(seenMs).toISOString(),
      speedKnots: number(p.sog, 0, 102.2),
      course: number(p.cog, 0, 359.9),
      heading: number(p.heading, 0, 359),
      shipType: number(p.type, 1, 99),
      navStatus: number(p.nav_status, 0, 15),
      source: clean(p.source, 100) || 'unknown',
      station: clean(p.station, 100),
      destination: clean(p.destination, 120),
      eta: normalizeEta(p.eta),
      imo: clean(p.imo, 20),
      callSign: clean(p.call_sign ?? p.callsign, 30),
      flag: clean(p.flag, 10),
      draught: number(p.draught, 0, 30),
      lengthMeters: number(p.length, 1, 500),
      beamMeters: number(p.beam, 1, 100)
    };

    const previous = vessels.get(mmsi);
    if (!previous || seenMs > Date.parse(previous.seen)) vessels.set(mmsi, vessel);
  }

  const sources = [...new Set([...vessels.values()].map(v => v.source))];
  const attribution = sources.map(source => ({ source, credit: clean(raw.attribution?.[source], 1000) || source }));
  return {
    ok: true,
    checkedAt: new Date(now).toISOString(),
    maxAgeMinutes: 30,
    bbox,
    canal: CANAL,
    vessels: [...vessels.values()].sort((a, b) => (a.name || a.mmsi).localeCompare(b.name || b.mmsi)),
    attribution
  };
}

function destinationPointsToDuluth(destination) {
  const text = String(destination || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
  return /\bDULUTH\b|\bUSDLH\b|\bDLH\b/.test(text);
}

function sizeLabel(vessel) {
  const length = vessel.lengthMeters;
  if (Number.isFinite(length) && length >= 298) return '1,000-footer class';
  if (Number.isFinite(length) && length >= 220) return 'large freighter';
  if (vessel.shipType >= 70 && vessel.shipType < 80) return 'cargo vessel';
  if (vessel.shipType >= 60 && vessel.shipType < 70) return 'passenger vessel';
  if (vessel.shipType >= 80 && vessel.shipType < 90) return 'tanker';
  return 'commercial vessel';
}

function makeWindow(now, etaMinutes) {
  const uncertainty = etaMinutes < 60
    ? Math.max(10, etaMinutes * 0.25)
    : etaMinutes < 180
      ? Math.max(20, etaMinutes * 0.30)
      : Math.max(45, etaMinutes * 0.40);
  const start = now + Math.max(0, etaMinutes - uncertainty) * 60000;
  const end = now + (etaMinutes + uncertainty) * 60000;
  return {
    start: new Date(start).toISOString(),
    midpoint: new Date(now + etaMinutes * 60000).toISOString(),
    end: new Date(end).toISOString(),
    uncertaintyMinutes: Math.round(uncertainty)
  };
}

function buildCandidate(vessel, now = Date.now()) {
  const ageMinutes = Math.max(0, (now - Date.parse(vessel.seen)) / 60000);
  const dist = distanceNm(vessel);
  const towardBearing = bearingTo(vessel);
  const alignment = angularDifference(vessel.course, towardBearing);
  const moving = Number.isFinite(vessel.speedKnots) && vessel.speedKnots >= 1.5;
  const aligned = Number.isFinite(alignment) && alignment <= 70;
  const stronglyAligned = Number.isFinite(alignment) && alignment <= 45;
  const duluthDestination = destinationPointsToDuluth(vessel.destination);
  const localApproach = moving && stronglyAligned && dist <= 8;

  let direction = null;
  let evidenceType = null;
  if (localApproach) {
    direction = vessel.lon < CANAL.lon - 0.006 ? 'departure' : 'arrival';
    evidenceType = direction === 'departure' ? 'harbor-motion' : 'lake-approach';
  } else if (duluthDestination && moving && aligned && dist <= 150) {
    direction = 'arrival';
    evidenceType = 'destination-and-motion';
  }
  if (!direction || !moving) return null;

  const etaMinutes = dist / vessel.speedKnots * 60;
  if (!Number.isFinite(etaMinutes) || etaMinutes < 1 || etaMinutes > MAX_FORECAST_MINUTES) return null;

  let confidence = 0.34;
  if (localApproach) confidence += 0.22;
  if (duluthDestination) confidence += 0.18;
  if (stronglyAligned) confidence += 0.14;
  else if (aligned) confidence += 0.07;
  if (ageMinutes <= 8) confidence += 0.08;
  else if (ageMinutes <= 15) confidence += 0.04;
  if (dist <= 30) confidence += 0.05;
  if (vessel.lengthMeters >= 220) confidence += 0.03;
  confidence = Math.min(0.96, confidence);
  if (confidence < 0.48) return null;

  const window = makeWindow(now, etaMinutes);
  const interest = vessel.lengthMeters >= 298 ? 10 : vessel.lengthMeters >= 220 ? 7 : vessel.shipType >= 70 && vessel.shipType < 90 ? 4 : 2;
  const imminence = Math.max(0, 20 - etaMinutes / 45);
  const visitorScore = Math.round(confidence * 70 + imminence + interest);

  return {
    id: vessel.mmsi,
    mmsi: vessel.mmsi,
    name: vessel.name || `Vessel ${vessel.mmsi}`,
    direction,
    evidenceType,
    confidence: Number(confidence.toFixed(2)),
    distanceNm: Number(dist.toFixed(1)),
    speedKnots: vessel.speedKnots,
    course: vessel.course,
    courseToCanal: Number(towardBearing.toFixed(0)),
    courseAlignmentDegrees: Number(alignment.toFixed(0)),
    destination: vessel.destination,
    reportedEta: vessel.eta,
    ageMinutes: Math.round(ageMinutes),
    sizeLabel: sizeLabel(vessel),
    lengthMeters: vessel.lengthMeters,
    shipType: vessel.shipType,
    modeledMinutesToCanal: Math.round(etaMinutes),
    window,
    visitorScore,
    evidence: {
      destinationPointsToDuluth: duluthDestination,
      locallyApproachingCanal: localApproach,
      currentMotionSupportsCanalPassage: aligned
    }
  };
}

function buildCandidates(vessels, now = Date.now()) {
  return (Array.isArray(vessels) ? vessels : [])
    .map(v => buildCandidate(v, now))
    .filter(Boolean)
    .sort((a, b) => {
      const time = Date.parse(a.window.midpoint) - Date.parse(b.window.midpoint);
      return Math.abs(time) > 20 * 60000 ? time : b.visitorScore - a.visitorScore;
    });
}

function deterministicPick(candidates) {
  const usable = (Array.isArray(candidates) ? candidates : []).filter(c => c.confidence >= 0.52);
  if (!usable.length) return null;
  return [...usable].sort((a, b) => {
    const aStart = Date.parse(a.window.start);
    const bStart = Date.parse(b.window.start);
    if (Math.abs(aStart - bStart) > 90 * 60000) return aStart - bStart;
    return b.visitorScore - a.visitorScore;
  })[0];
}

function localMapVessels(vessels, radiusNm = 28) {
  return (Array.isArray(vessels) ? vessels : []).filter(v => distanceNm(v) <= radiusNm);
}

module.exports = {
  CANAL,
  WESTERN_LAKE_BBOX,
  MAX_AGE_MS,
  normalize,
  distanceNm,
  bearingTo,
  angularDifference,
  destinationPointsToDuluth,
  buildCandidate,
  buildCandidates,
  deterministicPick,
  localMapVessels,
  sizeLabel
};