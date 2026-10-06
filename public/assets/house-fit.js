(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const coreForm = $('houseFitForm');
  const accuracyForm = $('accuracyForm');
  const result = $('result');
  const status = $('formStatus');
  const commuteToggle = $('includeCommute');
  const commuteFields = $('commuteFields');
  let lastDecision = null;
  let rateTouched = false;

  const money0 = (n) => Number.isFinite(Number(n))
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n))
    : '—';
  const moneyMo = (n) => money0(n) + '/mo';
  const rangeMoney = (a, b) => {
    const low = Number(a), high = Number(b);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
    if (Math.abs(high - low) < 2500) return money0((low + high) / 2);
    const compact = (v) => '$' + Math.round(v / 1000) + 'K';
    return compact(low) + '–' + compact(high);
  };

  function track(name) {
    if (typeof window.gtag === 'function') window.gtag('event', name, { tool_id: 'house-fit', transport_type: 'beacon' });
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('event', { name: name, data: { tool: 'house-fit' } });
  }

  function valueOf(form, name) {
    return form.elements[name] ? form.elements[name].value : '';
  }

  function buildPayload() {
    return {
      address: valueOf(coreForm, 'address').trim(),
      askingPrice: Number(valueOf(coreForm, 'askingPrice')),
      monthlyLimit: Number(valueOf(coreForm, 'monthlyLimit')),
      downPayment: Number(valueOf(coreForm, 'downPayment')),
      ratePct: rateTouched ? Number(valueOf(coreForm, 'ratePct')) : '',
      termYears: Number(valueOf(coreForm, 'termYears')),
      propertyTaxAnnual: valueOf(accuracyForm, 'propertyTaxAnnual'),
      homeInsuranceAnnual: valueOf(accuracyForm, 'homeInsuranceAnnual'),
      floodInsuranceAnnual: valueOf(accuracyForm, 'floodInsuranceAnnual'),
      hoaMonthly: valueOf(accuracyForm, 'hoaMonthly'),
      maintenanceRatePct: valueOf(accuracyForm, 'maintenanceRatePct'),
      includeCommute: commuteToggle.checked,
      commuteOneWayMiles: valueOf(accuracyForm, 'commuteOneWayMiles'),
      commuteOneWayMinutes: valueOf(accuracyForm, 'commuteOneWayMinutes'),
      commuteDaysPerWeek: valueOf(accuracyForm, 'commuteDaysPerWeek'),
      commuteMpg: valueOf(accuracyForm, 'commuteMpg'),
      gasPrice: valueOf(accuracyForm, 'gasPrice'),
    };
  }

  function costItem(label, value) {
    const div = document.createElement('div');
    div.className = 'cost-item';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = moneyMo(value);
    div.append(span, strong);
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
    lastDecision = decision;
    if (!rateTouched && decision.input && Number.isFinite(Number(decision.input.ratePct))) {
      coreForm.elements.ratePct.value = Number(decision.input.ratePct).toFixed(2);
      const rateProv = decision.provenance && decision.provenance.mortgageRate;
      $('rateSource').textContent = rateProv === 'GOVERNMENT SOURCED'
        ? 'Freddie Mac 30-year benchmark via FRED · editable'
        : 'Planning default · editable';
    }
    const trueCost = decision.trueMonthlyCost || {};
    $('askingPriceResult').textContent = money0(decision.askingPrice);
    $('monthlyLimitResult').textContent = moneyMo(decision.monthlyLimit);
    $('trueMonthlyResult').textContent = rangeMoney(trueCost.low, trueCost.high) + '/mo';
    $('fitCeiling').textContent = rangeMoney(decision.fitCeiling.low, decision.fitCeiling.high);

    const address = decision.enrichment && decision.enrichment.address;
    $('matchedAddress').textContent = address && address.matched
      ? 'Matched: ' + address.matchedAddress
      : 'Address could not be matched to Census geography; the engine is using broader planning estimates.';

    const verdict = decision.verdict || {};
    $('verdictLabel').textContent = verdict.label || 'RESULT';
    $('verdictExplanation').textContent = verdict.explanation || '';
    const badge = $('verdictBadge');
    badge.textContent = verdict.label || 'RESULT';
    badge.className = 'verdict-badge ' + (verdict.state === 'FITS' ? 'fits' : verdict.state === 'CLOSE' ? 'close' : verdict.state === 'NEEDS_BETTER_INPUTS' ? 'needs' : 'no');

    const missing = decision.confidence && decision.confidence.missing || [];
    $('confidenceLine').textContent = 'Confidence: ' + decision.confidence.label +
      (missing.length ? ' · Add ' + missing.join(' and ') + ' to narrow the answer.' : ' · Key property costs are directly supplied or publicly sourced.');
    $('fitCeilingNote').textContent = decision.confidence.label === 'High' ? 'Property-specific planning ceiling' : 'Range reflects uncertain property costs';

    const whyBody = $('whyBody');
    whyBody.textContent = '';
    (decision.whyCeilingMoved || []).forEach((factor) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td'); a.textContent = factor.label;
      const b = document.createElement('td'); b.textContent = '−' + moneyMo(factor.monthlyEffect);
      const c = document.createElement('td'); c.textContent = '−' + money0(factor.fitCeilingEffect); c.className = 'positive-capacity';
      tr.append(a, b, c);
      whyBody.appendChild(tr);
    });
    if (!whyBody.children.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'No additional modeled costs are consuming price capacity in the current inputs.';
      tr.appendChild(td);
      whyBody.appendChild(tr);
    }

    const breakdown = decision.breakdown || {};
    const breakdownGrid = $('breakdownGrid');
    breakdownGrid.textContent = '';
    [
      ['Mortgage P&I', breakdown.mortgagePI], ['PMI', breakdown.pmi],
      ['Property tax', breakdown.propertyTax], ['Home insurance', breakdown.homeInsurance],
      ['Flood insurance', breakdown.floodInsurance], ['HOA', breakdown.hoa],
      ['Maintenance reserve', breakdown.maintenance], ['Commute fuel', breakdown.commute],
    ].forEach((row) => {
      if (Number(row[1]) > 0.005 || row[0] === 'Mortgage P&I') breakdownGrid.appendChild(costItem(row[0], Number(row[1]) || 0));
    });
    $('costRangeNote').textContent = Math.abs(trueCost.high - trueCost.low) > 5
      ? moneyMo(trueCost.low) + ' to ' + moneyMo(trueCost.high) + ' because tax and/or insurance are still estimated.'
      : moneyMo(trueCost.midpoint) + ' using the values supplied.';

    const sensitivityGrid = $('sensitivityGrid');
    sensitivityGrid.textContent = '';
    (decision.sensitivity || []).forEach((s) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scenario';
      button.dataset.scenario = s.key;
      const title = document.createElement('strong'); title.textContent = s.label;
      const ceiling = document.createElement('span'); ceiling.className = 'scenario-ceiling'; ceiling.textContent = money0(s.ceiling);
      const delta = document.createElement('small');
      const d = Number(s.delta) || 0;
      delta.className = d >= 0 ? 'gain' : 'loss';
      delta.textContent = (d >= 0 ? '+' : '−') + money0(Math.abs(d)) + ' vs current midpoint';
      button.append(title, ceiling, delta);
      sensitivityGrid.appendChild(button);
    });

    const flood = decision.enrichment && decision.enrichment.flood || {};
    const floodState = $('floodState');
    if (flood.status === 'AVAILABLE') {
      floodState.textContent = flood.sfha ? 'ZONE ' + flood.zone + ' · SFHA' : 'ZONE ' + flood.zone;
      $('floodCopy').textContent = flood.note || (flood.sfha ? 'FEMA maps this point in a Special Flood Hazard Area.' : 'FEMA flood-zone context loaded for this point.');
      $('floodSource').textContent = 'Government sourced · FEMA National Flood Hazard Layer. Exact flood-insurance premium is not available from this public layer.';
    } else if (flood.status === 'NO_FEATURE') {
      floodState.textContent = 'NO POLYGON RETURNED';
      $('floodCopy').textContent = flood.note || 'No FEMA NFHL polygon was returned for this point. Verify the official map before relying on the absence of a mapped zone.';
      $('floodSource').textContent = 'FEMA NFHL query returned no intersecting feature.';
    } else {
      floodState.textContent = 'UNAVAILABLE';
      $('floodCopy').textContent = 'FEMA flood context could not be loaded. The Fit Ceiling still works, but no flood-zone assumption should be treated as verified.';
      $('floodSource').textContent = 'No flood premium has been invented.';
    }

    const prov = decision.provenance || {};
    const list = $('provenanceList');
    list.textContent = '';
    list.append(
      provRow('Mortgage rate', prov.mortgageRate, 'Rate used: ' + Number(decision.input.ratePct).toFixed(2) + '%'),
      provRow('Property tax', prov.propertyTax && prov.propertyTax.provenance, prov.propertyTax && prov.propertyTax.note),
      provRow('Homeowners insurance', prov.homeInsurance && prov.homeInsurance.provenance, prov.homeInsurance && prov.homeInsurance.note),
      provRow('Flood insurance', prov.floodInsurance && prov.floodInsurance.provenance, prov.floodInsurance && prov.floodInsurance.label),
      provRow('Maintenance reserve', prov.maintenance && prov.maintenance.provenance, 'Modeled at ' + Number(prov.maintenance && prov.maintenance.ratePct || 0).toFixed(2) + '% of purchase price per year; not a bill.'),
      provRow('Commute', prov.commute && prov.commute.provenance, decision.input.commuteEnabled
        ? Math.round(prov.commute.monthlyMiles || 0) + ' miles/month · ' + Number(prov.commute.monthlyHours || 0).toFixed(1) + ' hours/month'
        : 'Not included in this result.')
    );
    $('confidenceHelp').textContent = missing.length
      ? 'The largest next accuracy gain is: ' + missing.join(', ') + '.'
      : 'The largest uncertain property costs have been replaced with direct inputs or public-source context.';

    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function calculate(source) {
    const payload = buildPayload();
    if (!payload.address || !(payload.askingPrice > 0) || !(payload.monthlyLimit > 0) || !(payload.downPayment >= 0)) {
      status.textContent = 'Enter the address, asking price, monthly limit and down payment.';
      return;
    }
    status.textContent = 'Checking public data and solving your Fit Ceiling…';
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
      track('fit_ceiling_viewed');
      if (source === 'accuracy') {
        if (payload.propertyTaxAnnual !== '') track('tax_actual_added');
        if (payload.homeInsuranceAnnual !== '') track('insurance_quote_added');
        if (payload.includeCommute) track('commute_added');
      }
    } catch (error) {
      status.textContent = 'Unable to calculate: ' + (error.message || error);
    }
  }

  function applyScenario(key) {
    if (!lastDecision) return;
    const n = (form, name) => Number(valueOf(form, name)) || 0;
    if (key === 'rate-down-1') {
      coreForm.elements.ratePct.value = Math.max(0, n(coreForm, 'ratePct') - 1).toFixed(2);
      rateTouched = true;
      $('rateSource').textContent = 'Sensitivity-adjusted planning rate.';
    }
    if (key === 'down-plus-20') coreForm.elements.downPayment.value = n(coreForm, 'downPayment') + 20000;
    if (key === 'limit-plus-250') coreForm.elements.monthlyLimit.value = n(coreForm, 'monthlyLimit') + 250;
    if (key === 'no-commute') { commuteToggle.checked = false; commuteFields.hidden = true; }
    if (key === 'insurance-plus-100') accuracyForm.elements.homeInsuranceAnnual.value = Math.round(((lastDecision.breakdown.homeInsurance || 0) + 100) * 12);
    if (key === 'tax-minus-15' && valueOf(accuracyForm, 'propertyTaxAnnual') !== '') {
      accuracyForm.elements.propertyTaxAnnual.value = Math.round(n(accuracyForm, 'propertyTaxAnnual') * 0.85);
    }
    track('sensitivity_used');
    calculate('sensitivity');
  }

  coreForm.addEventListener('submit', (event) => { event.preventDefault(); calculate('core'); });
  accuracyForm.addEventListener('submit', (event) => { event.preventDefault(); calculate('accuracy'); });
  coreForm.elements.ratePct.addEventListener('input', () => {
    rateTouched = true;
    $('rateSource').textContent = 'Your editable planning rate.';
  });
  commuteToggle.addEventListener('change', () => { commuteFields.hidden = !commuteToggle.checked; });
  $('sensitivityGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-scenario]');
    if (button) applyScenario(button.dataset.scenario);
  });

  async function loadDefaults() {
    try {
      const response = await fetch('/api/house-fit', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      if (!rateTouched && data.mortgageRate && Number.isFinite(Number(data.mortgageRate.ratePct))) {
        coreForm.elements.ratePct.value = Number(data.mortgageRate.ratePct).toFixed(2);
        $('rateSource').textContent = data.mortgageRate.status === 'AVAILABLE'
          ? 'Freddie Mac 30-year benchmark via FRED · ' + (data.mortgageRate.observationDate || 'latest observation') + ' · editable'
          : 'Fallback planning rate · editable';
      }
    } catch (_) { /* Editable fallback already exists in HTML. */ }
  }

  track('tool_view');
  loadDefaults();
})();
