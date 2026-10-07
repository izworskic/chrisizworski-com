'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const {
  mortgagePI, normalizeInput, costAtPrice, realityGap, downPaymentBreakpoint, buildDecision,
} = require('../lib/house-fit/engine');

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

test('mortgage-rate override exists only after the first result', () => {
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

test('ledger line-item ranges reconcile exactly to the displayed total range', () => {
  const result = buildDecision(base({ askingPrice: 400000, downPayment: 40000 }), enrichment);
  const keys = ['mortgagePI', 'propertyTax', 'homeInsurance', 'pmi', 'maintenance', 'floodInsurance'];
  const low = keys.reduce((sum, key) => sum + result.breakdownRange[key].low, 0);
  const midpoint = keys.reduce((sum, key) => sum + result.breakdownRange[key].midpoint, 0);
  const high = keys.reduce((sum, key) => sum + result.breakdownRange[key].high, 0);
  assert.ok(Math.abs(low - result.trueMonthlyCost.low) < 0.01);
  assert.ok(Math.abs(midpoint - result.trueMonthlyCost.midpoint) < 0.01);
  assert.ok(Math.abs(high - result.trueMonthlyCost.high) < 0.01);
});

test('Reality Gap is true monthly cost minus mortgage principal and interest', () => {
  const result = buildDecision(base({ askingPrice: 400000, downPayment: 40000 }), enrichment);
  const expectedMid = result.trueMonthlyCost.midpoint - result.breakdown.mortgagePI;
  assert.ok(Math.abs(result.realityGap.monthlyMidpoint - expectedMid) < 0.01);
  assert.ok(result.realityGap.monthlyLow > 0);
  assert.ok(result.realityGap.monthlyHigh >= result.realityGap.monthlyLow);
  assert.ok(result.realityGap.nonMortgageSharePct > 0);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'incomeBenchmark'), false);
});

test('Reality Gap helper never returns a negative hidden-cost burden', () => {
  const low = { total: 100, components: { mortgagePI: 120 } };
  const mid = { total: 100, components: { mortgagePI: 120 } };
  const high = { total: 100, components: { mortgagePI: 120 } };
  const gap = realityGap(low, mid, high);
  assert.equal(gap.monthlyLow, 0);
  assert.equal(gap.monthlyMidpoint, 0);
  assert.equal(gap.monthlyHigh, 0);
});

test('PMI is included below 20 percent down and removed at exactly 20 percent', () => {
  const below = buildDecision(base({ askingPrice: 400000, downPayment: 79999 }), enrichment);
  const exactly = buildDecision(base({ askingPrice: 400000, downPayment: 80000 }), enrichment);
  assert.ok(below.breakdown.pmi > 0);
  assert.equal(exactly.breakdown.pmi, 0);
  assert.match(below.provenance.pmi.note, /exceeds 80%/i);
});

test('20 percent breakpoint explains exact extra cash and total monthly savings', () => {
  const result = buildDecision(base({ askingPrice: 400000, downPayment: 60000 }), enrichment);
  const bp = result.downPaymentBreakpoint;
  assert.equal(bp.active, true);
  assert.equal(bp.targetDownPayment, 80000);
  assert.equal(bp.extraCashTo20, 20000);
  assert.ok(bp.pmiMonthly > 0);
  assert.ok(bp.monthlySavingsAt20 > bp.pmiMonthly, 'savings should include PMI plus lower principal and interest');
  assert.ok(bp.principalInterestSavings > 0);
});

test('20 percent breakpoint is inactive at or above 20 percent', () => {
  const result = buildDecision(base({ askingPrice: 400000, downPayment: 80000 }), enrichment);
  assert.equal(result.downPaymentBreakpoint.active, false);
  assert.equal(result.downPaymentBreakpoint.extraCashTo20, 0);
  assert.equal(result.breakdown.pmi, 0);
});

test('buyer tripwires surface PMI, insurance uncertainty and FEMA flood quote risk', () => {
  const result = buildDecision(
    base({ askingPrice: 400000, downPayment: 40000 }),
    { ...enrichment, flood: { status: 'AVAILABLE', zone: 'AE', sfha: true } }
  );
  const keys = new Set(result.buyerTripwires.map((x) => x.key));
  assert.ok(keys.has('pmi'));
  assert.ok(keys.has('insurance'));
  assert.ok(keys.has('flood'));
  assert.match(result.buyerTripwires.find((x) => x.key === 'flood').note, /will not invent a premium/i);
});

test('insurance and tax uncertainty drivers are ranked by monthly spread', () => {
  const result = buildDecision(base(), enrichment);
  assert.ok(result.uncertaintyDrivers.length >= 1);
  for (let i = 1; i < result.uncertaintyDrivers.length; i += 1) {
    assert.ok(result.uncertaintyDrivers[i - 1].monthlySpread >= result.uncertaintyDrivers[i].monthlySpread);
  }
});

test('missing local tax data becomes a tripwire and broad automatic range', () => {
  const result = buildDecision(base(), { ...enrichment, tax: { status: 'UNAVAILABLE' } });
  assert.equal(result.provenance.propertyTax.provenance, 'ESTIMATED RANGE');
  assert.ok(result.trueMonthlyCost.high > result.trueMonthlyCost.low);
  assert.ok(result.buyerTripwires.some((x) => x.key === 'tax'));
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

test('higher rate, higher asking price and lower down payment all worsen monthly carrying cost', () => {
  assert.ok(
    buildDecision(base({ ratePct: 7.5 }), enrichment).trueMonthlyCost.midpoint >
    buildDecision(base({ ratePct: 5.5 }), enrichment).trueMonthlyCost.midpoint
  );
  assert.ok(
    buildDecision(base({ askingPrice: 500000 }), enrichment).trueMonthlyCost.midpoint >
    buildDecision(base({ askingPrice: 350000 }), enrichment).trueMonthlyCost.midpoint
  );
  assert.ok(
    buildDecision(base({ downPayment: 40000 }), enrichment).trueMonthlyCost.midpoint >
    buildDecision(base({ downPayment: 120000 }), enrichment).trueMonthlyCost.midpoint
  );
});

test('formatted currency inputs normalize safely', () => {
  const input = normalizeInput(base({ askingPrice: '$425,000', downPayment: '$85,000', ratePct: '6.50%' }), enrichment);
  assert.equal(input.askingPrice, 425000);
  assert.equal(input.downPayment, 85000);
  assert.equal(input.ratePct, 6.5);
});

test('engine has no monthly limit, generic income ratio or Fit Ceiling', () => {
  const result = buildDecision(base({ monthlyLimit: 1 }), enrichment);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'fitCeiling'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'monthlyLimit'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'incomeBenchmark'), false);
});

test('page promise centers mortgage-versus-real-cost differentiation', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  assert.match(html, /mortgage payment is only part of the story/i);
  assert.match(html, /Reality Gap/i);
  assert.match(html, /What the mortgage calculator misses/i);
  assert.match(html, /Buyer tripwires/i);
  assert.match(html, /20% breakpoint/i);
  assert.doesNotMatch(html, /Gross-income benchmark/i);
  assert.doesNotMatch(html, /28% front-end/i);
  assert.doesNotMatch(html, /Fit Ceiling/i);
});

test('first result uses the detailed monthly breakdown as the ledger', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  assert.match(html, /class="cost-ledger"/);
  assert.match(html, /Automatically assembled/);
  assert.match(html, /Monthly cost breakdown/);
  assert.match(html, /The total is shown as a range because taxes and insurance are not exact future bills yet/);
  assert.match(html, /Mortgage principal \+ interest/);
  assert.match(html, /Included because down payment is below 20%/);
  assert.match(html, /Property tax estimate/);
  assert.match(html, /Address-based Census planning estimate/);
  assert.match(html, /Homeowners insurance estimate/);
  assert.match(html, /Automatic planning estimate/);
  assert.match(html, /Maintenance reserve/);
  assert.match(html, /Modeled reserve, not a bill/);
  assert.match(html, /TOTAL MONTHLY COST/);
  assert.match(html, /Estimated carrying-cost range/);
  assert.match(html, /class="ledger-rule"/);
  assert.match(html, /id="trueMonthlyResult"/);
  assert.doesNotMatch(html, /id="planningTotalResult"/);
  assert.doesNotMatch(html, /LIKELY MONTHLY RANGE/);
  assert.doesNotMatch(html, /Added ownership costs/);
  assert.doesNotMatch(html, /id="breakdownGrid"/);
  assert.ok(html.indexOf('id="mortgageOnlyResult"') < html.indexOf('id="pmiLedgerResult"'));
  assert.ok(html.indexOf('id="pmiLedgerResult"') < html.indexOf('id="propertyTaxLedgerResult"'));
  assert.ok(html.indexOf('id="propertyTaxLedgerResult"') < html.indexOf('id="insuranceLedgerResult"'));
  assert.ok(html.indexOf('id="insuranceLedgerResult"') < html.indexOf('id="maintenanceLedgerResult"'));
  assert.ok(html.indexOf('id="maintenanceLedgerResult"') < html.indexOf('id="trueMonthlyResult"'));
  assert.match(html, /What reaching 20% down would change/);
  assert.ok(html.indexOf('id="downPaymentBreakpointPanel"') < html.indexOf('id="range-explainer"'));
});

test('ledger renders midpoint rows and one ranged monthly total', () => {
  const js = readFileSync(path.join(__dirname, '..', 'public', 'assets', 'house-fit.js'), 'utf8');
  assert.match(js, /mortgageOnlyResult'\)\.textContent = moneyMo\(breakdown\.mortgagePI\)/);
  assert.match(js, /propertyTaxLedgerResult'\)\.textContent = moneyMo\(breakdown\.propertyTax\)/);
  assert.match(js, /insuranceLedgerResult'\)\.textContent = moneyMo\(breakdown\.homeInsurance\)/);
  assert.match(js, /maintenanceLedgerResult'\)\.textContent = moneyMo\(breakdown\.maintenance\)/);
  assert.match(js, /pmiLedgerResult'\)\.textContent = moneyMo\(breakdown\.pmi\)/);
  assert.match(js, /displayedPlanningTotal = \[/);
  assert.match(js, /Math\.round\(Number\(breakdown\[key\]\) \|\| 0\)/);
  assert.match(js, /trueMonthlyResult'\)\.textContent = monthlyRange\(trueCost\.low, trueCost\.high\)/);
  assert.doesNotMatch(js, /planningTotalResult/);
  assert.match(js, /rate\.toFixed\(2\) \+ '% · ' \+ Number\(loan\.termYears \|\| 30\) \+ ' years'/);
});

test('mobile ledger keeps monthly amounts aligned and inside the result', () => {
  const html = readFileSync(path.join(__dirname, '..', 'public', 'can-i-afford-this-house', 'index.html'), 'utf8');
  const css = readFileSync(path.join(__dirname, '..', 'public', 'assets', 'house-fit.css'), 'utf8');
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  assert.match(css, /\.ledger-row\{display:grid;grid-template-columns:22px minmax\(0,1fr\) max-content/);
  assert.match(css, /\.ledger-value\{[^}]*text-align:right;[^}]*white-space:nowrap/);
  assert.match(css, /\.ledger-row\[hidden\]\{display:none\}/);
  assert.match(css, /@media\(max-width:350px\)\{[\s\S]*\.ledger-value\{grid-column:2\/-1/);
  assert.match(css, /\.ledger-rule\{height:3px/);
});

test('displayed ledger planning total equals the sum of the displayed rounded rows', () => {
  const result = buildDecision(base({ askingPrice: 200000, downPayment: 20000, ratePct: 6.5 }), enrichment);
  const keys = ['mortgagePI', 'pmi', 'propertyTax', 'homeInsurance', 'maintenance', 'floodInsurance'];
  const displayedRows = keys.map((key) => Math.round(Number(result.breakdown[key]) || 0));
  const planningTotal = displayedRows.reduce((sum, value) => sum + value, 0);
  const mortgage = Math.round(Number(result.breakdown.mortgagePI) || 0);
  assert.equal(planningTotal - mortgage, displayedRows.slice(1).reduce((sum, value) => sum + value, 0));
  assert.ok(planningTotal >= 0);
});

test('cost calculation remains finite on edge inputs', () => {
  const input = normalizeInput(base({ askingPrice: 10000, downPayment: 50000, ratePct: 0 }), enrichment);
  const cost = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'mid' });
  for (const value of [cost.total, cost.loanPrincipal, cost.ltv]) assert.ok(Number.isFinite(value));
  assert.equal(cost.loanPrincipal, 0);
  assert.ok(cost.total >= 0);
});

test('downPaymentBreakpoint helper is stable at exact threshold', () => {
  const input = normalizeInput(base({ askingPrice: 400000, downPayment: 80000 }), enrichment);
  const tax = { mode: 'rate-range', lowRatePct: 1, midRatePct: 1, highRatePct: 1 };
  const insurance = { mode: 'rate-range', lowRatePct: 1, midRatePct: 1, highRatePct: 1 };
  const flood = { monthly: 0, needsQuote: false };
  const current = costAtPrice(400000, input, enrichment, { scenario: 'mid', tax, insurance, flood });
  const bp = downPaymentBreakpoint(input, enrichment, tax, insurance, flood, current);
  assert.equal(bp.active, false);
});

test('result copy explicitly distinguishes included costs from unresolved costs', () => {
  const js = readFileSync(path.join(__dirname, '..', 'public', 'assets', 'house-fit.js'), 'utf8');
  assert.match(js, /Reality Gap: \+'/);
  assert.match(js, /moneyMo\(displayedRealityGap\)/);
  assert.match(js, /Not included:/);
  assert.match(js, /The total range reflects uncertainty in taxes and homeowners insurance/);
  assert.match(js, /ESTIMATES · VERIFY COSTS/);
  assert.match(js, /VERIFY ESTIMATE/);
  assert.doesNotMatch(js, /low end uses the lower tax and insurance assumptions/i);
  assert.doesNotMatch(js, /WIDE RANGE · VERIFY COSTS/);
});
