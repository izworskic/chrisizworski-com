const { RADAR_METADATA } = require('../lib/cbbt/weather');

const USER_AGENT = 'CBBTTravelerTool/1.0 (+https://chrisizworski.com/chesapeake-bay-bridge-tunnel/)';
const STATION_ID = RADAR_METADATA.stationId;

const RADAR_SOURCES = Object.freeze([
  Object.freeze({
    id: `radar-${STATION_ID.toLowerCase()}-loop`,
    url: `https://radar.weather.gov/ridge/standard/${STATION_ID}_loop.gif`,
    contentType: 'image/gif',
  }),
  Object.freeze({
    id: `radar-${STATION_ID.toLowerCase()}-current`,
    url: `https://radar.weather.gov/ridge/standard/${STATION_ID}_0.gif`,
    contentType: 'image/gif',
  }),
]);

const CAMERA_FEED_SOURCES = Object.freeze([
  'https://511.vdot.virginia.gov/services/map/layers/map/cams',
  'https://www.511virginia.org/data/geojson/icons.cameras.geojson',
  'https://www.511virginia.org/data/icons.cameras.geojson',
]);

const CAMERA_SLOTS = Object.freeze({
  south: Object.freeze({
    id: 'south',
    label: 'South approach',
    latitude: 36.915,
    longitude: -76.105,
  }),
  north: Object.freeze({
    id: 'north',
    label: 'North approach',
    latitude: 37.125,
    longitude: -75.970,
  }),
});

const RADAR_CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';
const CAMERA_CACHE_CONTROL = 'public, max-age=30, s-maxage=50, stale-while-revalidate=300';
const CAMERA_DIRECTORY_TTL_MS = 5 * 60 * 1000;
const MAX_CAMERA_DISTANCE_MILES = 35;

let cameraDirectoryCache = { expiresAt: 0, selections: null };
let cameraDirectoryPromise = null;

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function distanceMiles(a, b) {
  const earthRadiusMiles = 3958.7613;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeCamera(feature) {
  const properties = feature?.properties;
  const coordinates = feature?.geometry?.coordinates;
  if (!properties || !Array.isArray(coordinates) || coordinates.length < 2) return null;
  if (properties.active === false || properties.problem_stream === true || !properties.image_url) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: String(properties.id || properties.name || `${latitude},${longitude}`),
    name: String(properties.description || properties.name || 'Virginia 511 traffic camera'),
    route: properties.route ? String(properties.route) : '',
    direction: properties.direction ? String(properties.direction) : '',
    imageUrl: String(properties.image_url),
    latitude,
    longitude,
  };
}

function selectNearestCamera(cameras, slot, excludedIds = new Set()) {
  return cameras
    .filter((camera) => !excludedIds.has(camera.id))
    .map((camera) => ({
      camera,
      distance: distanceMiles(
        { latitude: camera.latitude, longitude: camera.longitude },
        { latitude: slot.latitude, longitude: slot.longitude },
      ),
    }))
    .filter((entry) => entry.distance <= MAX_CAMERA_DISTANCE_MILES)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function selectCameraSlots(payload) {
  const cameras = Array.isArray(payload?.features)
    ? payload.features.map(normalizeCamera).filter(Boolean)
    : [];
  if (!cameras.length) throw new Error('Virginia 511 returned no usable cameras');

  const used = new Set();
  const selections = {};
  for (const slot of Object.values(CAMERA_SLOTS)) {
    const nearest = selectNearestCamera(cameras, slot, used);
    if (!nearest) continue;
    used.add(nearest.camera.id);
    selections[slot.id] = {
      ...nearest.camera,
      slot: slot.id,
      slotLabel: slot.label,
      distanceMiles: nearest.distance,
    };
  }

  if (!selections.south && !selections.north) {
    throw new Error('No active Virginia 511 cameras were found near the CBBT corridor');
  }
  return selections;
}

async function fetchCameraDirectory() {
  let lastError = null;
  for (const url of CAMERA_FEED_SOURCES) {
    try {
      const upstream = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(12_000),
      });
      if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
      const payload = await upstream.json();
      if (!payload || !Array.isArray(payload.features)) throw new Error('Malformed camera directory');
      return selectCameraSlots(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Virginia 511 camera directory unavailable');
}

async function getCameraSelections() {
  const now = Date.now();
  if (cameraDirectoryCache.selections && cameraDirectoryCache.expiresAt > now) {
    return cameraDirectoryCache.selections;
  }
  if (cameraDirectoryPromise) return cameraDirectoryPromise;

  cameraDirectoryPromise = (async () => {
    const selections = await fetchCameraDirectory();
    cameraDirectoryCache = {
      selections,
      expiresAt: Date.now() + CAMERA_DIRECTORY_TTL_MS,
    };
    return selections;
  })();

  try {
    return await cameraDirectoryPromise;
  } finally {
    cameraDirectoryPromise = null;
  }
}

async function fetchImage(url, expectedType) {
  const upstream = await fetch(url, {
    headers: {
      accept: expectedType || 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);

  const contentType = String(upstream.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected upstream content type: ${contentType || 'missing'}`);
  }

  return {
    contentType,
    bytes: Buffer.from(await upstream.arrayBuffer()),
  };
}

async function serveRadar(req, res) {
  const failures = [];
  for (const source of RADAR_SOURCES) {
    try {
      const image = await fetchImage(source.url, source.contentType);
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', RADAR_CACHE_CONTROL);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-CBBT-Radar-Source', source.id);
      if (req.method === 'HEAD') return res.status(200).end();
      res.setHeader('Content-Length', String(image.bytes.length));
      return res.status(200).send(image.bytes);
    } catch (error) {
      failures.push({ source: source.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  console.error('[cbbt-media] all radar sources failed', failures);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({ error: 'NWS radar is temporarily unavailable' });
}

async function serveCamera(req, res, slotName) {
  const slot = CAMERA_SLOTS[slotName];
  if (!slot) return res.status(400).json({ error: 'Unknown CBBT camera slot' });

  try {
    const selections = await getCameraSelections();
    const camera = selections[slotName];
    if (!camera) throw new Error(`No ${slotName} camera available`);

    const image = await fetchImage(camera.imageUrl);
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Cache-Control', CAMERA_CACHE_CONTROL);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-CBBT-Camera-Slot', slotName);
    res.setHeader('X-CBBT-Camera-Id', camera.id);
    res.setHeader('X-CBBT-Camera-Name', encodeURIComponent(camera.name));
    if (req.method === 'HEAD') return res.status(200).end();
    res.setHeader('Content-Length', String(image.bytes.length));
    return res.status(200).send(image.bytes);
  } catch (error) {
    console.error('[cbbt-media] camera fetch failed', {
      slot: slotName,
      error: error instanceof Error ? error.message : String(error),
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Virginia 511 camera is temporarily unavailable' });
  }
}

function selectMediaSources(query = {}) {
  return String(first(query.asset) || '').toLowerCase() === 'radar' ? RADAR_SOURCES : null;
}

function selectMediaSource(query = {}) {
  const asset = String(first(query.asset) || '').toLowerCase();
  if (asset === 'radar') return RADAR_SOURCES[0];
  if (asset === 'camera') {
    const slot = String(first(query.slot) || '').toLowerCase();
    return CAMERA_SLOTS[slot] || null;
  }
  return null;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const asset = String(first(req.query?.asset) || '').toLowerCase();
  if (asset === 'radar') return serveRadar(req, res);
  if (asset === 'camera') {
    const slot = String(first(req.query?.slot) || '').toLowerCase();
    return serveCamera(req, res, slot);
  }
  return res.status(400).json({ error: 'Unknown CBBT media source' });
}

module.exports = handler;
module.exports.RADAR_SOURCES = RADAR_SOURCES;
module.exports.RADAR_SOURCE = RADAR_SOURCES[0];
module.exports.CAMERA_SLOTS = CAMERA_SLOTS;
module.exports.selectCameraSlots = selectCameraSlots;
module.exports.selectMediaSource = selectMediaSource;
module.exports.selectMediaSources = selectMediaSources;
