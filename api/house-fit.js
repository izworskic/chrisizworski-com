'use strict';

const { buildDecision } = require('../lib/house-fit/engine');
const { enrichHouse, fetchCurrentMortgageRate } = require('../lib/house-fit/data-sources');

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Vary', 'Accept-Encoding');

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    const mortgageRate = await fetchCurrentMortgageRate();
    return res.status(200).json({
      mortgageRate,
      defaults: { termYears: 30, maintenanceRatePct: 1, commuteMpg: 25, gasPrice: 3.5 },
      routing: { state: 'MANUAL_ONLY', note: 'Commute is manual in the zero-cost MVP; the Fit Ceiling still includes its cash burden when enabled.' },
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const body = bodyOf(req);
  if (!body) return res.status(400).json({ error: 'INVALID_JSON' });
  const askingPrice = Number(body.askingPrice), monthlyLimit = Number(body.monthlyLimit), downPayment = Number(body.downPayment);
  if (!(askingPrice > 0) || !(monthlyLimit > 0) || !Number.isFinite(downPayment) || downPayment < 0) {
    return res.status(400).json({ error: 'MISSING_REQUIRED_INPUT', message: 'askingPrice and monthlyLimit must be positive numbers; downPayment must be zero or greater.' });
  }

  const enrichment = await enrichHouse(body.address);
  const result = buildDecision(body, enrichment);
  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    ...result,
    privacy: { analytics: 'Interaction names only; exact address and financial values are not sent as analytics event parameters.' },
  });
};
