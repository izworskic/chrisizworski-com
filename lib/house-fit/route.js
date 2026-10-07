'use strict';

const { buildDecision } = require('./engine');
const { enrichHouse, fetchCurrentMortgageRate } = require('./data-sources');

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
      defaults: {
        termYears: 30,
        maintenanceRatePct: 1,
        pmiRatePct: 0.6,
        frontEndHousingRatioPct: 28,
        closingCostPlanningRangePct: [2, 5],
      },
      intake: {
        required: ['address', 'askingPrice', 'downPayment'],
        prefilledEditable: ['ratePct'],
        note: 'The opening form prefills the latest available daily 30-year conforming mortgage average. Users can replace it with their own lender rate before calculating.',
      },
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const body = bodyOf(req);
  if (!body) return res.status(400).json({ error: 'INVALID_JSON' });

  const address = String(body.address || '').trim();
  const askingPrice = Number(body.askingPrice);
  const downPayment = Number(body.downPayment);
  const hasRateOverride = body.ratePct !== '' && body.ratePct != null;
  const ratePct = hasRateOverride ? Number(body.ratePct) : null;

  if (address.length < 6 || !(askingPrice > 0) || !Number.isFinite(downPayment) || downPayment < 0 || (hasRateOverride && (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 25))) {
    return res.status(400).json({
      error: 'MISSING_REQUIRED_INPUT',
      message: 'Enter a U.S. street address, positive asking price and down payment of zero or more. Any rate override must be from 0% to 25%.',
    });
  }

  const enrichment = await enrichHouse(address);
  const result = buildDecision({ address, askingPrice, downPayment, ratePct: hasRateOverride ? ratePct : '' }, enrichment);

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    ...result,
    privacy: {
      analytics: 'Interaction names only; exact address and financial values are not sent as analytics event parameters.',
    },
  });
};
