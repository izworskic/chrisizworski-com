'use strict';
const { buildSnapshot } = require('../lib/nyc-crossing/engine');
const { fetchTraffic } = require('../lib/nyc-crossing/traffic');
const { enrichNycdotBaselines } = require('../lib/nyc-crossing/baseline');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const q = req.query || {};
    const vehicle = { type: q.vehicle || 'car', heightFt: q.heightFt };
    const payment = q.payment || 'ny-ezpass';
    const destinationZone = q.destinationZone !== 'false';
    const traffic = await fetchTraffic();
    await enrichNycdotBaselines(traffic);
    return res.status(200).json(buildSnapshot({ vehicle, payment, destinationZone, travelAt: q.travelAt, traffic }));
  } catch (error) {
    return res.status(500).json({ error: 'NYC_CROSSING_ENGINE_FAILURE', message: error.message });
  }
};
