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

// Mirror the proven Mackinac Bridge pattern: fixed, known camera image URLs are
// proxied by our own endpoint. Do not discover cameras in the browser or make a
// directory lookup on every request. The public VDOT camera inventory identifies
// both feeds as active Virginia Beach cameras on US-60 near the CBBT approach.
const CAMERA_SOURCES = Object.freeze({
  south: Object.freeze({
    id: 'vabeachcam013',
    label: 'CBBT approach',
    description: 'US-60 / E Stratford Rd',
    sources: Object.freeze([
      'https://snapshot.vdotcameras.com/thumbs/vabeachcam013.flv.png',
      'https://snapshot.vdotcameras.com/thumbs/vabeachcam014.flv.png',
    ]),
  }),
  north: Object.freeze({
    id: 'vabeachcam048',
    label: 'Shore Drive',
    description: 'US-60 / Shore Dr and N Great Neck Rd',
    sources: Object.freeze([
      'https://snapshot.vdotcameras.com/thumbs/vabeachcam048.flv.png',
      'https://snapshot.vdotcameras.com/thumbs/vabeachcam014.flv.png',
    ]),
  }),
});

const RADAR_CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';
const CAMERA_CACHE_CONTROL = 'public, max-age=30, s-maxage=50, stale-while-revalidate=300';

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

async function fetchImage(url, expectedType) {
  const upstream = await fetch(url, {
    headers: {
      accept: expectedType || 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(8_000),
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

async function fetchFirstImage(sources, expectedType) {
  const failures = [];
  for (const url of sources) {
    try {
      const image = await fetchImage(url, expectedType);
      return { ...image, sourceUrl: url };
    } catch (error) {
      failures.push({ url, error: error instanceof Error ? error.message : String(error) });
    }
  }
  const failure = new Error('All fixed image sources failed');
  failure.failures = failures;
  throw failure;
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
  const camera = CAMERA_SOURCES[slotName];
  if (!camera) return res.status(400).json({ error: 'Unknown CBBT camera slot' });

  try {
    const image = await fetchFirstImage(camera.sources);
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Cache-Control', CAMERA_CACHE_CONTROL);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-CBBT-Camera-Slot', slotName);
    res.setHeader('X-CBBT-Camera-Id', camera.id);
    res.setHeader('X-CBBT-Camera-Name', encodeURIComponent(camera.description));
    if (req.method === 'HEAD') return res.status(200).end();
    res.setHeader('Content-Length', String(image.bytes.length));
    return res.status(200).send(image.bytes);
  } catch (error) {
    console.error('[cbbt-media] fixed camera sources failed', {
      slot: slotName,
      camera: camera.id,
      failures: error && error.failures ? error.failures : undefined,
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
    return CAMERA_SOURCES[slot] || null;
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
module.exports.CAMERA_SOURCES = CAMERA_SOURCES;
module.exports.selectMediaSource = selectMediaSource;
module.exports.selectMediaSources = selectMediaSources;
