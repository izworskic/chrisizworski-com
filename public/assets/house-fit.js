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
    return money0(low) + ' – ' + money0(high) + ' /mo';
  };

  const moneyRange = (a, b) => {
    const low = Number(a), high = Number(b);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
    if (Math.abs(high - low) < 500) return money0((low + high) / 2);
    return money0(low) + ' – ' + money0(high);
  };

  function track(name) {
    if (typeof window.gtag === 'function') window.gtag('event', name, { tool_id: 'house-fit', transport_type: 'beacon' });
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('event', { name, data: { tool: 'house-fit' } });
  }

  function valueOf(name) {
    return form.elements[name] ? form.elements[name].value : '';
  }

  async function readJsonResponse(response) {
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const body = await response.text();
    if (!contentType.includes('application/json')) {
      throw new Error('House calculator service returned an unexpected response. Reload and try again.');
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('House calculator service returned invalid data. Reload and try again.');
    }
  }

  function buildPayload() {
    const payload = {
      address: valueOf('address').trim(),
      askingPrice: Number(valueOf('askingPrice')),
      downPayment: Number(valueOf('downPayment')),
    };
    const rate = Number(valueOf('ratePct'));
    if (rateTouched && Number.isFinite(rate)) payload.ratePct = rate;
    return payload;
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
    const gap = decision.realityGap || {};
    const loan = decision.loan || {};
    const cash = decision.cashToClose || {};
    const breakpoint = decision.downPaymentBreakpoint || {};
    const address = decision.enrichment && decision.enrichment.address;
    const flood = decision.enrichment && decision.enrichment.flood || {};
    const rateSource = decision.enrichment && decision.enrichment.mortgageRate || {};
    const prov = decision.provenance || {};
    const rate = Number(decision.input && decision.input.ratePct);
    const breakdown = decision.breakdown || {};
    const unpricedCosts = decision.unpricedCosts || [];
    const drivers = decision.uncertaintyDrivers || [];

    $('askingPriceResult').textContent = money0(decision.askingPrice);
    $('mortgageOnlyResult').textContent = moneyMo(breakdown.mortgagePI);
    $('mortgageLedgerNote').textContent = rate.toFixed(3) + '% · ' + Number(loan.termYears || 30) + ' years';
    $('propertyTaxLedgerResult').textContent = moneyMo(breakdown.propertyTax);
    $('insuranceLedgerResult').textContent = moneyMo(breakdown.homeInsurance);
    $('maintenanceLedgerResult').textContent = moneyMo(breakdown.maintenance);

    const pmiRow = $('pmiLedgerRow');
    if (Number(breakdown.pmi) > 0.005) {
      pmiRow.hidden = false;
      $('pmiLedgerResult').textContent = moneyMo(breakdown.pmi);
    } else {
      pmiRow.hidden = true;
    }

    const floodRow = $('floodLedgerRow');
    if (Number(breakdown.floodInsurance) > 0.005) {
      floodRow.hidden = false;
      $('floodLedgerResult').textContent = moneyMo(breakdown.floodInsurance);
    } else {
      floodRow.hidden = true;
    }

    const displayedPlanningTotal = [
      'mortgagePI',
      'pmi',
      'propertyTax',
      'homeInsurance',
      'maintenance',
      'floodInsurance',
    ].reduce((sum, key) => sum + Math.round(Number(breakdown[key]) || 0), 0);
    const displayedMortgage = Math.round(Number(breakdown.mortgagePI) || 0);
    const displayedRealityGap = Math.max(0, displayedPlanningTotal - displayedMortgage);

    $('trueMonthlyResult').textContent = monthlyRange(trueCost.low, trueCost.high);
    $('cashToCloseResult').textContent = moneyRange(cash.totalLow, cash.totalHigh);

    $('matchedAddress').textContent = address && address.matched
      ? 'Matched: ' + address.matchedAddress
      : 'Address match was incomplete, so broader location estimates are being used.';

    const confidence = decision.confidence || { label: 'Planning estimate', limitations: [] };
    const badge = $('confidenceBadge');
    const confidenceMap = {
      'Good planning estimate': 'GOOD DATA COVERAGE',
      'Moderate planning estimate': 'SOME COSTS ESTIMATED',
      'Broad planning estimate': 'ESTIMATES · VERIFY COSTS',
      'Limited by flood premium': 'FLOOD QUOTE NEEDED',
    };
    badge.textContent = confidenceMap[confidence.label] || 'PLANNING ESTIMATE';
    badge.title = confidence.label || 'Planning estimate';
    badge.className = 'verdict-badge ' + (
      confidence.label === 'Good planning estimate' ? 'fits' :
      confidence.label === 'Limited by flood premium' ? 'needs' : 'close'
    );

    $('bottomLineExplain').textContent =
      'Reality Gap: +' + moneyMo(displayedRealityGap) + ' above the mortgage-only payment.';

    $('bottomLineExcluded').textContent = unpricedCosts.length
      ? 'Not included: ' + unpricedCosts.map((item) => item.label).join(', ') + '.'
      : '';

    if (drivers.length) {
      const names = drivers.slice(0, 2).map((driver) => driver.label.toLowerCase());
      $('rangeExplainLead').textContent =
        'The total above uses planning estimates for ' + names.join(' and ') +
        '. Verify those numbers against the actual tax bill and insurance quote before buying.';
    } else {
      $('rangeExplainLead').textContent =
        'The total above uses planning estimates. Verify the material costs before buying.';
    }

    $('realityGapCopy').textContent =
      'The total range reflects uncertainty in taxes and homeowners insurance. The individual rows are the midpoint planning estimates.';

    const driverList = $('uncertaintyDriversList');
    driverList.textContent = '';
    drivers.forEach((driver) => {
      driverList.appendChild(provRow(
        driver.label,
        'VERIFY ESTIMATE',
        'Modeled uncertainty around this estimate is about ' + moneyMo(driver.monthlySpread) + '.'
      ));
    });
    if (!driverList.children.length) {
      driverList.appendChild(provRow(
        'Tax + insurance estimates',
        'VERIFY ESTIMATE',
        'Use the actual tax bill and an insurance quote before making a purchase decision.'
      ));
    }

    const breakPanel = $('downPaymentBreakpointPanel');
    if (breakpoint.active) {
      breakPanel.hidden = false;
      $('extraCashTo20').textContent = money0(breakpoint.extraCashTo20);
      $('targetDownPayment').textContent = '20% down = ' + money0(breakpoint.targetDownPayment);
      $('monthlySavingsAt20').textContent = moneyMo(breakpoint.monthlySavingsAt20);
      $('pmiSavingsAt20').textContent = moneyMo(breakpoint.pmiMonthly) + ' is modeled PMI; the rest is lower principal + interest.';
      $('downBreakpointNote').textContent = breakpoint.note || '';
    } else {
      breakPanel.hidden = true;
    }

    const tripwireList = $('tripwireList');
    tripwireList.textContent = '';
    (decision.buyerTripwires || []).forEach((item) => {
      const effect = Number.isFinite(Number(item.monthlyEffect)) && Number(item.monthlyEffect) > 0
        ? ' · ' + moneyMo(item.monthlyEffect) + (item.key === 'insurance' || item.key === 'tax' ? ' uncertainty spread' : ' modeled cost')
        : '';
      tripwireList.appendChild(provRow(item.label, item.level, (item.note || '') + effect));
    });

    const isUserRate = prov.mortgageRate === 'USER PROVIDED';
    if (!rateTouched) $('ratePct').value = rate.toFixed(3);
    const sourceText = rateSource.frequency === 'DAILY'
      ? 'Current daily 30-year conforming average'
      : rateSource.frequency === 'WEEKLY'
        ? 'Daily average unavailable · current weekly fallback'
        : 'Live rate unavailable · fallback assumption';
    $('rateMarketSummary').textContent = sourceText + ': ' + rate.toFixed(3) + '%' +
      (rateSource.observationDate ? ' · ' + rateSource.observationDate : '') +
      (rateSource.source ? ' · ' + rateSource.source : '');

    const floodState = $('floodState');
    if (flood.status === 'AVAILABLE') {
      floodState.textContent = flood.sfha ? 'ZONE ' + flood.zone + ' · SFHA' : 'ZONE ' + flood.zone;
      $('floodCopy').textContent = flood.note || (flood.sfha
        ? 'FEMA maps this point in a Special Flood Hazard Area.'
        : 'FEMA flood-zone context loaded for this point.');
      $('floodSource').textContent = 'Government sourced · FEMA National Flood Hazard Layer. FEMA identifies hazard but does not provide the property-specific carrier premium.';
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
    unpricedCosts.forEach((item) => {
      unpriced.appendChild(provRow(item.label, item.status, item.note));
    });

    const list = $('provenanceList');
    list.textContent = '';
    list.append(
      provRow(
        'Mortgage rate',
        prov.mortgageRate,
        isUserRate
          ? 'Rate entered by you before calculation: ' + rate.toFixed(3) + '%.'
          : (rateSource.frequency === 'DAILY' ? 'Latest daily 30-year conforming average' : 'Current mortgage benchmark') +
            ': ' + rate.toFixed(3) + '%' +
            (rateSource.observationDate ? ' (' + rateSource.observationDate + ')' : '') +
            (rateSource.source ? ' · ' + rateSource.source : '') + '.'
      ),
      provRow('Property tax', prov.propertyTax && prov.propertyTax.provenance, prov.propertyTax && prov.propertyTax.note),
      provRow('Homeowners insurance', prov.homeInsurance && prov.homeInsurance.provenance, prov.homeInsurance && prov.homeInsurance.note),
      provRow('PMI', prov.pmi && prov.pmi.provenance, prov.pmi && prov.pmi.note),
      provRow('Maintenance reserve', prov.maintenance && prov.maintenance.provenance, prov.maintenance && prov.maintenance.note),
      provRow('Flood insurance', prov.floodInsurance && prov.floodInsurance.provenance, prov.floodInsurance && prov.floodInsurance.label)
    );
    $('confidenceHelp').textContent = 'Sourced facts, modeled costs and unresolved costs are kept separate so you can see what still needs verification.';

    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function calculate(source) {
    const payload = buildPayload();
    if (!payload.address || !(payload.askingPrice > 0) || !(payload.downPayment >= 0)) {
      status.textContent = 'Enter the address, asking price and down payment.';
      return;
    }

    status.textContent = 'Pulling property data and building the true cost…';
    track('calculation_started');

    try {
      const response = await fetch('/api/house-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.message || data.error || 'Calculation failed');
      render(data);
      status.textContent = 'Updated.';
      track('calculation_completed');
      track('reality_gap_viewed');
      if (data.downPaymentBreakpoint && data.downPaymentBreakpoint.active) track('pmi_breakpoint_viewed');
      if (rateTouched) track('mortgage_rate_adjusted');
      else track('market_rate_used');
    } catch (error) {
      status.textContent = 'Unable to calculate: ' + (error.message || error);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const candidate = Number(valueOf('ratePct'));
    if (rateTouched && (!Number.isFinite(candidate) || candidate < 0 || candidate > 25)) {
      status.textContent = 'Enter a mortgage rate from 0% to 25%.';
      return;
    }
    calculate('initial');
  });

  $('ratePct').addEventListener('input', () => {
    rateTouched = true;
    $('rateDefaultNote').textContent = 'Using your rate for this build. Taxes, insurance, PMI and the other modeled monthly costs stay in the calculation.';
  });

  async function loadDailyRate() {
    try {
      const response = await fetch('/api/house-fit', { headers: { Accept: 'application/json' } });
      const data = await readJsonResponse(response);
      const rate = Number(data && data.mortgageRate && data.mortgageRate.ratePct);
      if (!response.ok || !Number.isFinite(rate)) throw new Error('Rate unavailable');
      if (!rateTouched) $('ratePct').value = rate.toFixed(3);
      const source = data.mortgageRate || {};
      const label = source.frequency === 'DAILY'
        ? 'Latest daily average'
        : source.frequency === 'WEEKLY'
          ? 'Daily average unavailable · weekly fallback'
          : 'Live rate unavailable · fallback assumption';
      $('rateMarketSummary').textContent = label.replace('Latest daily average', 'Current daily 30-year conforming average') +
        ': ' + rate.toFixed(3) + '%' +
        (source.observationDate ? ' · ' + source.observationDate : '') +
        (source.source ? ' · ' + source.source : '');
    } catch {
      $('rateMarketSummary').textContent = 'Daily rate will be loaded automatically when you calculate.';
    }
  }

  loadDailyRate();
  track('tool_view');
})();
