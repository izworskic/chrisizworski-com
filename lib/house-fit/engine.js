'use strict';

const DEFAULTS = Object.freeze({
  termYears: 30,
  ratePct: 6.5,
  maintenanceRatePct: 1,
  pmiRatePct: 0.6,
  pmiLtvThreshold: 0.80,
  taxFallbackRatePct: 1,
  taxFallbackLowPct: 0.5,
  taxFallbackHighPct: 1.5,
  taxModeledBandPct: 15,
  insuranceLowRatePct: 0.4,
  insuranceHighRatePct: 0.9,
  maxSolvePrice: 10_000_000,
});

const PROVENANCE = Object.freeze({
  USER: 'VERIFIED / USER PROVIDED',
  GOVERNMENT: 'GOVERNMENT SOURCED',
  MODELED: 'MODELED',
  ESTIMATED_RANGE: 'ESTIMATED RANGE',
  NEEDS_QUOTE: 'NEEDS QUOTE',
});

function finiteNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function mortgagePI(principal, annualRatePct, termYears) {
  const p = Math.max(0, finiteNumber(principal));
  const years = clamp(finiteNumber(termYears, DEFAULTS.termYears), 1, 50);
  const months = Math.round(years * 12);
  if (!p) return 0;
  const r = Math.max(0, finiteNumber(annualRatePct)) / 100 / 12;
  if (!r) return p / months;
  const factor = Math.pow(1 + r, months);
  return p * (r * factor) / (factor - 1);
}

function nullableMoney(value) {
  if (value === '' || value == null) return null;
  return Math.max(0, finiteNumber(value));
}

function normalizeInput(raw = {}, enrichment = {}) {
  return {
    askingPrice: Math.max(0, finiteNumber(raw.askingPrice)),
    monthlyLimit: Math.max(0, finiteNumber(raw.monthlyLimit)),
    downPayment: Math.max(0, finiteNumber(raw.downPayment)),
    ratePct: clamp(finiteNumber(raw.ratePct, enrichment.mortgageRate?.ratePct ?? DEFAULTS.ratePct), 0, 25),
    termYears: clamp(finiteNumber(raw.termYears, DEFAULTS.termYears), 1, 50),
    hoaMonthly: Math.max(0, finiteNumber(raw.hoaMonthly)),
    propertyTaxAnnual: nullableMoney(raw.propertyTaxAnnual),
    homeInsuranceAnnual: nullableMoney(raw.homeInsuranceAnnual),
    floodInsuranceAnnual: nullableMoney(raw.floodInsuranceAnnual),
    maintenanceRatePct: clamp(finiteNumber(raw.maintenanceRatePct, DEFAULTS.maintenanceRatePct), 0, 10),
    pmiRatePct: clamp(finiteNumber(raw.pmiRatePct, DEFAULTS.pmiRatePct), 0, 5),
    commuteEnabled: raw.includeCommute === true || raw.includeCommute === 'true' || raw.includeCommute === 'on',
    commuteOneWayMiles: Math.max(0, finiteNumber(raw.commuteOneWayMiles)),
    commuteDaysPerWeek: clamp(finiteNumber(raw.commuteDaysPerWeek, 5), 0, 7),
    commuteMpg: clamp(finiteNumber(raw.commuteMpg, 25), 1, 200),
    gasPrice: clamp(finiteNumber(raw.gasPrice, 3.5), 0, 20),
    commuteOneWayMinutes: Math.max(0, finiteNumber(raw.commuteOneWayMinutes)),
  };
}

function taxAssumption(input, enrichment = {}) {
  if (input.propertyTaxAnnual != null) return {
    mode: 'fixed', annual: input.propertyTaxAnnual, provenance: PROVENANCE.USER,
    label: 'Listing/current tax entered by you',
    note: 'Current tax is used as a planning figure. A sale or reassessment can change future tax.',
  };
  const effective = finiteNumber(enrichment.tax?.effectiveRatePct, NaN);
  if (Number.isFinite(effective) && effective > 0) {
    const center = clamp(effective, 0.2, 4);
    const band = DEFAULTS.taxModeledBandPct / 100;
    return {
      mode: 'rate-range',
      lowRatePct: clamp(center * (1 - band), 0.1, 5),
      midRatePct: center,
      highRatePct: clamp(center * (1 + band), 0.1, 5),
      provenance: PROVENANCE.GOVERNMENT,
      label: 'ACS county planning rate (' + center.toFixed(2) + '%)',
      note: 'Modeled from Census ACS median real-estate tax divided by median owner-occupied home value; this is not a parcel tax bill.',
      sourceDate: enrichment.tax?.sourceDate || null,
      geography: enrichment.tax?.geography || null,
    };
  }
  return {
    mode: 'rate-range',
    lowRatePct: DEFAULTS.taxFallbackLowPct,
    midRatePct: DEFAULTS.taxFallbackRatePct,
    highRatePct: DEFAULTS.taxFallbackHighPct,
    provenance: PROVENANCE.ESTIMATED_RANGE,
    label: 'Broad tax planning range',
    note: 'Local tax data was unavailable. Enter the annual tax shown on the listing to materially improve this result.',
  };
}

function insuranceAssumption(input) {
  if (input.homeInsuranceAnnual != null) return {
    mode: 'fixed', annual: input.homeInsuranceAnnual, provenance: PROVENANCE.USER,
    label: 'Insurance quote entered by you', note: 'Uses your annual homeowners-insurance figure.',
  };
  return {
    mode: 'rate-range',
    lowRatePct: DEFAULTS.insuranceLowRatePct,
    midRatePct: (DEFAULTS.insuranceLowRatePct + DEFAULTS.insuranceHighRatePct) / 2,
    highRatePct: DEFAULTS.insuranceHighRatePct,
    provenance: PROVENANCE.ESTIMATED_RANGE,
    label: 'Homeowners-insurance planning range',
    note: 'This is a deliberately broad planning assumption, not an insurance quote. Enter a real quote to tighten the Fit Ceiling.',
  };
}

function floodAssumption(input, enrichment = {}) {
  const sfha = enrichment.flood?.sfha === true;
  if (input.floodInsuranceAnnual != null) return {
    monthly: input.floodInsuranceAnnual / 12,
    provenance: PROVENANCE.USER,
    label: 'Flood-insurance quote entered by you',
    needsQuote: false,
  };
  return {
    monthly: 0,
    provenance: sfha ? PROVENANCE.NEEDS_QUOTE : PROVENANCE.MODELED,
    label: sfha ? 'Potential lender-required flood insurance not priced' : 'No flood premium included without a quote',
    needsQuote: sfha,
  };
}

function monthlyByPrice(price, assumption, scenario) {
  if (assumption.mode === 'fixed') return assumption.annual / 12;
  const key = scenario === 'low' ? 'lowRatePct' : scenario === 'high' ? 'highRatePct' : 'midRatePct';
  return price * (assumption[key] / 100) / 12;
}

function commuteCost(input) {
  if (!input.commuteEnabled || input.commuteOneWayMiles <= 0 || input.commuteDaysPerWeek <= 0) {
    return { monthlyMiles: 0, monthlyFuel: 0, monthlyHours: 0 };
  }
  const monthlyMiles = input.commuteOneWayMiles * 2 * input.commuteDaysPerWeek * 52 / 12;
  return {
    monthlyMiles,
    monthlyFuel: (monthlyMiles / input.commuteMpg) * input.gasPrice,
    monthlyHours: input.commuteOneWayMinutes > 0
      ? input.commuteOneWayMinutes * 2 * input.commuteDaysPerWeek * 52 / 12 / 60
      : 0,
  };
}

function costAtPrice(price, input, enrichment = {}, options = {}) {
  const scenario = options.scenario || 'mid';
  const tax = options.tax || taxAssumption(input, enrichment);
  const insurance = options.insurance || insuranceAssumption(input);
  const flood = options.flood || floodAssumption(input, enrichment);
  const commute = options.commute || commuteCost(input);
  const disabled = new Set(options.disable || []);
  const purchasePrice = Math.max(0, finiteNumber(price));
  const loanPrincipal = Math.max(0, purchasePrice - input.downPayment);
  const ltv = purchasePrice > 0 ? loanPrincipal / purchasePrice : 0;
  const pi = disabled.has('mortgage') ? 0 : mortgagePI(loanPrincipal, input.ratePct, input.termYears);
  const pmi = !disabled.has('pmi') && ltv > DEFAULTS.pmiLtvThreshold
    ? loanPrincipal * (input.pmiRatePct / 100) / 12 : 0;
  const propertyTax = disabled.has('tax') ? 0 : monthlyByPrice(purchasePrice, tax, scenario);
  const homeInsurance = disabled.has('insurance') ? 0 : monthlyByPrice(purchasePrice, insurance, scenario);
  const floodInsurance = disabled.has('flood') ? 0 : flood.monthly;
  const hoa = disabled.has('hoa') ? 0 : input.hoaMonthly;
  const maintenance = disabled.has('maintenance') ? 0 : purchasePrice * (input.maintenanceRatePct / 100) / 12;
  const commuteMonthly = disabled.has('commute') ? 0 : commute.monthlyFuel;
  return {
    total: pi + pmi + propertyTax + homeInsurance + floodInsurance + hoa + maintenance + commuteMonthly,
    components: { mortgagePI: pi, pmi, propertyTax, homeInsurance, floodInsurance, hoa, maintenance, commute: commuteMonthly },
    loanPrincipal, ltv, tax, insurance, flood, commute,
  };
}

function solveFitCeiling(input, enrichment = {}, options = {}) {
  const limit = Math.max(0, input.monthlyLimit);
  if (!limit) return 0;
  let low = 0;
  let high = Math.max(100000, input.askingPrice || 0, input.downPayment + 50000);
  const cap = options.maxPrice || DEFAULTS.maxSolvePrice;
  while (high < cap && costAtPrice(high, input, enrichment, options).total <= limit) {
    high = Math.min(cap, high * 2);
    if (high === cap) break;
  }
  if (costAtPrice(high, input, enrichment, options).total <= limit) return high;
  for (let i = 0; i < 70; i += 1) {
    const mid = (low + high) / 2;
    if (costAtPrice(mid, input, enrichment, options).total <= limit) low = mid;
    else high = mid;
  }
  return low;
}

function roundedPrice(value) { return Math.max(0, Math.round(value / 5000) * 5000); }

function confidence(input, enrichment, tax, flood) {
  let score = 0;
  const missing = [];
  if (input.propertyTaxAnnual != null) score += 2;
  else if (tax.provenance === PROVENANCE.GOVERNMENT) score += 1;
  else missing.push('actual property tax');
  if (input.homeInsuranceAnnual != null) score += 2;
  else missing.push('homeowners-insurance quote');
  if (enrichment.address?.matched) score += 1;
  if (flood.needsQuote) missing.push('flood-insurance quote');
  else if (enrichment.flood?.status === 'AVAILABLE') score += 1;
  return { label: flood.needsQuote ? 'Low' : score >= 5 ? 'High' : score >= 3 ? 'Medium' : 'Low', missing };
}

function factorEffects(input, enrichment, fitMid) {
  const base = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'mid' });
  const factors = [
    ['tax', 'Property taxes', base.components.propertyTax],
    ['insurance', 'Homeowners insurance', base.components.homeInsurance],
    ['flood', 'Flood insurance', base.components.floodInsurance],
    ['hoa', 'HOA', base.components.hoa],
    ['maintenance', 'Maintenance reserve', base.components.maintenance],
    ['commute', 'Commute', base.components.commute],
    ['pmi', 'PMI', base.components.pmi],
  ];
  return factors.filter((row) => row[2] > 0.01).map((row) => {
    const without = solveFitCeiling(input, enrichment, { scenario: 'mid', disable: [row[0]] });
    return { key: row[0], label: row[1], monthlyEffect: row[2], fitCeilingEffect: Math.max(0, without - fitMid) };
  });
}

function buildSensitivity(input, enrichment, fitMid) {
  const scenarios = [];
  const add = (key, label, changed) => {
    const ceiling = solveFitCeiling(changed, enrichment, { scenario: 'mid' });
    scenarios.push({ key, label, ceiling, delta: ceiling - fitMid });
  };
  add('rate-down-1', 'Rate −1%', { ...input, ratePct: Math.max(0, input.ratePct - 1) });
  add('down-plus-20', '+$20K down', { ...input, downPayment: input.downPayment + 20000 });
  add('limit-plus-250', 'Monthly limit +$250', { ...input, monthlyLimit: input.monthlyLimit + 250 });
  if (input.commuteEnabled && input.commuteOneWayMiles > 0) add('no-commute', 'Remove commute', { ...input, commuteEnabled: false });
  const ins = insuranceAssumption(input);
  const monthlyIns = ins.mode === 'fixed' ? ins.annual / 12 : monthlyByPrice(input.askingPrice || Math.max(fitMid, 1), ins, 'mid');
  add('insurance-plus-100', 'Insurance +$100/mo', { ...input, homeInsuranceAnnual: (monthlyIns + 100) * 12 });
  if (input.propertyTaxAnnual != null) add('tax-minus-15', 'Tax −15%', { ...input, propertyTaxAnnual: input.propertyTaxAnnual * 0.85 });
  return scenarios;
}

function buildVerdict(input, range, confidenceState) {
  if (confidenceState.label === 'Low' && confidenceState.missing.includes('flood-insurance quote')) return {
    state: 'NEEDS_BETTER_INPUTS', label: 'NEEDS BETTER INPUTS',
    explanation: 'This property is in a FEMA Special Flood Hazard Area and no flood-insurance quote is included yet.',
  };
  if (input.askingPrice <= range.low) return {
    state: 'FITS', label: 'FITS',
    explanation: 'The asking price is inside even the conservative end of your Fit Ceiling range.',
  };
  if (input.askingPrice <= range.high * 1.02) return {
    state: 'CLOSE', label: 'CLOSE',
    explanation: 'The asking price is near or inside the uncertainty band. Better tax and insurance inputs could change the answer.',
  };
  return {
    state: 'DOESNT_FIT', label: "DOESN'T FIT AT THIS PRICE",
    explanation: 'The asking price is above the top of your current Fit Ceiling range.',
  };
}

function buildDecision(rawInput = {}, enrichment = {}) {
  const input = normalizeInput(rawInput, enrichment);
  const tax = taxAssumption(input, enrichment);
  const insurance = insuranceAssumption(input);
  const flood = floodAssumption(input, enrichment);
  const askLow = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'low', tax, insurance, flood });
  const askMid = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'mid', tax, insurance, flood });
  const askHigh = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'high', tax, insurance, flood });
  const optimistic = solveFitCeiling(input, enrichment, { scenario: 'low', tax, insurance, flood });
  const midpoint = solveFitCeiling(input, enrichment, { scenario: 'mid', tax, insurance, flood });
  const conservative = solveFitCeiling(input, enrichment, { scenario: 'high', tax, insurance, flood });
  const range = {
    low: roundedPrice(Math.min(conservative, optimistic)),
    high: roundedPrice(Math.max(conservative, optimistic)),
    midpoint: roundedPrice(midpoint),
    rawLow: Math.min(conservative, optimistic),
    rawHigh: Math.max(conservative, optimistic),
    rawMidpoint: midpoint,
  };
  const confidenceState = confidence(input, enrichment, tax, flood);
  return {
    input,
    askingPrice: input.askingPrice,
    monthlyLimit: input.monthlyLimit,
    trueMonthlyCost: { low: askLow.total, midpoint: askMid.total, high: askHigh.total },
    fitCeiling: range,
    verdict: buildVerdict(input, range, confidenceState),
    confidence: confidenceState,
    breakdown: askMid.components,
    whyCeilingMoved: factorEffects(input, enrichment, midpoint),
    sensitivity: buildSensitivity(input, enrichment, midpoint),
    provenance: {
      mortgageRate: rawInput.ratePct != null && rawInput.ratePct !== '' ? PROVENANCE.USER : (enrichment.mortgageRate?.provenance || PROVENANCE.GOVERNMENT),
      propertyTax: tax,
      homeInsurance: insurance,
      floodInsurance: flood,
      maintenance: { provenance: PROVENANCE.MODELED, ratePct: input.maintenanceRatePct, note: 'A planning reserve, not a bill.' },
      pmi: { provenance: PROVENANCE.MODELED, annualRatePct: input.pmiRatePct, thresholdLtv: DEFAULTS.pmiLtvThreshold },
      commute: { provenance: input.commuteEnabled ? PROVENANCE.USER : PROVENANCE.MODELED, ...commuteCost(input) },
    },
    enrichment: {
      address: enrichment.address || null,
      flood: enrichment.flood || null,
      tax: enrichment.tax || null,
      mortgageRate: enrichment.mortgageRate || null,
    },
    assumptions: {
      insurancePlanningRangePct: [DEFAULTS.insuranceLowRatePct, DEFAULTS.insuranceHighRatePct],
      maintenanceRatePct: input.maintenanceRatePct,
      pmiRatePct: input.pmiRatePct,
      pmiLtvThreshold: DEFAULTS.pmiLtvThreshold,
    },
  };
}

module.exports = { DEFAULTS, PROVENANCE, mortgagePI, normalizeInput, taxAssumption, insuranceAssumption, floodAssumption, commuteCost, costAtPrice, solveFitCeiling, buildDecision };
