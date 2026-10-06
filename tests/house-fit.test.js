'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { mortgagePI, normalizeInput, costAtPrice, solveFitCeiling, buildDecision } = require('../lib/house-fit/engine');

function base(overrides = {}) {
  return {
    address: '4600 Silver Hill Rd, Washington, DC 20233',
    askingPrice: 425000,
    monthlyLimit: 3600,
    downPayment: 85000,
    ratePct: 6.5,
    termYears: 30,
    propertyTaxAnnual: 5200,
    homeInsuranceAnnual: 1800,
    hoaMonthly: 0,
    maintenanceRatePct: 1,
    includeCommute: false,
    ...overrides,
  };
}
const enrichment = {
  address: { matched: true, status: 'MATCHED' },
  tax: { status: 'AVAILABLE', effectiveRatePct: 1.15, geography: 'Example County', sourceDate: '2024 ACS 5-year' },
  flood: { status: 'AVAILABLE', zone: 'X', sfha: false },
  mortgageRate: { status: 'AVAILABLE', ratePct: 6.5, provenance: 'GOVERNMENT SOURCED' },
};

test('mortgage math matches a known 30-year P&I example', () => {
  const payment = mortgagePI(300000, 6.5, 30);
  assert.ok(Math.abs(payment - 1896.20) < 0.75, 'unexpected payment ' + payment);
});
test('higher monthly limit never lowers Fit Ceiling', () => {
  assert.ok(buildDecision(base({ monthlyLimit: 4000 }), enrichment).fitCeiling.rawMidpoint >= buildDecision(base({ monthlyLimit: 3200 }), enrichment).fitCeiling.rawMidpoint);
});
test('higher interest rate never increases Fit Ceiling', () => {
  assert.ok(buildDecision(base({ ratePct: 7.5 }), enrichment).fitCeiling.rawMidpoint <= buildDecision(base({ ratePct: 5.5 }), enrichment).fitCeiling.rawMidpoint);
});
test('higher down payment does not decrease Fit Ceiling', () => {
  assert.ok(buildDecision(base({ downPayment: 100000 }), enrichment).fitCeiling.rawMidpoint >= buildDecision(base({ downPayment: 50000 }), enrichment).fitCeiling.rawMidpoint);
});
test('higher tax never increases Fit Ceiling', () => {
  assert.ok(buildDecision(base({ propertyTaxAnnual: 9000 }), enrichment).fitCeiling.rawMidpoint <= buildDecision(base({ propertyTaxAnnual: 4000 }), enrichment).fitCeiling.rawMidpoint);
});
test('higher insurance never increases Fit Ceiling', () => {
  assert.ok(buildDecision(base({ homeInsuranceAnnual: 4800 }), enrichment).fitCeiling.rawMidpoint <= buildDecision(base({ homeInsuranceAnnual: 1200 }), enrichment).fitCeiling.rawMidpoint);
});
test('higher maintenance reserve reduces Fit Ceiling', () => {
  assert.ok(buildDecision(base({ maintenanceRatePct: 1.5 }), enrichment).fitCeiling.rawMidpoint < buildDecision(base({ maintenanceRatePct: 0.5 }), enrichment).fitCeiling.rawMidpoint);
});
test('commute reduces Fit Ceiling and zero commute removes burden', () => {
  const none = buildDecision(base(), enrichment);
  const commute = buildDecision(base({ includeCommute: true, commuteOneWayMiles: 30, commuteDaysPerWeek: 5, commuteMpg: 25, gasPrice: 3.5 }), enrichment);
  assert.ok(commute.fitCeiling.rawMidpoint < none.fitCeiling.rawMidpoint);
  assert.equal(none.breakdown.commute, 0);
  assert.ok(commute.breakdown.commute > 0);
});
test('missing optional data still returns an explicitly estimated range', () => {
  const result = buildDecision(base({ propertyTaxAnnual: null, homeInsuranceAnnual: null }), { ...enrichment, tax: { status: 'UNAVAILABLE' } });
  assert.ok(result.fitCeiling.high >= result.fitCeiling.low);
  assert.equal(result.provenance.propertyTax.provenance, 'ESTIMATED RANGE');
  assert.equal(result.provenance.homeInsurance.provenance, 'ESTIMATED RANGE');
});
test('user actuals improve confidence', () => {
  const estimated = buildDecision(base({ propertyTaxAnnual: null, homeInsuranceAnnual: null }), enrichment);
  const actual = buildDecision(base(), enrichment);
  const rank = { Low: 0, Medium: 1, High: 2 };
  assert.ok(rank[actual.confidence.label] > rank[estimated.confidence.label]);
});
test('SFHA without flood quote refuses false precision', () => {
  const result = buildDecision(base({ floodInsuranceAnnual: null }), { ...enrichment, flood: { status: 'AVAILABLE', zone: 'AE', sfha: true } });
  assert.equal(result.verdict.state, 'NEEDS_BETTER_INPUTS');
  assert.equal(result.provenance.floodInsurance.provenance, 'NEEDS QUOTE');
});
test('why-ceiling-moved uses counterfactual solves', () => {
  const result = buildDecision(base({ includeCommute: true, commuteOneWayMiles: 20, commuteDaysPerWeek: 5 }), enrichment);
  const commute = result.whyCeilingMoved.find((x) => x.key === 'commute');
  assert.ok(commute && commute.monthlyEffect > 0 && commute.fitCeilingEffect > 0);
});
test('sensitivity scenarios move in expected directions', () => {
  const result = buildDecision(base({ includeCommute: true, commuteOneWayMiles: 20 }), enrichment);
  const byKey = Object.fromEntries(result.sensitivity.map((x) => [x.key, x]));
  assert.ok(byKey['rate-down-1'].delta >= 0);
  assert.ok(byKey['down-plus-20'].delta >= 0);
  assert.ok(byKey['limit-plus-250'].delta >= 0);
  assert.ok(byKey['no-commute'].delta >= 0);
  assert.ok(byKey['insurance-plus-100'].delta <= 0);
});
test('solver is numerically stable on edge inputs', () => {
  const input = normalizeInput(base({ askingPrice: 10000, downPayment: 50000, ratePct: 0, termYears: 15, monthlyLimit: 1500 }), enrichment);
  const ceiling = solveFitCeiling(input, enrichment, { scenario: 'mid' });
  const cost = costAtPrice(ceiling, input, enrichment, { scenario: 'mid' });
  for (const value of [ceiling, cost.total, cost.loanPrincipal, cost.ltv]) assert.ok(Number.isFinite(value));
  assert.ok(ceiling >= 0 && cost.loanPrincipal >= 0);
});
test('mobile page keeps Fit Ceiling ahead of support content at 390px', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  const css = readFileSync(path.join(__dirname, '..', 'public', 'assets', 'house-fit.css'), 'utf8');
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  assert.ok(html.indexOf('id="fitCeiling"') < html.indexOf('id="why-section"'));
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /\.fit-ceiling-metric\{grid-column:1\/-1/);
});
test('page promise is reverse price solving, not generic affordability', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  assert.match(html, /what I can afford to pay for <strong>this house<\/strong>/i);
  assert.match(html, /reverse-solves the purchase price/i);
  assert.match(html, /Fit Ceiling is personal price capacity—not market value/i);
});
