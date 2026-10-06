(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const form = $('houseFitForm');
  const result = $('result');
  const status = $('formStatus');
  let rateTouched = false;

  const money0 = (n) => Number.isFinite(Number(n))
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n))
    : '—';

  const moneyMo = (n) => money0(n) + '/mo';

  const monthlyRange = (a, b) => {
    const low = Number(a), high = Number(b);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
    if (Math.abs(high - low) < 5) return moneyMo((low + high) / 2);
    return money0(low) + '–' + money0(high) + '/mo';
  };

  const moneyRange = (a, b) => {
    const low = Number(a), high = Number(b);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
    if (Math.abs(high - low) < 500) return money0((low + high) / 2);
    return money0(low) + '–' + money0(high);
  };

  function track(name) {
    if (typeof window.gtag === 'function') window.gtag('event', name, { tool_id: 'house-fit', transport_type: 'beacon' });
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('event', { name, data: { tool: 'house-fit' } });
  }

  function valueOf(name) {
    return form.elements[name] ? form.elements[name].value : '';
  }

  function buildPayload() {
    return {
      address: valueOf('address').trim(),
      askingPrice: Number(valueOf('askingPrice')),
      downPayment: Number(valueOf('downPayment')),
      ratePct: Number(valueOf('ratePct')),
    };
  }

  function costItem(label, value, note) {
    const div = document.createElement('div');
    div.className = 'cost-item';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = moneyMo(value);
    div.append(span, strong);
    if (note) {
      const small = document.createElement('small');
      small.textContent = note;
      div.appendChild(small);
    }
    return div;
  }

  function provRow(label, state, note) {
    const div = document.createElement('div');
    div.className = 'prov-row';
    const strong = document.createElement('strong');
    strong.textContent = label;
    const tag = document.createElement('span');
    tag.textContent = state || 'MODELED';
    const small = document.createElement('small');
    small.textContent = note || '';
    div.append(strong, tag, small);
    return div;
  }

  function render(decision) {
    const trueCost = decision.trueMonthlyCost || {};
    const loan = decision.loan || {};
    const cash = decision.cashToClose || {};
    const income = decision.incomeBenchmark || {};
    const address = decision.enrichment && decision.enrichment.address;
    const flood = decision.enrichment && decision.enrichment.flood || {};
    const prov = decision.provenance || {};

    $('askingPriceResult').textContent = money0(decision.askingPrice);
    $('trueMonthlyResult').textContent = monthlyRange(trueCost.low, trueCost.high);
    $('loanAmountResult').textContent = money0(loan.principal);
    $('loanDetail').textContent = Number(loan.termYears || 30) + '-year model · ' + Number(decision.input.ratePct).toFixed(2) + '% rate · ' + Number(loan.downPaymentPct || 0).toFixed(1) + '% down';
    $('cashToCloseResult').textContent = moneyRange(cash.totalLow, cash.totalHigh);

    $('matchedAddress').textContent = address && address.matched
      ? 'Matched: ' + address.matchedAddress
      : 'Address could not be matched to Census geography; broader planning estimates are being used.';

    const confidence = decision.confidence || { label: 'Planning estimate', limitations: [] };
    const badge = $('confidenceBadge');
    badge.textContent = confidence.label || 'PLANNING ESTIMATE';
    badge.className = 'verdict-badge ' + (String(confidence.label || '').toLowerCase().includes('good') ? 'fits' : String(confidence.label || '').toLowerCase().includes('flood') ? 'needs' : 'close');

    const limitations = confidence.limitations || [];
    $('confidenceLine').textContent = limitations.length
      ? 'What still limits precision: ' + limitations.join(' · ')
      : 'Public data and model inputs loaded successfully.';
    $('trueMonthlyNote').textContent = decision.unpricedCosts && decision.unpricedCosts.length
      ? 'Before any flagged unpriced costs below'
      : 'Mortgage + modeled property costs';

    const breakdown = decision.breakdown || {};
    const breakdownGrid = $('breakdownGrid');
    breakdownGrid.textContent = '';
    [
      ['Mortgage principal + interest', breakdown.mortgagePI],
      ['PMI', breakdown.pmi],
      ['Property tax estimate', breakdown.propertyTax],
      ['Homeowners insurance estimate', breakdown.homeInsurance],
      ['Maintenance reserve', breakdown.maintenance],
      ['Flood insurance', breakdown.floodInsurance],
    ].forEach((row) => {
      if (Number(row[1]) > 0.005 || row[0] === 'Mortgage principal + interest') {
        breakdownGrid.appendChild(costItem(row[0], Number(row[1]) || 0));
      }
    });
    $('costRangeNote').textContent = Math.abs(Number(trueCost.high) - Number(trueCost.low)) > 5
      ? monthlyRange(trueCost.low, trueCost.high) + ' because tax and insurance are estimates, not exact future bills.'
      : moneyMo(trueCost.midpoint) + ' under the current automatic assumptions.';

    $('incomeBenchmarkResult').textContent = moneyRange(income.annualLow, income.annualHigh) + '/yr';
    $('incomeBenchmarkNote').textContent = income.note || '';

    const floodState = $('floodState');
    if (flood.status === 'AVAILABLE') {
      floodState.textContent = flood.sfha ? 'ZONE ' + flood.zone + ' · SFHA' : 'ZONE ' + flood.zone;
      $('floodCopy').textContent = flood.note || (flood.sfha
        ? 'FEMA maps this point in a Special Flood Hazard Area.'
        : 'FEMA flood-zone context loaded for this point.');
      $('floodSource').textContent = 'Government sourced · FEMA National Flood Hazard Layer. FEMA does not provide the insurance premium used by a carrier.';
    } else if (flood.status === 'NO_FEATURE') {
      floodState.textContent = 'NO POLYGON RETURNED';
      $('floodCopy').textContent = flood.note || 'No FEMA NFHL polygon was returned for this point.';
      $('floodSource').textContent = 'No flood premium was invented.';
    } else {
      floodState.textContent = 'UNAVAILABLE';
      $('floodCopy').textContent = 'FEMA flood context could not be loaded for this calculation.';
      $('floodSource').textContent = 'The monthly total does not invent a flood premium.';
    }

    const unpriced = $('unpricedList');
    unpriced.textContent = '';
    (decision.unpricedCosts || []).forEach((item) => {
      unpriced.appendChild(provRow(item.label, item.status, item.note));
    });

    const list = $('provenanceList');
    list.textContent = '';
    list.append(
      provRow('Mortgage rate', prov.mortgageRate, 'User-entered rate: ' + Number(decision.input.ratePct).toFixed(2) + '%. Term is automatically fixed at 30 years.'),
      provRow('Property tax', prov.propertyTax && prov.propertyTax.provenance, prov.propertyTax && prov.propertyTax.note),
      provRow('Homeowners insurance', prov.homeInsurance && prov.homeInsurance.provenance, prov.homeInsurance && prov.homeInsurance.note),
      provRow('PMI', prov.pmi && prov.pmi.provenance, prov.pmi && prov.pmi.note),
      provRow('Maintenance reserve', prov.maintenance && prov.maintenance.provenance, prov.maintenance && prov.maintenance.note),
      provRow('Flood insurance', prov.floodInsurance && prov.floodInsurance.provenance, prov.floodInsurance && prov.floodInsurance.label)
    );
    $('confidenceHelp').textContent = 'The app completes the analysis automatically, while separating public-source facts from modeled estimates and unavailable costs.';

    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function calculate() {
    const payload = buildPayload();
    if (!payload.address || !(payload.askingPrice > 0) || !(payload.downPayment >= 0) || !Number.isFinite(payload.ratePct) || payload.ratePct < 0 || payload.ratePct > 25) {
      status.textContent = 'Enter the address, asking price, down payment and mortgage rate.';
      return;
    }

    status.textContent = 'Pulling public data and building the full cost picture…';
    track('calculation_started');

    try {
      const response = await fetch('/api/house-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Calculation failed');
      render(data);
      status.textContent = 'Updated.';
      track('calculation_completed');
      track('true_cost_viewed');
    } catch (error) {
      status.textContent = 'Unable to calculate: ' + (error.message || error);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });

  form.elements.ratePct.addEventListener('input', () => {
    rateTouched = true;
    $('rateSource').textContent = 'Your mortgage rate · 30-year fixed planning model.';
  });

  async function loadDefaults() {
    try {
      const response = await fetch('/api/house-fit', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      if (!rateTouched && data.mortgageRate && Number.isFinite(Number(data.mortgageRate.ratePct))) {
        form.elements.ratePct.value = Number(data.mortgageRate.ratePct).toFixed(2);
        $('rateSource').textContent = data.mortgageRate.status === 'AVAILABLE'
          ? 'Current Freddie Mac 30-year benchmark via FRED · ' + (data.mortgageRate.observationDate || 'latest observation') + ' · edit to your quote'
          : 'Fallback planning rate · edit to your quote';
      }
    } catch (_) { /* Required editable rate remains available. */ }
  }

  track('tool_view');
  loadDefaults();
})();
