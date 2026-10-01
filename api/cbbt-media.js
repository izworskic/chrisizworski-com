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
const CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';

function first(value) { return Array.isArray(value) ? value[0] : value; }
function selectMediaSources(query = {}) {
  return String(first(query.asset) || '').toLowerCase() === 'radar' ? RADAR_SOURCES : null;
}

async function fetchRadarSource(source) {
  const upstream = await fetch(source.url, {
    headers: { accept: source.contentType, 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(12_000),
  });
  if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
  const upstreamType = String(upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (upstreamType !== source.contentType) throw new Error(`Unexpected upstream content type: ${upstreamType || 'missing'}`);
  return Buffer.from(await upstream.arrayBuffer());
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sources = selectMediaSources(req.query);
  if (!sources) return res.status(400).json({ error: 'Unknown CBBT media source' });

  const failures = [];
  for (const source of sources) {
    try {
      if (req.method === 'HEAD') {
        const upstream = await fetch(source.url, {
          method: 'HEAD',
          headers: { accept: source.contentType, 'user-agent': USER_AGENT },
          signal: AbortSignal.timeout(8_000),
        });
        if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
        res.setHeader('Content-Type', source.contentType);
        res.setHeader('Cache-Control', CACHE_CONTROL);
        res.setHeader('X-CBBT-Radar-Source', source.id);
        return res.status(200).end();
      }

      const bytes = await fetchRadarSource(source);
      res.setHeader('Content-Type', source.contentType);
      res.setHeader('Cache-Control', CACHE_CONTROL);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('X-CBBT-Radar-Source', source.id);
      return res.status(200).send(bytes);
    } catch (error) {
      failures.push({ source: source.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  console.error('[cbbt-media] all radar sources failed', failures);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({ error: 'NWS radar is temporarily unavailable' });
}

module.exports = handler;
module.exports.RADAR_SOURCES = RADAR_SOURCES;
module.exports.RADAR_SOURCE = RADAR_SOURCES[0];
module.exports.selectMediaSource = (query = {}) => {
  const sources = selectMediaSources(query);
  return sources ? sources[0] : null;
};
module.exports.selectMediaSources = selectMediaSources;
