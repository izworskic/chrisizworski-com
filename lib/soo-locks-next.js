'use strict';

// Soo Locks next-ship engine.
//
// Turns fresh AIS reports along the St. Marys River into a short list of ships
// that the evidence says are heading for the locks, each with a planning window
// for when it should reach them, and flags any ship that is in a lock chamber
// right now. Everything is deterministic and derived from the reports; the
// optional JEV step (lib/soo-locks-jev.js) may only choose among these
// candidates, never alter them.
//
// Geometry
//   Lock chambers: OpenStreetMap lock=yes outlines via Nominatim (Sep 27 2026).
//     MacArthur is the southernmost chamber, beside the public viewing platform
//     on Portage Avenue; Poe is the next chamber north.
//   Channel: the shipping route as a polyline measured outward from the locks.
//     Distances are along the channel, not straight-line, because the river
//     bends and upbound and downbound ships use different channels around
//     Neebish Island (downbound West Neebish, upbound Middle Neebish). Points
//     were placed from OpenStreetMap shorelines of Sugar and Neebish Islands and
//     named points (Point Iroquois, Gros Cap, Brush Point, Pointe aux Pins,
//     Frechette Point, Moon Island, Lime Island, Pipe Island, DeTour range
//     light) and checked against live AIS positions of moving ships.
//     tests/soo-locks-next.test.js asserts no segment crosses either island.

const RIVER_BBOX = [45.9, -85.2, 47.0, -83.4];
const LOCAL_BBOX = [46.3, -84.6, 46.7, -84.1];
const MAX_AGE_MS = 30 * 60 * 1000;
const MAX_FORECAST_MINUTES = 8 * 60;
const LOCK_POINT = [46.5027, -84.3518];

const LOCKS = {
  poe: { name: 'Poe Lock', lat: [46.5027022, 46.5032082], lon: [-84.354708, -84.3495071] },
  macarthur: { name: 'MacArthur Lock', lat: [46.5021856, 46.5025054], lon: [-84.3526286, -84.3488508] }
};
// AIS antennas sit anywhere on a hull up to 1,000 ft long, so reported positions
// can fall just outside a chamber outline. Pad along the chamber more than across it.
const LOCK_PAD = { lat: 0.00012, lon: 0.0007 };

// Each route runs outward from the locks. [lat, lon].
const ROUTES = {
  // Downbound traffic arrives from Lake Superior along this route.
  upper: [
    LOCK_POINT, [46.5029, -84.3547], [46.5025, -84.370], [46.497, -84.395], [46.486, -84.425],
    [46.4735, -84.459], [46.466, -84.52], [46.49, -84.58], [46.51, -84.62], [46.58, -84.70],
    [46.70, -84.86], [46.80, -84.97]
  ],
  // Upbound traffic arrives from Lake Huron along this route (Middle Neebish Channel).
  lowerUpbound: [
    LOCK_POINT, [46.5028, -84.3489], [46.5005, -84.335], [46.497, -84.315], [46.487, -84.300],
    [46.474, -84.2925], [46.458, -84.2890], [46.440, -84.262], [46.420, -84.252], [46.400, -84.245],
    [46.375, -84.229], [46.350, -84.205], [46.338, -84.183], [46.326, -84.160], [46.322, -84.140], [46.318, -84.132], [46.308, -84.124],
    [46.285, -84.113], [46.257, -84.090], [46.230, -84.100], [46.205, -84.110], [46.190, -84.114],
    [46.163, -84.065], [46.120, -84.005], [46.085, -83.975], [46.050, -83.935], [46.025, -83.915],
    [45.990, -83.885], [45.950, -83.860]
  ],
  // Downbound ships leave by the West Neebish Channel. Used only to recognise
  // that a ship south of the locks is already past them.
  lowerDownbound: [
    LOCK_POINT, [46.5028, -84.3489], [46.5005, -84.335], [46.497, -84.315], [46.487, -84.300],
    [46.474, -84.2925], [46.458, -84.2890], [46.440, -84.262], [46.420, -84.252], [46.400, -84.245],
    [46.375, -84.229], [46.350, -84.215], [46.330, -84.224], [46.300, -84.226], [46.285, -84.226],
    [46.271, -84.214], [46.255, -84.197], [46.240, -84.186], [46.226, -84.180], [46.205, -84.150],
    [46.190, -84.114], [46.163, -84.065], [46.120, -84.005], [46.085, -83.975], [46.050, -83.935],
    [46.025, -83.915], [45.990, -83.885], [45.950, -83.860]
  ]
};

// Ports a ship would reach only by going up through the locks, or only by going down.
const SUPERIOR_PORTS = /\b(DULUTH|SUPERIOR|TWO HARBORS|SILVER BAY|TACONITE|MARQUETTE|PRESQUE ISLE|THUNDER BAY|ASHLAND|ESCANABA NO|MICHIPICOTEN|WAWA|HOUGHTON|L ANSE|MUNISING|GRAND MARAIS|NIPIGON|MARATHON|USDLH|USSUW|USTWH|CATHB|USMQT)\b/;
const LOWER_PORTS = /\b(DETROIT|TOLEDO|CLEVELAND|ASHTABULA|CONNEAUT|BUFFALO|CHICAGO|GARY|BURNS HARBOR|INDIANA HARBOR|INDY|IND HBR|MILWAUKEE|ROUGE|ZUG|MONROE|SANDUSKY|MARBLEHEAD|LORAIN|ALPENA|STONEPORT|CALCITE|ROGERS CITY|PORT INLAND|CEDARVILLE|DRUMMOND|ESCANABA|GREEN BAY|SARNIA|WINDSOR|NANTICOKE|HAMILTON|MONTREAL|QUEBEC|GODERICH|ESSAR|ST CLAIR|ESSEXVILLE|SAGINAW|BAY CITY|HARBOR BEACH|OSWEGO|PORT COLBORNE|WELLAND)\b/;

function number(value, min, max) {
  const n = typeof value === 'number' ? value : (value === null || value === '' || value === undefined ? NaN : Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function clean(value, max = 160) {
  const text = String(value ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

// ---- geometry (flat-earth projection is accurate to well under 1% at this scale) ----
const NM_PER_DEG_LAT = 60;
const NM_PER_DEG_LON = 60 * Math.cos(46.4 * Math.PI / 180);
function toXY([lat, lon]) { return [lon * NM_PER_DEG_LON, lat * NM_PER_DEG_LAT]; }
function distNm(a, b) { const [ax, ay] = toXY(a), [bx, by] = toXY(b); return Math.hypot(ax - bx, ay - by); }
function bearing(from, to) {
  const [ax, ay] = toXY(from), [bx, by] = toXY(to);
  return (Math.atan2(bx - ax, by - ay) * 180 / Math.PI + 360) % 360;
}
function angleDiff(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(((a - b + 540) % 360) - 180);
}

// Project a point onto a route. Returns distance along the route from the locks,
// lateral offset from the channel, and the heading a ship would steer to move
// toward the locks at that spot.
function project(route, point) {
  const p = toXY(point);
  let best = null, along = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = toXY(route[i]), b = toXY(route[i + 1]);
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (len * len)));
    const q = [a[0] + t * dx, a[1] + t * dy];
    const lateral = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (!best || lateral < best.lateralNm) {
      best = { lateralNm: lateral, alongNm: along + t * len, towardLocks: bearing(route[i + 1], route[i]), segment: i };
    }
    along += len;
  }
  return best;
}

function routeLengthNm(route) {
  let n = 0; for (let i = 0; i < route.length - 1; i++) n += distNm(route[i], route[i + 1]); return n;
}

function inChamber(v) {
  if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) return null;
  const hits = Object.entries(LOCKS).filter(([, l]) =>
    v.lat >= l.lat[0] - LOCK_PAD.lat && v.lat <= l.lat[1] + LOCK_PAD.lat &&
    v.lon >= l.lon[0] - LOCK_PAD.lon && v.lon <= l.lon[1] + LOCK_PAD.lon);
  if (!hits.length) return null;
  if (hits.length === 1) return hits[0][0];
  // Chambers sit side by side; take the one whose centreline is nearer.
  return hits.sort(([, a], [, b]) => Math.abs(v.lat - (a.lat[0] + a.lat[1]) / 2) - Math.abs(v.lat - (b.lat[0] + b.lat[1]) / 2))[0][0];
}

// ---- vessel facts ----
function normalizeEta(value) {
  const raw = clean(value, 40);
  return raw ? { raw } : null;
}

function normalize(raw, now = Date.now(), bbox = RIVER_BBOX) {
  if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Invalid AIS response');
  const vessels = new Map();
  for (const f of raw.features) {
    if (f?.type !== 'Feature' || f?.geometry?.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (number(lat, bbox[0], bbox[2]) === null || number(lon, bbox[1], bbox[3]) === null) continue;
    const p = f.properties || {};
    const mmsi = String(p.mmsi ?? f.id ?? '');
    const seen = Date.parse(p.seen || '');
    if (!/^\d{9}$/.test(mmsi) || !Number.isFinite(seen) || seen > now + 60000 || now - seen > MAX_AGE_MS) continue;
    const v = {
      mmsi, name: clean(p.name, 100), lat, lon, seen: new Date(seen).toISOString(),
      speedKnots: number(p.sog, 0, 102.2), course: number(p.cog, 0, 359.9), heading: number(p.heading, 0, 359),
      shipType: number(p.type, 1, 99), source: clean(p.source, 100) || 'unknown',
      destination: clean(p.destination, 80), eta: normalizeEta(p.eta),
      lengthMeters: number(p.length, 1, 500), beamMeters: number(p.beam, 1, 100)
    };
    if (!vessels.has(mmsi) || seen > Date.parse(vessels.get(mmsi).seen)) vessels.set(mmsi, v);
  }
  const list = [...vessels.values()].sort((a, b) => (a.name || a.mmsi).localeCompare(b.name || b.mmsi));
  const sources = [...new Set(list.map(v => v.source))];
  return {
    vessels: list,
    attribution: sources.map(source => ({ source, credit: clean(raw.attribution?.[source], 1000) || source }))
  };
}

function inBox(v, bbox) { return v.lat >= bbox[0] && v.lat <= bbox[2] && v.lon >= bbox[1] && v.lon <= bbox[3]; }

// Laker or saltie, from the flag the MMSI encodes. 366-369 and 338 are U.S., 316 is Canada.
function flagGroup(mmsi) {
  const mid = String(mmsi).slice(0, 3);
  if (/^(33[8]|36[6-9])$/.test(mid)) return 'us';
  if (mid === '316') return 'canada';
  return 'foreign';
}

function isCommercialShip(v) {
  if (Number.isFinite(v.lengthMeters)) return v.lengthMeters >= 90;
  return v.shipType >= 70 && v.shipType < 90;
}

function sizeLabel(v) {
  const L = v.lengthMeters;
  if (Number.isFinite(L) && L >= 298) return '1,000-footer';
  if (flagGroup(v.mmsi) === 'foreign' && isCommercialShip(v)) return 'ocean-going saltie';
  if (v.shipType >= 60 && v.shipType < 70 && Number.isFinite(L) && L >= 90) return 'cruise ship';
  if (Number.isFinite(L) && L >= 190) return 'laker';
  if (v.shipType >= 80 && v.shipType < 90) return 'tanker';
  return 'freighter';
}

// The MacArthur chamber is 800 x 80 ft; a ship over about 730 ft or 76 ft beam
// can only use the Poe. Below that the lockmaster may assign either chamber.
function lockFor(v) {
  if ((Number.isFinite(v.lengthMeters) && v.lengthMeters > 225) || (Number.isFinite(v.beamMeters) && v.beamMeters > 23.5)) {
    return { lock: 'poe', certain: true, note: 'Too large for the MacArthur Lock, so it will use the Poe Lock.' };
  }
  return { lock: null, certain: false, note: 'Small enough for either chamber; the lockmaster assigns it.' };
}

function destinationDirection(destination) {
  const t = String(destination || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  if (!t.trim()) return null;
  const up = SUPERIOR_PORTS.test(t), down = LOWER_PORTS.test(t);
  if (up && !down) return 'upbound';
  if (down && !up) return 'downbound';
  return null;
}

function makeWindow(now, minutes) {
  const u = minutes < 60 ? Math.max(10, minutes * 0.25) : minutes < 180 ? Math.max(20, minutes * 0.30) : Math.max(45, minutes * 0.40);
  return {
    start: new Date(now + Math.max(0, minutes - u) * 60000).toISOString(),
    midpoint: new Date(now + minutes * 60000).toISOString(),
    end: new Date(now + (minutes + u) * 60000).toISOString(),
    uncertaintyMinutes: Math.round(u)
  };
}

// Ships slow to lock-entry speed for roughly the last nautical mile.
const APPROACH_NM = 1;
const APPROACH_KNOTS = 2.5;
function minutesToLock(alongNm, speedKnots) {
  if (alongNm <= APPROACH_NM) return alongNm / Math.max(1, Math.min(speedKnots, APPROACH_KNOTS)) * 60;
  return ((alongNm - APPROACH_NM) / speedKnots + APPROACH_NM / APPROACH_KNOTS) * 60;
}

function base(v, now) {
  const ageMinutes = Math.max(0, Math.round((now - Date.parse(v.seen)) / 60000));
  const lock = lockFor(v);
  return {
    id: v.mmsi, mmsi: v.mmsi, name: v.name || `Vessel ${v.mmsi}`, lat: v.lat, lon: v.lon, seen: v.seen, ageMinutes,
    speedKnots: v.speedKnots, course: v.course, destination: v.destination, reportedEta: v.eta,
    lengthMeters: v.lengthMeters, lengthFeet: Number.isFinite(v.lengthMeters) ? Math.round(v.lengthMeters * 3.28084) : null,
    sizeLabel: sizeLabel(v), flag: flagGroup(v.mmsi), lock: lock.lock, lockCertain: lock.certain, lockNote: lock.note
  };
}

function inLockNow(v, now = Date.now()) {
  const chamber = inChamber(v);
  if (!chamber || !isCommercialShip(v)) return null;
  if (Number.isFinite(v.speedKnots) && v.speedKnots > 4) return null;
  const heading = Number.isFinite(v.course) && Number.isFinite(v.speedKnots) && v.speedKnots >= 0.3 ? v.course : null;
  const direction = heading === null ? null : angleDiff(heading, 270) <= 60 ? 'upbound' : angleDiff(heading, 90) <= 60 ? 'downbound' : null;
  return { ...base(v, now), state: 'in-lock', chamber, chamberName: LOCKS[chamber].name, direction: direction || destinationDirection(v.destination) };
}

function buildCandidate(v, now = Date.now()) {
  if (!isCommercialShip(v) || inChamber(v)) return null;
  const moving = Number.isFinite(v.speedKnots) && v.speedKnots >= 1.5;
  if (!moving || !Number.isFinite(v.course)) return null;

  // Which side of the locks is it on? West of the lock chambers is Lake Superior's side.
  const superiorSide = v.lon < LOCK_POINT[1] - 0.004 && v.lat > 46.43;
  const route = superiorSide ? ROUTES.upper : ROUTES.lowerUpbound;
  const direction = superiorSide ? 'downbound' : 'upbound';
  const pr = project(route, [v.lat, v.lon]);
  if (!superiorSide) {
    // A ship on the West Neebish Channel is downbound and already past the locks.
    const down = project(ROUTES.lowerDownbound, [v.lat, v.lon]);
    if (down.lateralNm + 0.15 < pr.lateralNm) return null;
  }
  const openWater = superiorSide ? pr.segment >= 8 : pr.segment >= 24;
  const maxLateral = openWater ? 3 : 0.8;
  if (pr.lateralNm > maxLateral) return null;

  const alignment = angleDiff(v.course, pr.towardLocks);
  if (alignment === null || alignment > (openWater ? 45 : 60)) return null;

  const destDir = destinationDirection(v.destination);
  if (destDir && destDir !== direction) return null;

  const minutes = minutesToLock(pr.alongNm, v.speedKnots);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > MAX_FORECAST_MINUTES) return null;

  const ageMinutes = Math.max(0, (now - Date.parse(v.seen)) / 60000);
  let confidence = 0.40;
  if (pr.alongNm <= 3) confidence += 0.20; else if (pr.alongNm <= 12) confidence += 0.10;
  if (alignment <= 30) confidence += 0.12; else confidence += 0.06;
  if (destDir === direction) confidence += 0.12;
  if (pr.lateralNm <= 0.4) confidence += 0.05;
  if (ageMinutes <= 8) confidence += 0.08; else if (ageMinutes <= 15) confidence += 0.04;
  confidence = Math.min(0.95, confidence);
  if (confidence < 0.48) return null;

  const b = base(v, now);
  const interest = b.sizeLabel === '1,000-footer' ? 10 : b.sizeLabel === 'ocean-going saltie' ? 8 : b.sizeLabel === 'cruise ship' ? 8 : Number.isFinite(v.lengthMeters) && v.lengthMeters >= 190 ? 6 : 3;
  const imminence = Math.max(0, 20 - minutes / 20);
  return {
    ...b,
    state: 'approaching',
    direction,
    confidence: Number(confidence.toFixed(2)),
    channelMilesToLocks: Number((pr.alongNm * 1.15078).toFixed(1)),
    channelNmToLocks: Number(pr.alongNm.toFixed(1)),
    offChannelNm: Number(pr.lateralNm.toFixed(2)),
    courseAlignmentDegrees: Math.round(alignment),
    destinationAgrees: destDir === direction,
    modeledMinutesToLocks: Math.round(minutes),
    window: makeWindow(now, minutes),
    visitorScore: Math.round(confidence * 70 + imminence + interest)
  };
}

function buildCandidates(vessels, now = Date.now()) {
  return (Array.isArray(vessels) ? vessels : [])
    .map(v => buildCandidate(v, now)).filter(Boolean)
    .sort((a, b) => {
      const dt = Date.parse(a.window.midpoint) - Date.parse(b.window.midpoint);
      return Math.abs(dt) > 20 * 60000 ? dt : b.visitorScore - a.visitorScore;
    });
}

function deterministicPick(candidates) {
  const usable = (Array.isArray(candidates) ? candidates : []).filter(c => c.confidence >= 0.52);
  if (!usable.length) return null;
  return [...usable].sort((a, b) => {
    const as = Date.parse(a.window.start), bs = Date.parse(b.window.start);
    if (Math.abs(as - bs) > 45 * 60000) return as - bs;
    return b.visitorScore - a.visitorScore;
  })[0];
}

function inLockList(vessels, now = Date.now()) {
  return (Array.isArray(vessels) ? vessels : []).map(v => inLockNow(v, now)).filter(Boolean);
}

module.exports = {
  RIVER_BBOX, LOCAL_BBOX, MAX_AGE_MS, LOCKS, LOCK_POINT, ROUTES,
  normalize, inBox, project, routeLengthNm, distNm, inChamber, flagGroup, sizeLabel, lockFor,
  destinationDirection, minutesToLock, buildCandidate, buildCandidates, deterministicPick, inLockNow, inLockList
};
