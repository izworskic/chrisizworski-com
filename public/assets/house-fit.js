(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const form = $('houseFitForm');
  const rateForm = $('rateAdjustForm');
  const result = $('result');
  const status = $('formStatus');
  let rateOverride = null;

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

  function buildPayload() {
    const payload = {
      address: valueOf('address').trim(),
      askingPrice: Number(valueOf('askingPrice')),
      downPayment: Number(valueOf('downPayment')),
    };
    if (Number.isFinite(rateOverride)) payload.ratePct = rateOverride;
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
    const breakdownRange = decision.breakdownRange || {};
    const unpricedCosts = decision.unpricedCosts || [];
    const drivers = decision.uncertaintyDrivers || [];

    $('askingPriceResult').textContent = money0(decision.askingPrice);
    $('mortgageOnlyResult').textContent = monthlyRange(
      breakdownRange.mortgagePI && breakdownRange.mortgagePI.low,
      breakdownRange.mortgagePI && breakdownRange.mortgagePI.high
    );
    $('propertyTaxLedgerResult').textContent = monthlyRange(
      breakdownRange.propertyTax && breakdownRange.propertyTax.low,
      breakdownRange.propertyTax && breakdownRange.propertyTax.high
    );
    $('insuranceLedgerResult').textContent = monthlyRange(
      breakdownRange.homeInsurance && breakdownRange.homeInsurance.low,
      breakdownRange.homeInsurance && breakdownRange.homeInsurance.high
    );
    $('maintenanceLedgerResult').textContent = monthlyRange(
      breakdownRange.maintenance && breakdownRange.maintenance.low,
      breakdownRange.maintenance && breakdownRange.maintenance.high
    );

    const pmiRow = $('pmiLedgerRow');
    if (Number(breakdown.pmi) > 0.005) {
      pmiRow.hidden = false;
      $('pmiLedgerResult').textContent = monthlyRange(
        breakdownRange.pmi && breakdownRange.pmi.low,
        breakdownRange.pmi && breakdownRange.pmi.high
      );
    } else {
      pmiRow.hidden = true;
    }

    const floodRow = $('floodLedgerRow');
    if (Number(breakdown.floodInsurance) > 0.005) {
      floodRow.hidden = false;
      $('floodLedgerResult').textContent = monthlyRange(
        breakdownRange.floodInsurance && breakdownRange.floodInsurance.low,
        breakdownRange.floodInsurance && breakdownRange.floodInsurance.high
      );
    } else {
      floodRow.hidden = true;
    }

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
      'Broad planning estimate': 'WIDE RANGE · VERIFY COSTS',
      'Limited by flood premium': 'FLOOD QUOTE NEEDED',
    };
    badge.textContent = confidenceMap[confidence.label] || 'PLANNING ESTIMATE';
    badge.title = confidence.label || 'Planning estimate';
    badge.className = 'verdict-badge ' + (
      confidence.label === 'Good planning estimate' ? 'fits' :
      confidence.label === 'Limited by flood premium' ? 'needs' : 'close'
    );

    $('bottomLineExplain').textContent =
      'Reality Gap: ' + monthlyRange(gap.monthlyLow, gap.monthlyHigh) +
      ' above the mortgage-only payment.';

    $('bottomLineExcluded').textContent = unpricedCosts.length
      ? 'Not included: ' + unpricedCosts.map((item) => item.label).join(', ') + '.'
      : '';

    if (drivers.length) {
      const names = drivers.slice(0, 2).map((driver) => driver.label.toLowerCase());
      $('rangeExplainLead').textContent =
        'The low and high ends are different because ' + names.join(' and ') +
        ' are estimates rather than exact bills or quotes.';
    } else {
      $('rangeExplainLead').textContent =
        'The modeled tax and insurance assumptions are producing a relatively narrow range.';
    }

    $('realityGapCopy').textContent =
      'The low end uses the lower tax and insurance assumptions; the high end uses the upper assumptions. ' +
      'This is an uncertainty range for carrying costs, not a prediction that your payment will bounce between the two numbers.';

    const driverList = $('uncertaintyDriversList');
    driverList.textContent = '';
    drivers.forEach((driver) => {
      driverList.appendChild(provRow(
        driver.label,
        'WHY THE RANGE MOVES',
        'This assumption accounts for about ' + moneyMo(driver.monthlySpread) + ' of the low-to-high spread.'
      ));
    });
    if (!driverList.children.length) {
      driverList.appendChild(provRow(
        'Tax + insurance range',
        'RELATIVELY NARROW',
        'These modeled assumptions are not creating a large spread in this result.'
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
    $('ratePctAdjust').value = rate.toFixed(2);
    $('rateSourceResult').textContent = isUserRate
      ? 'Using your adjusted rate of ' + rate.toFixed(2) + '%.'
      : 'First run used the current Freddie Mac 30-year benchmark: ' + rate.toFixed(2) + '%' +
        (rateSource.observationDate ? ' · observation ' + rateSource.observationDate : '') + '.';

    const breakdownGrid = $('breakdownGrid');
    breakdownGrid.textContent = '';
    [
      ['Mortgage principal + interest', breakdown.mortgagePI, rate.toFixed(2) + '% · ' + Number(loan.termYears || 30) + ' years'],
      ['PMI', breakdown.pmi, Number(breakdown.pmi) > 0 ? 'Included because down payment is below 20%.' : ''],
      ['Property tax estimate', breakdown.propertyTax, 'Address-based Census planning estimate'],
      ['Homeowners insurance estimate', breakdown.homeInsurance, 'Automatic planning estimate'],
      ['Maintenance reserve', breakdown.maintenance, 'Modeled reserve, not a bill'],
      ['Flood insurance', breakdown.floodInsurance, 'Only included when a premium is actually priced'],
    ].forEach((row) => {
      if (Number(row[1]) > 0.005 || row[0] === 'Mortgage principal + interest') {
        breakdownGrid.appendChild(costItem(row[0], Number(row[1]) || 0, row[2]));
      }
    });
    $('costRangeNote').textContent = Math.abs(Number(trueCost.high) - Number(trueCost.low)) > 5
      ? 'The total is shown as a range because taxes and insurance are not exact future bills yet.'
      : 'The current tax and insurance assumptions produce a narrow monthly range.';

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
          ? 'Adjusted by you after the first result: ' + rate.toFixed(2) + '%.'
          : 'Current Freddie Mac 30-year benchmark via FRED: ' + rate.toFixed(2) + '%' + (rateSource.observationDate ? ' (' + rateSource.observationDate + ')' : '') + '.'
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

    status.textContent = source === 'rate'
      ? 'Recalculating the Reality Gap with your mortgage rate…'
      : 'Pulling the current mortgage rate and property data…';
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
      track('reality_gap_viewed');
      if (data.downPaymentBreakpoint && data.downPaymentBreakpoint.active) track('pmi_breakpoint_viewed');
      if (source === 'rate') track('mortgage_rate_adjusted');
      else track('market_rate_used');
    } catch (error) {
      status.textContent = 'Unable to calculate: ' + (error.message || error);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    rateOverride = null;
    calculate('initial');
  });

  rateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const candidate = Number($('ratePctAdjust').value);
    if (!Number.isFinite(candidate) || candidate < 0 || candidate > 25) {
      status.textContent = 'Enter a mortgage rate from 0% to 25%.';
      return;
    }
    rateOverride = candidate;
    calculate('rate');
  });

  track('tool_view');
})();
