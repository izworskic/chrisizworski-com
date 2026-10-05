'use strict';
const { buildSnapshot } = require('../lib/nyc-crossing/engine');
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const q = req.query || {};
    const vehicle = { type: q.vehicle || 'car', heightFt: q.heightFt };
    const payment = q.payment || 'ny-ezpass';
    const destinationZone = q.destinationZone !== 'false';
    const traffic = { state: 'UNAVAILABLE', reason: process.env.NY511_API_KEY ? '511NY adapter is configured for the next integration pass.' : 'NY511_API_KEY is not configured; live full-trip ETAs are withheld.', routes: [] };
    return res.status(200).json(buildSnapshot({ vehicle, payment, destinationZone, travelAt: q.travelAt, traffic }));
  } catch (error) { return res.status(500).json({ error: 'NYC_CROSSING_ENGINE_FAILURE', message: error.message }); }
};
