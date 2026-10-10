'use strict';
const { buildSnapshot } = require('../lib/nyc-crossing/engine');
const { fetchTraffic } = require('../lib/nyc-crossing/traffic');
const { enrichNycdotBaselines } = require('../lib/nyc-crossing/baseline');
const { getCached511 } = require('../lib/nyc-crossing/ny511');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // A transient provider failure must not become a cached CDN outage either.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const q = req.query || {};
    const vehicle = { type: q.vehicle || 'car', heightFt: q.heightFt };
    const payment = q.payment || 'ny-ezpass';
    const destinationZone = q.destinationZone !== 'false';
    // Shared cache read runs in parallel with existing traffic providers; never poll 511NY here.
    const [traffic, ny511] = await Promise.all([fetchTraffic(), getCached511()]);
    await enrichNycdotBaselines(traffic);
    const snapshot = buildSnapshot({ vehicle, payment, destinationZone, travelAt: q.travelAt, traffic, ny511 });
    if (traffic.mapboxState === 'LIVE') {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=45, stale-while-revalidate=15');
    }
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(500).json({ error: 'NYC_CROSSING_ENGINE_FAILURE', message: error.message });
  }
};
