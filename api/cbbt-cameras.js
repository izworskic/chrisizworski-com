const USER_AGENT = 'CBBTTravelerTool/1.0 (+https://chrisizworski.com/chesapeake-bay-bridge-tunnel/)';
const VDOT_CAMERAS_URL = 'https://511.vdot.virginia.gov/services/map/layers/map/cams';
const VDOT_511_URL = 'https://511.vdot.virginia.gov/';

// These are geographic anchors for the CBBT corridor only. They are used to
// find nearby public VDOT cameras; they do not determine bridge status.
const CBBT_ANCHORS = Object.freeze([
  Object.freeze({ id: 'south-approach', label: 'South approach · Virginia Beach', lat: 36.915, lon: -76.105 }),
  Object.freeze({ id: 'crossing', label: 'CBBT corridor', lat: 37.03, lon: -76.083 }),
  Object.freeze({ id: 'north-approach', label: 'North approach · Eastern Shore', lat: 37.125, lon: -75.97 }),
]);

function haversineMiles(a, b) {
  const toRad = (value) => Number(value) * Math.PI / 180;
  const earthMiles = 3958.7613;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeCamera(feature) {
  const coordinates = feature && feature.geometry && feature.geometry.coordinates;
  const properties = feature && feature.properties;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || !properties) return null;
  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (properties.active === false || properties.problem_stream === true || !properties.image_url) return null;

  let nearest = null;
  for (const anchor of CBBT_ANCHORS) {
    const distanceMiles = haversineMiles({ lat, lon }, anchor);
    if (!nearest || distanceMiles < nearest.distanceMiles) nearest = { anchor, distanceMiles };
  }
  // Keep this deliberately tight enough to be useful to a CBBT traveler while
  // allowing for VDOT cameras on the immediate approaches rather than on the
  // independently operated bridge-tunnel itself.
  if (!nearest || nearest.distanceMiles > 18) return null;

  return {
    id: String(properties.id || properties.name || `${lat},${lon}`),
    name: String(properties.description || properties.name || 'VDOT traffic camera'),
    route: properties.route ? String(properties.route) : null,
    direction: properties.direction ? String(properties.direction) : null,
    latitude: lat,
    longitude: lon,
    distanceMiles: Math.round(nearest.distanceMiles * 10) / 10,
    area: nearest.anchor.label,
    imageUrl: String(properties.image_url),
    streamUrl: properties.https_url ? String(properties.https_url) : null,
  };
}

function selectCorridorCameras(payload) {
  const features = payload && Array.isArray(payload.features) ? payload.features : [];
  const cameras = features.map(normalizeCamera).filter(Boolean);
  const selected = [];
  const used = new Set();

  // Prefer one useful camera nearest each corridor anchor, then fill any spare
  // slots with the next-nearest unique cameras.
  for (const anchor of CBBT_ANCHORS) {
    const best = cameras
      .filter((camera) => !used.has(camera.id))
      .map((camera) => ({ camera, distance: haversineMiles({ lat: camera.latitude, lon: camera.longitude }, anchor) }))
      .filter((entry) => entry.distance <= 18)
      .sort((a, b) => a.distance - b.distance)[0];
    if (best) {
      used.add(best.camera.id);
      selected.push(best.camera);
    }
  }

  cameras
    .filter((camera) => !used.has(camera.id))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, Math.max(0, 4 - selected.length))
    .forEach((camera) => selected.push(camera));

  return selected.slice(0, 4);
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(VDOT_CAMERAS_URL, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) throw new Error(`VDOT 511 returned ${upstream.status}`);
    const payload = await upstream.json();
    const cameras = selectCorridorCameras(payload);
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json({
      available: cameras.length > 0,
      retrievedAt: new Date().toISOString(),
      source: { name: 'VDOT 511 Virginia', url: VDOT_511_URL, dataUrl: VDOT_CAMERAS_URL },
      note: 'Traffic cameras are visual context only. CBBT determines bridge-tunnel operating status.',
      cameras,
    });
  } catch (error) {
    console.error('[cbbt-cameras] VDOT camera fetch failed', error instanceof Error ? error.message : String(error));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      available: false,
      source: { name: 'VDOT 511 Virginia', url: VDOT_511_URL },
      error: 'VDOT traffic cameras are temporarily unavailable',
      cameras: [],
    });
  }
}

module.exports = handler;
module.exports.CBBT_ANCHORS = CBBT_ANCHORS;
module.exports.haversineMiles = haversineMiles;
module.exports.normalizeCamera = normalizeCamera;
module.exports.selectCorridorCameras = selectCorridorCameras;
