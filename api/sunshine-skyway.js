const { buildSnapshot } = require('../lib/sunshine-skyway-weather');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=90');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const snapshot = await buildSnapshot({ query: req.query || {} });
    if (req.method === 'HEAD') return res.status(200).end?.() ?? res.status(200).json({});
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(500).json({
      error: 'SUNSHINE_SKYWAY_ENGINE_FAILURE',
      message: 'The Sunshine Skyway decision engine could not assemble a live snapshot.',
      officialStatus: { state: 'UNKNOWN', label: 'Official Skyway status unavailable', reason: 'ENGINE_FAILURE' },
      systemHealth: { state: 'FAILED', error: String(error?.message || error) },
    });
  }
};
