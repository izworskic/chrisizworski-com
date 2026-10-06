'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { mortgagePI, normalizeInput, costAtPrice, buildDecision } = require('../lib/house-fit/engine');

function base(overrides = {}) {
  return {
    address: '4600 Silver Hill Rd, Washington, DC 20233',
    askingPrice: 425000,
    downPayment: 85000,
    ratePct: 6.5,
    ...overrides,
  };
}

const enrichment = {
  address: { matched: true, status: 'MATCHED', matchedAddress: '4600 SILVER HILL RD, WASHINGTON, DC 20233' },
  tax: { status: 'AVAILABLE', effectiveRatePct: 1.15, geography: 'Example County', sourceDate: '2024 ACS 5-year' },
  flood: { status: 'AVAILABLE', zone: 'X', sfha: false },
  mortgageRate: { status: 'AVAILABLE', ratePct: 6.42, observationDate: '2026-10-01', provenance: 'GOVERNMENT SOURCED', source: 'Freddie Mac PMMS via FRED' },
};

test('mortgage math matches a known 30-year P&I example', () => {
  const payment = mortgagePI(300000, 6.5, 30);
  assert.ok(Math.abs(payment - 1896.20) < 0.75, 'unexpected payment ' + payment);
});

test('first-run form asks only for address, asking price and down payment', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  const formMatch = html.match(/<form id="houseFitForm">([\s\S]*?)<\/form>/);
  assert.ok(formMatch);
  const names = [...formMatch[1].matchAll(/<input[^>]+name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, ['address', 'askingPrice', 'downPayment']);
  assert.doesNotMatch(formMatch[1], /name="ratePct"/);
  assert.doesNotMatch(html, /name="monthlyLimit"/);
  assert.doesNotMatch(html, /id="accuracyForm"/);
  assert.doesNotMatch(html, /name="includeCommute"/);
});

test('mortgage-rate override exists only in the post-result adjustment form', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  const resultIndex = html.indexOf('id="result"');
  const rateIndex = html.indexOf('id="rateAdjustForm"');
  assert.ok(resultIndex >= 0 && rateIndex > resultIndex);
  assert.match(html, /id="ratePctAdjust" name="ratePct"/);
  assert.match(html, /RECALCULATE WITH THIS RATE/);
});

test('first run defaults to the current mortgage benchmark from enrichment', () => {
  const input = normalizeInput(base({ ratePct: '' }), enrichment);
  assert.equal(input.ratePct, 6.42);
  const result = buildDecision(base({ ratePct: '' }), enrichment);
  assert.equal(result.input.ratePct, 6.42);
  assert.equal(result.provenance.mortgageRate, 'GOVERNMENT SOURCED');
  assert.equal(result.enrichment.mortgageRate.observationDate, '2026-10-01');
});

test('user rate override replaces the benchmark after first run', () => {
  const result = buildDecision(base({ ratePct: 5.99 }), enrichment);
  assert.equal(result.input.ratePct, 5.99);
  assert.equal(result.provenance.mortgageRate, 'USER PROVIDED');
});

test('normalization fixes loan term and automatic assumptions instead of exposing extra inputs', () => {
  const input = normalizeInput(base({ termYears: 15, maintenanceRatePct: 9, pmiRatePct: 4 }), enrichment);
  assert.equal(input.termYears, 30);
  assert.equal(input.maintenanceRatePct, 1);
  assert.equal(input.pmiRatePct, 0.6);
});

test('higher interest rate raises the property monthly cost', () => {
  const low = buildDecision(base({ ratePct: 5.5 }), enrichment);
  const high = buildDecision(base({ ratePct: 7.5 }), enrichment);
  assert.ok(high.trueMonthlyCost.midpoint > low.trueMonthlyCost.midpoint);
});

test('higher down payment lowers the property monthly cost', () => {
  const lowDown = buildDecision(base({ downPayment: 40000 }), enrichment);
  const highDown = buildDecision(base({ downPayment: 120000 }), enrichment);
  assert.ok(highDown.trueMonthlyCost.midpoint < lowDown.trueMonthlyCost.midpoint);
});

test('higher asking price raises the automatic monthly cost', () => {
  const lower = buildDecision(base({ askingPrice: 350000 }), enrichment);
  const higher = buildDecision(base({ askingPrice: 500000 }), enrichment);
  assert.ok(higher.trueMonthlyCost.midpoint > lower.trueMonthlyCost.midpoint);
});

test('monthly cost automatically includes mortgage tax insurance PMI and maintenance', () => {
  const result = buildDecision(base({ askingPrice: 400000, downPayment: 40000 }), enrichment);
  assert.ok(result.breakdown.mortgagePI > 0);
  assert.ok(result.breakdown.propertyTax > 0);
  assert.ok(result.breakdown.homeInsurance > 0);
  assert.ok(result.breakdown.pmi > 0);
  assert.ok(result.breakdown.maintenance > 0);
  assert.ok(result.trueMonthlyCost.high >= result.trueMonthlyCost.midpoint);
  assert.ok(result.trueMonthlyCost.midpoint >= result.trueMonthlyCost.low);
});

test('PMI is included below 20 percent down and removed at exactly 20 percent', () => {
  const below = buildDecision(base({ askingPrice: 400000, downPayment: 79999 }), enrichment);
  const exactly = buildDecision(base({ askingPrice: 400000, downPayment: 80000 }), enrichment);
  assert.ok(below.breakdown.pmi > 0);
  assert.equal(exactly.breakdown.pmi, 0);
  assert.match(below.provenance.pmi.note, /exceeds 80%/i);
});

test('missing local tax data still returns a deliberately broad automatic range', () => {
  const result = buildDecision(base(), { ...enrichment, tax: { status: 'UNAVAILABLE' } });
  assert.equal(result.provenance.propertyTax.provenance, 'ESTIMATED RANGE');
  assert.ok(result.trueMonthlyCost.high > result.trueMonthlyCost.low);
});

test('SFHA is flagged without inventing a flood-insurance premium', () => {
  const result = buildDecision(base(), { ...enrichment, flood: { status: 'AVAILABLE', zone: 'AE', sfha: true } });
  assert.equal(result.provenance.floodInsurance.provenance, 'NEEDS QUOTE');
  assert.equal(result.breakdown.floodInsurance, 0);
  assert.ok(result.unpricedCosts.some((x) => x.key === 'flood-insurance'));
  assert.match(result.confidence.label, /flood premium/i);
});

test('HOA and utilities are explicitly unpriced instead of silently assumed to be zero', () => {
  const result = buildDecision(base(), enrichment);
  const keys = new Set(result.unpricedCosts.map((x) => x.key));
  assert.ok(keys.has('hoa'));
  assert.ok(keys.has('utilities'));
  assert.equal(Object.prototype.hasOwnProperty.call(result.breakdown, 'hoa'), false);
});

test('cash-to-close range is automatically derived from down payment and closing-cost band', () => {
  const result = buildDecision(base({ askingPrice: 400000, downPayment: 80000 }), enrichment);
  assert.equal(result.cashToClose.downPayment, 80000);
  assert.ok(result.cashToClose.totalLow > 80000);
  assert.ok(result.cashToClose.totalHigh > result.cashToClose.totalLow);
});

test('income benchmark is derived from monthly housing cost without pretending to know debts', () => {
  const result = buildDecision(base(), enrichment);
  assert.equal(result.incomeBenchmark.housingRatioPct, 28);
  assert.ok(result.incomeBenchmark.annualLow > result.trueMonthlyCost.low * 12);
  assert.match(result.incomeBenchmark.note, /does not include your other debts/i);
});

test('formatted currency inputs normalize safely', () => {
  const input = normalizeInput(base({ askingPrice: '$425,000', downPayment: '$85,000', ratePct: '6.50%' }), enrichment);
  assert.equal(input.askingPrice, 425000);
  assert.equal(input.downPayment, 85000);
  assert.equal(input.ratePct, 6.5);
});

test('engine has no monthly limit and returns no Fit Ceiling', () => {
  const withOldField = buildDecision(base({ monthlyLimit: 1 }), enrichment);
  const withoutOldField = buildDecision(base(), enrichment);
  assert.equal(withOldField.trueMonthlyCost.midpoint, withoutOldField.trueMonthlyCost.midpoint);
  assert.equal(Object.prototype.hasOwnProperty.call(withOldField, 'fitCeiling'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(withOldField, 'monthlyLimit'), false);
});

test('page promise is three-input automation with automatic current rate', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  assert.match(html, /Three inputs\. The app does the rest\./i);
  assert.match(html, /house address, asking price and your down payment/i);
  assert.match(html, /current 30-year mortgage benchmark/i);
  assert.match(html, /PMI when the down payment is below 20%/i);
  assert.doesNotMatch(html, /reverse-solves/i);
  assert.doesNotMatch(html, /Fit Ceiling/i);
});

test('mobile page keeps true monthly cost ahead of support content', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  const css = readFileSync(path.join(__dirname, '..', 'public', 'assets', 'house-fit.css'), 'utf8');
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  assert.ok(html.indexOf('id="trueMonthlyResult"') < html.indexOf('id="breakdownGrid"'));
  assert.match(css, /@media\(max-width:390px\)/);
});

test('cost calculation remains finite on edge inputs', () => {
  const input = normalizeInput(base({ askingPrice: 10000, downPayment: 50000, ratePct: 0 }), enrichment);
  const cost = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'mid' });
  for (const value of [cost.total, cost.loanPrincipal, cost.ltv]) assert.ok(Number.isFinite(value));
  assert.equal(cost.loanPrincipal, 0);
  assert.ok(cost.total >= 0);
});
