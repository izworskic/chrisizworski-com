'use strict';

const DEFAULTS = Object.freeze({
  termYears: 30,
  ratePct: 6.5,
  maintenanceRatePct: 1,
  pmiRatePct: 0.6,
  pmiLtvThreshold: 0.80,
  taxFallbackRatePct: 1,
  taxFallbackLowPct: 0.3,
  taxFallbackHighPct: 2.5,
  taxModeledBandPct: 15,
  insuranceLowRatePct: 0.35,
  insuranceHighRatePct: 1.5,
  frontEndHousingRatioPct: 28,
  closingCostLowPct: 2,
  closingCostHighPct: 5,
});

const PROVENANCE = Object.freeze({
  USER: 'USER PROVIDED',
  GOVERNMENT: 'GOVERNMENT SOURCED',
  MODELED: 'MODELED',
  ESTIMATED_RANGE: 'ESTIMATED RANGE',
  NEEDS_QUOTE: 'NEEDS QUOTE',
  NOT_AVAILABLE: 'NOT AUTOMATICALLY AVAILABLE',
});

function finiteNumber(value, fallback = 0) {
  const cleaned = typeof value === 'string' ? value.replace(/[$,%\s,]/g, '') : value;
  const n = typeof cleaned === 'number' ? cleaned : Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function mortgagePI(principal, annualRatePct, termYears = DEFAULTS.termYears) {
  const p = Math.max(0, finiteNumber(principal));
  const years = clamp(finiteNumber(termYears, DEFAULTS.termYears), 1, 50);
  const months = Math.round(years * 12);
  if (!p) return 0;
  const r = Math.max(0, finiteNumber(annualRatePct)) / 100 / 12;
  if (!r) return p / months;
  const factor = Math.pow(1 + r, months);
  return p * (r * factor) / (factor - 1);
}

function normalizeInput(raw = {}, enrichment = {}) {
  return {
    askingPrice: Math.max(0, finiteNumber(raw.askingPrice)),
    downPayment: Math.max(0, finiteNumber(raw.downPayment)),
    ratePct: clamp(
      raw.ratePct === '' || raw.ratePct == null
        ? finiteNumber(enrichment.mortgageRate?.ratePct, DEFAULTS.ratePct)
        : finiteNumber(raw.ratePct, DEFAULTS.ratePct),
      0,
      25
    ),
    termYears: DEFAULTS.termYears,
    maintenanceRatePct: DEFAULTS.maintenanceRatePct,
    pmiRatePct: DEFAULTS.pmiRatePct,
  };
}

function taxAssumption(enrichment = {}) {
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
      label: 'Census ACS county tax planning rate (' + center.toFixed(2) + '%)',
      note: 'Estimated from Census county medians. This is not a parcel tax bill and post-sale reassessment can differ.',
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
    note: 'Local Census tax data was unavailable, so the result uses a broad planning range.',
  };
}

function insuranceAssumption() {
  return {
    mode: 'rate-range',
    lowRatePct: DEFAULTS.insuranceLowRatePct,
    midRatePct: (DEFAULTS.insuranceLowRatePct + DEFAULTS.insuranceHighRatePct) / 2,
    highRatePct: DEFAULTS.insuranceHighRatePct,
    provenance: PROVENANCE.ESTIMATED_RANGE,
    label: 'Homeowners-insurance planning range',
    note: 'Automatically modeled as a deliberately broad planning range because a dependable free public quote API is not available.',
  };
}

function floodAssumption(enrichment = {}) {
  const sfha = enrichment.flood?.sfha === true;
  return {
    monthly: 0,
    provenance: sfha ? PROVENANCE.NEEDS_QUOTE : PROVENANCE.MODELED,
    label: sfha
      ? 'FEMA maps this point in a Special Flood Hazard Area; an actual flood premium is not included.'
      : 'No flood premium is added unless FEMA context indicates a special hazard requiring a separate quote.',
    needsQuote: sfha,
  };
}

function monthlyByPrice(price, assumption, scenario) {
  const key = scenario === 'low' ? 'lowRatePct' : scenario === 'high' ? 'highRatePct' : 'midRatePct';
  return Math.max(0, price) * (assumption[key] / 100) / 12;
}

function costAtPrice(price, input, enrichment = {}, options = {}) {
  const scenario = options.scenario || 'mid';
  const tax = options.tax || taxAssumption(enrichment);
  const insurance = options.insurance || insuranceAssumption();
  const flood = options.flood || floodAssumption(enrichment);
  const purchasePrice = Math.max(0, finiteNumber(price));
  const downPayment = Math.min(input.downPayment, purchasePrice);
  const loanPrincipal = Math.max(0, purchasePrice - downPayment);
  const ltv = purchasePrice > 0 ? loanPrincipal / purchasePrice : 0;
  const mortgage = mortgagePI(loanPrincipal, input.ratePct, input.termYears);
  const pmi = ltv > DEFAULTS.pmiLtvThreshold
    ? loanPrincipal * (input.pmiRatePct / 100) / 12
    : 0;
  const propertyTax = monthlyByPrice(purchasePrice, tax, scenario);
  const homeInsurance = monthlyByPrice(purchasePrice, insurance, scenario);
  const maintenance = purchasePrice * (input.maintenanceRatePct / 100) / 12;
  const floodInsurance = flood.monthly;
  return {
    total: mortgage + pmi + propertyTax + homeInsurance + maintenance + floodInsurance,
    components: { mortgagePI: mortgage, pmi, propertyTax, homeInsurance, maintenance, floodInsurance },
    loanPrincipal,
    ltv,
    downPayment,
    tax,
    insurance,
    flood,
  };
}

function roundMoney(value, step = 100) {
  return Math.max(0, Math.round(finiteNumber(value) / step) * step);
}

function confidence(enrichment, tax, flood) {
  let score = 0;
  const limitations = [];
  if (enrichment.address?.matched) score += 1;
  else limitations.push('address match');
  if (tax.provenance === PROVENANCE.GOVERNMENT) score += 1;
  else limitations.push('local tax estimate');
  if (enrichment.flood?.status === 'AVAILABLE') score += 1;
  else limitations.push('FEMA flood context');
  limitations.push('insurance is a modeled range');
  limitations.push('HOA and utilities are not available from a dependable nationwide free public source');
  if (flood.needsQuote) limitations.push('flood-insurance premium is not priced');
  return {
    label: flood.needsQuote ? 'Limited by flood premium' : score >= 3 ? 'Good planning estimate' : score >= 2 ? 'Moderate planning estimate' : 'Broad planning estimate',
    limitations,
  };
}

function incomeBenchmark(trueMonthlyCost) {
  const ratio = DEFAULTS.frontEndHousingRatioPct / 100;
  const annual = (monthly) => roundMoney((monthly / ratio) * 12, 1000);
  return {
    housingRatioPct: DEFAULTS.frontEndHousingRatioPct,
    annualLow: annual(trueMonthlyCost.low),
    annualMidpoint: annual(trueMonthlyCost.midpoint),
    annualHigh: annual(trueMonthlyCost.high),
    note: 'Gross-income benchmark only: housing cost divided by a 28% front-end housing ratio. It does not include your other debts and is not lender underwriting.',
  };
}

function cashToClose(input) {
  const price = input.askingPrice;
  const down = Math.min(input.downPayment, price);
  const closingLow = price * DEFAULTS.closingCostLowPct / 100;
  const closingHigh = price * DEFAULTS.closingCostHighPct / 100;
  return {
    downPayment: down,
    closingCostLow: roundMoney(closingLow, 500),
    closingCostHigh: roundMoney(closingHigh, 500),
    totalLow: roundMoney(down + closingLow, 500),
    totalHigh: roundMoney(down + closingHigh, 500),
    note: 'Planning range for buyer closing costs only. Prepaids, seller credits and local transaction details can change cash needed.',
  };
}

function buildDecision(rawInput = {}, enrichment = {}) {
  const input = normalizeInput(rawInput, enrichment);
  const tax = taxAssumption(enrichment);
  const insurance = insuranceAssumption();
  const flood = floodAssumption(enrichment);
  const low = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'low', tax, insurance, flood });
  const midpoint = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'mid', tax, insurance, flood });
  const high = costAtPrice(input.askingPrice, input, enrichment, { scenario: 'high', tax, insurance, flood });
  const trueMonthlyCost = { low: low.total, midpoint: midpoint.total, high: high.total };
  const confidenceState = confidence(enrichment, tax, flood);
  const unpricedCosts = [
    {
      key: 'hoa',
      label: 'HOA / condo dues',
      status: PROVENANCE.NOT_AVAILABLE,
      note: 'No dependable nationwide free public source is available from an address alone, so HOA dues are not silently assumed to be $0.',
    },
    {
      key: 'utilities',
      label: 'Utilities',
      status: PROVENANCE.NOT_AVAILABLE,
      note: 'Usage, provider and building efficiency vary too much to create a credible property-specific number from the four inputs alone.',
    },
  ];
  if (flood.needsQuote) {
    unpricedCosts.unshift({
      key: 'flood-insurance',
      label: 'Flood insurance premium',
      status: PROVENANCE.NEEDS_QUOTE,
      note: 'FEMA identifies hazard, not the premium. The monthly range shown is before any required flood-insurance premium.',
    });
  }

  return {
    input,
    askingPrice: input.askingPrice,
    trueMonthlyCost,
    loan: {
      principal: midpoint.loanPrincipal,
      ltvPct: midpoint.ltv * 100,
      downPaymentPct: input.askingPrice > 0 ? midpoint.downPayment / input.askingPrice * 100 : 0,
      termYears: input.termYears,
    },
    breakdown: midpoint.components,
    cashToClose: cashToClose(input),
    incomeBenchmark: incomeBenchmark(trueMonthlyCost),
    confidence: confidenceState,
    unpricedCosts,
    provenance: {
      mortgageRate: PROVENANCE.USER,
      propertyTax: tax,
      homeInsurance: insurance,
      floodInsurance: flood,
      maintenance: {
        provenance: PROVENANCE.MODELED,
        ratePct: input.maintenanceRatePct,
        note: 'Automatic maintenance reserve modeled at 1% of purchase price per year; this is a reserve assumption, not a bill.',
      },
      pmi: {
        provenance: PROVENANCE.MODELED,
        annualRatePct: input.pmiRatePct,
        thresholdLtv: DEFAULTS.pmiLtvThreshold,
        note: midpoint.components.pmi > 0 ? 'PMI is modeled because the loan-to-value ratio exceeds 80%.' : 'No PMI is modeled because the loan-to-value ratio is 80% or lower.',
      },
    },
    enrichment: {
      address: enrichment.address || null,
      flood: enrichment.flood || null,
      tax: enrichment.tax || null,
    },
    assumptions: {
      termYears: DEFAULTS.termYears,
      insurancePlanningRangePct: [DEFAULTS.insuranceLowRatePct, DEFAULTS.insuranceHighRatePct],
      maintenanceRatePct: DEFAULTS.maintenanceRatePct,
      pmiRatePct: DEFAULTS.pmiRatePct,
      pmiLtvThreshold: DEFAULTS.pmiLtvThreshold,
      closingCostPlanningRangePct: [DEFAULTS.closingCostLowPct, DEFAULTS.closingCostHighPct],
      frontEndHousingRatioPct: DEFAULTS.frontEndHousingRatioPct,
    },
  };
}

module.exports = {
  DEFAULTS,
  PROVENANCE,
  mortgagePI,
  normalizeInput,
  taxAssumption,
  insuranceAssumption,
  floodAssumption,
  costAtPrice,
  buildDecision,
};
