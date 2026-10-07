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

function realityGap(low, midpoint, high) {
  const mortgage = midpoint.components.mortgagePI;
  const gapLow = Math.max(0, low.total - mortgage);
  const gapMid = Math.max(0, midpoint.total - mortgage);
  const gapHigh = Math.max(0, high.total - mortgage);
  return {
    mortgageOnlyMonthly: mortgage,
    monthlyLow: gapLow,
    monthlyMidpoint: gapMid,
    monthlyHigh: gapHigh,
    annualMidpoint: gapMid * 12,
    nonMortgageSharePct: midpoint.total > 0 ? gapMid / midpoint.total * 100 : 0,
    note: 'The Reality Gap is the estimated monthly cost above mortgage principal and interest: PMI, taxes, insurance, maintenance and any priced flood premium.',
  };
}

function uncertaintyDrivers(low, high) {
  const candidates = [
    {
      key: 'insurance',
      label: 'Homeowners insurance estimate',
      monthlySpread: Math.max(0, high.components.homeInsurance - low.components.homeInsurance),
    },
    {
      key: 'tax',
      label: 'Property tax estimate',
      monthlySpread: Math.max(0, high.components.propertyTax - low.components.propertyTax),
    },
  ];
  return candidates.filter((x) => x.monthlySpread > 1).sort((a, b) => b.monthlySpread - a.monthlySpread);
}

function downPaymentBreakpoint(input, enrichment, tax, insurance, flood, currentMidpoint) {
  const target = input.askingPrice * 0.20;
  const down = Math.min(input.downPayment, input.askingPrice);
  if (!(input.askingPrice > 0) || down >= target) {
    return {
      active: false,
      targetDownPayment: target,
      extraCashTo20: 0,
      pmiMonthly: currentMidpoint.components.pmi,
      monthlySavingsAt20: 0,
      note: 'At least 20% is already down, so this model does not include PMI.',
    };
  }

  const at20Input = { ...input, downPayment: target };
  const at20 = costAtPrice(input.askingPrice, at20Input, enrichment, { scenario: 'mid', tax, insurance, flood });
  return {
    active: true,
    targetDownPayment: target,
    extraCashTo20: Math.max(0, target - down),
    pmiMonthly: currentMidpoint.components.pmi,
    principalInterestSavings: Math.max(0, currentMidpoint.components.mortgagePI - at20.components.mortgagePI),
    monthlySavingsAt20: Math.max(0, currentMidpoint.total - at20.total),
    currentDownPaymentPct: input.askingPrice > 0 ? down / input.askingPrice * 100 : 0,
    note: 'This is a conventional-loan planning comparison. Actual mortgage-insurance requirements and pricing vary by loan program, lender, credit profile and loan terms.',
  };
}

function buyerTripwires({ input, tax, insurance, flood, midpoint, breakpoint, low, high }) {
  const tripwires = [];

  if (breakpoint.active) {
    tripwires.push({
      key: 'pmi',
      level: 'WATCH',
      label: 'Below the 20% down-payment breakpoint',
      monthlyEffect: midpoint.components.pmi,
      note: 'Modeled PMI is included. About $' + Math.round(breakpoint.extraCashTo20).toLocaleString('en-US') + ' more down reaches 20% in this model.',
    });
  }

  if (flood.needsQuote) {
    tripwires.push({
      key: 'flood',
      level: 'VERIFY',
      label: 'Flood premium is missing from the total',
      monthlyEffect: null,
      note: 'FEMA places this point in a Special Flood Hazard Area. The tool will not invent a premium; obtain a real flood-insurance quote before relying on the monthly total.',
    });
  }

  if (tax.provenance !== PROVENANCE.GOVERNMENT) {
    tripwires.push({
      key: 'tax',
      level: 'VERIFY',
      label: 'Local property-tax data did not resolve',
      monthlyEffect: Math.max(0, high.components.propertyTax - low.components.propertyTax),
      note: 'The result is using a broad tax range instead of a county planning rate.',
    });
  }

  tripwires.push({
    key: 'insurance',
    level: 'ESTIMATE',
    label: 'Homeowners insurance is still a planning estimate',
    monthlyEffect: Math.max(0, high.components.homeInsurance - low.components.homeInsurance),
    note: 'A real carrier quote can move the true monthly cost materially. The model keeps that uncertainty visible instead of hiding it.',
  });

  return tripwires;
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
  const breakpoint = downPaymentBreakpoint(input, enrichment, tax, insurance, flood, midpoint);
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
      note: 'Usage, provider and building efficiency vary too much to create a credible property-specific number from the three first-run inputs alone.',
    },
  ];
  if (flood.needsQuote) {
    unpricedCosts.unshift({
      key: 'flood-insurance',
      label: 'Flood insurance premium',
      status: PROVENANCE.NEEDS_QUOTE,
      note: 'FEMA identifies hazard, not the property-specific premium. The monthly range shown is before any required flood-insurance premium.',
    });
  }

  return {
    input,
    askingPrice: input.askingPrice,
    trueMonthlyCost,
    realityGap: realityGap(low, midpoint, high),
    uncertaintyDrivers: uncertaintyDrivers(low, high),
    downPaymentBreakpoint: breakpoint,
    buyerTripwires: buyerTripwires({ input, tax, insurance, flood, midpoint, breakpoint, low, high }),
    loan: {
      principal: midpoint.loanPrincipal,
      ltvPct: midpoint.ltv * 100,
      downPaymentPct: input.askingPrice > 0 ? midpoint.downPayment / input.askingPrice * 100 : 0,
      termYears: input.termYears,
    },
    breakdown: midpoint.components,
    breakdownRange: {
      mortgagePI: { low: low.components.mortgagePI, midpoint: midpoint.components.mortgagePI, high: high.components.mortgagePI },
      pmi: { low: low.components.pmi, midpoint: midpoint.components.pmi, high: high.components.pmi },
      propertyTax: { low: low.components.propertyTax, midpoint: midpoint.components.propertyTax, high: high.components.propertyTax },
      homeInsurance: { low: low.components.homeInsurance, midpoint: midpoint.components.homeInsurance, high: high.components.homeInsurance },
      maintenance: { low: low.components.maintenance, midpoint: midpoint.components.maintenance, high: high.components.maintenance },
      floodInsurance: { low: low.components.floodInsurance, midpoint: midpoint.components.floodInsurance, high: high.components.floodInsurance },
    },
    cashToClose: cashToClose(input),
    confidence: confidenceState,
    unpricedCosts,
    provenance: {
      mortgageRate: rawInput.ratePct === '' || rawInput.ratePct == null
        ? (enrichment.mortgageRate?.provenance || PROVENANCE.GOVERNMENT)
        : PROVENANCE.USER,
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
        note: midpoint.components.pmi > 0
          ? 'Modeled PMI is included because the loan-to-value ratio exceeds 80%. Conventional borrowers below 20% down typically pay mortgage insurance, but actual requirements vary.'
          : 'No PMI is modeled because the loan-to-value ratio is 80% or lower.',
      },
    },
    enrichment: {
      address: enrichment.address || null,
      flood: enrichment.flood || null,
      tax: enrichment.tax || null,
      mortgageRate: enrichment.mortgageRate || null,
    },
    assumptions: {
      termYears: DEFAULTS.termYears,
      insurancePlanningRangePct: [DEFAULTS.insuranceLowRatePct, DEFAULTS.insuranceHighRatePct],
      maintenanceRatePct: DEFAULTS.maintenanceRatePct,
      pmiRatePct: DEFAULTS.pmiRatePct,
      pmiLtvThreshold: DEFAULTS.pmiLtvThreshold,
      closingCostPlanningRangePct: [DEFAULTS.closingCostLowPct, DEFAULTS.closingCostHighPct],
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
  realityGap,
  downPaymentBreakpoint,
  buyerTripwires,
  buildDecision,
};
