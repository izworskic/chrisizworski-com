const { RADAR_METADATA } = require('../lib/cbbt/weather');

const USER_AGENT = 'CBBTTravelerTool/1.0 (+https://chrisizworski.com/chesapeake-bay-bridge-tunnel/)';
const RADAR_SOURCE = Object.freeze({
  id: `radar-${RADAR_METADATA.stationId.toLowerCase()}`,
  url: `https://radar.weather.gov/ridge/standard/${RADAR_METADATA.stationId}_loop.gif`,
  contentType: 'image/gif',
  cacheControl: 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
});

function first(value) { return Array.isArray(value) ? value[0] : value; }
function selectMediaSource(query = {}) { return String(first(query.asset) || '').toLowerCase() === 'radar' ? RADAR_SOURCE : null; }

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'Method not allowed' }); }
  const source = selectMediaSource(req.query);
  if (!source) return res.status(400).json({ error: 'Unknown CBBT media source' });
  try {
    const upstream = await fetch(source.url, { headers: { accept: source.contentType, 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);
    const upstreamType = String(upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (upstreamType !== source.contentType) throw new Error(`Unexpected upstream content type: ${upstreamType || 'missing'}`);
    res.setHeader('Content-Type', source.contentType); res.setHeader('Cache-Control', source.cacheControl); res.setHeader('Content-Disposition', 'inline');
    if (req.method === 'HEAD') return res.status(200).end();
    const bytes = Buffer.from(await upstream.arrayBuffer()); res.setHeader('Content-Length', String(bytes.length)); return res.status(200).send(bytes);
  } catch (error) {
    console.error('[cbbt-media] upstream fetch failed', { source: source.id, error: error instanceof Error ? error.message : String(error) });
    res.setHeader('Cache-Control', 'no-store'); return res.status(502).json({ error: 'NWS radar is temporarily unavailable' });
  }
}

module.exports = handler;
module.exports.RADAR_SOURCE = RADAR_SOURCE;
module.exports.selectMediaSource = selectMediaSource;
