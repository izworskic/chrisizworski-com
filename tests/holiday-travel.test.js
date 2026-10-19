import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const script = page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

function launch(today = '2026-10-19') {
  const SimulatedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [today + 'T12:00:00Z'])); }
    static now() { return new Date(today + 'T12:00:00Z').getTime(); }
  };
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) {
        nodes.set(id, {
          value: { airport: 'DTW', region: 'midwest', miles: '300', mpg: '28' }[id] ?? '',
          textContent: '', innerHTML: '', handlers: {},
          addEventListener(event, fn) { this.handlers[event] = fn; },
          setAttribute(name, val) { this[name] = val; },
          classList: { toggle() {} }
        });
      }
      return nodes.get(id);
    }
  };
  vm.runInNewContext(script, { document, Date: SimulatedDate, Number, String, Math }, { timeout: 2000 });
  return { get: id => document.getElementById(id), click: id => document.getElementById(id).handlers.click() };
}

test('source, authorship, canonical and honest uncertainty are explicit', () => {
  assert.ok(script, 'interactive script must exist');
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski.com\/holiday-travel\/"/);
  assert.match(page, /https:\/\/chrisizworski.com\/#person/);
  assert.match(page, /Built by <a href="\/chris-izworski\/">Chris Izworski/);
  for (const source of ['tsa.gov', 'newsroom.aaa.com', 'transtats.bts.gov', 'eia.gov']) assert.ok(page.includes(source), source + ' source link missing');
  assert.match(page, /not airport wait times/);
  assert.match(page, /Holiday dates and weekday-aware rankings update for the selected year/);
  assert.doesNotMatch(page, /2026 planning outlook|This is a 2026 estimate/);
  assert.match(page, /historical and are not automatically refreshed/);
  assert.doesNotMatch(page, /booking widget|price comparison|buy flight|purchase flights/i);
});

test('Thanksgiving renders national date ranking with separately selected 2025 airport records', () => {
  const app = launch();
  assert.match(app.get('holiday-stat').textContent, /Thanksgiving/);
  assert.equal(app.get('third-stat').textContent, '79.4%');
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 11);
  assert.match(app.get('results').innerHTML, /3\.13M screened/);
  assert.match(app.get('results').innerHTML, /planning estimate/);
  app.get('airport').value = 'ORD';
  app.get('airport').handlers.change();
  assert.equal(app.get('third-stat').textContent, '71.3%');
  assert.match(app.get('airport-context-cancellation').textContent, /5\.6%/);
  assert.match(app.get('airport-history-link').href, /\/ORD\/2025-11\//);
  app.get('airport').value = 'SEA';
  app.get('airport').handlers.change();
  assert.equal(app.get('third-stat').textContent, '82.1%');
  assert.match(app.get('airport-context-cancellation').textContent, /1\.7%/);
  assert.match(app.get('rank-heading').textContent, /Seattle \(SEA\)/);
  assert.match(app.get('third-note').textContent, /SEA/);
  assert.match(app.get('rank-intro').textContent, /not airport-level daily passenger counts/);
});

test('Christmas, driving, fuel arithmetic, invalid miles and toggles recalculate without reload', () => {
  const app = launch();
  app.click('christmas');
  assert.match(app.get('holiday-stat').textContent, /Christmas/);
  assert.equal(app.get('third-stat').textContent, '66.2%');
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 13);
  assert.match(app.get('results').innerHTML, /estimate/i);
  app.click('drive');
  assert.match(app.get('rank-heading').textContent, /Driving/);
  assert.equal(app.get('third-stat').textContent, '$44.41');
  app.get('city').value = 'Los Angeles, CA';
  app.get('city').handlers.input();
  assert.equal(app.get('region').value, 'west');
  assert.match(app.get('rank-heading').textContent, /Los Angeles, CA/);
  assert.equal(app.get('third-stat').textContent, '$60.42');
  app.get('city').value = 'Bay City, MI';
  app.get('city').handlers.input();
  assert.equal(app.get('region').value, 'midwest');
  assert.equal(app.get('third-stat').textContent, '$44.41');
  app.get('miles').value = '600';
  app.get('miles').handlers.input();
  assert.equal(app.get('third-stat').textContent, '$88.82');
  app.get('mpg').value = '0';
  app.get('mpg').handlers.input();
  assert.match(app.get('third-stat').textContent, /Enter valid/);
  app.click('fly');
  assert.match(app.get('rank-heading').textContent, /Flying/);
  assert.equal(app.get('fly')['aria-pressed'], 'true');
});


test('automatically rolls between 2026 and future holidays without editing page text', () => {
  const app = launch('2026-10-19');
  assert.equal(app.get('holiday-stat').textContent, 'Thanksgiving 2026');
  assert.match(app.get('date-stat').textContent, /Thursday, November 26, 2026/);
  assert.match(app.get('planning-banner').textContent, /2026 travel planning/);
  assert.match(app.get('yearly-source-note').textContent, /TSA\/AAA\/BTS 2025/);

  const afterThanksgiving = launch('2026-12-28');
  assert.equal(afterThanksgiving.get('holiday-stat').textContent, 'Thanksgiving 2027');
  assert.match(afterThanksgiving.get('date-stat').textContent, /Thursday, November 25, 2027/);
  afterThanksgiving.click('christmas');
  assert.equal(afterThanksgiving.get('holiday-stat').textContent, 'Christmas 2026');
  assert.match(afterThanksgiving.get('date-stat').textContent, /Friday, December 25, 2026/);

  const nextJanuary = launch('2027-01-02');
  nextJanuary.click('christmas');
  assert.match(nextJanuary.get('date-stat').textContent, /Saturday, December 25, 2027/);

  const future = launch('2029-10-19');
  assert.match(future.get('date-stat').textContent, /Thursday, November 22, 2029/);
  future.click('christmas');
  assert.match(future.get('date-stat').textContent, /Tuesday, December 25, 2029/);
});

test('manual travel-year selection recalculates dates, road weekday guidance, and source labels', () => {
  const app = launch('2026-10-19');
  app.click('christmas');
  app.click('drive');
  const first = app.get('results').innerHTML;
  assert.match(app.get('date-stat').textContent, /Friday, December 25, 2026/);
  assert.match(first, /Christmas Eve estimate adjusted for its Thursday placement/);

  app.get('travel-year').value = '2027';
  app.get('travel-year').handlers.change();
  assert.equal(app.get('holiday-stat').textContent, 'Christmas 2027');
  assert.match(app.get('date-stat').textContent, /Saturday, December 25, 2027/);
  assert.match(app.get('results').innerHTML, /Christmas Eve estimate adjusted for its Friday placement/);
  assert.match(app.get('results').innerHTML, /2027 timing estimate using 2025 AAA\/INRIX/);
  assert.match(app.get('third-note').textContent, /Oct 12, 2026 \(historical price illustration\)/);
  assert.match(app.get('yearly-source-note').textContent, /not automatically updated 2027 data/);
  assert.notEqual(app.get('results').innerHTML, first, 'weekday-adaptive recommendations must differ');

  app.get('travel-year').value = '2028';
  app.get('travel-year').handlers.change();
  app.click('thanksgiving');
  assert.match(app.get('date-stat').textContent, /Thursday, November 23, 2028/);
  assert.match(app.get('results').innerHTML, /Nov .*2028/);
  app.get('travel-year').value = 'auto';
  app.get('travel-year').handlers.change();
  assert.equal(app.get('holiday-stat').textContent, 'Thanksgiving 2026');
});

test('all listed airports have distinct, sourced November and December departure history, with honest national fallback', () => {
  const airports = {
    DTW: [79.4, 66.2, 2.6, 2.5], ORD: [71.3, 63.1, 5.6, 2.5],
    ATL: [78.7, 70.7, 2.5, 2.4], DFW: [70.9, 69.1, 3.5, 0.6],
    DEN: [81.9, 71.9, 1.4, 0.6], JFK: [77.9, 67.2, 2.8, 4.0],
    LGA: [71.2, 64.9, 3.6, 4.8], EWR: [75.3, 70.9, 4.4, 2.6],
    LAX: [79.1, 75.3, 1.8, 0.9], SFO: [78.3, 73.9, 1.9, 1.1],
    MCO: [77.4, 69.0, 1.9, 1.4], MIA: [75.9, 73.6, 2.0, 1.1],
    LAS: [76.7, 74.6, 1.7, 0.6], SEA: [82.1, 72.0, 1.7, 1.0],
    BOS: [77.6, 71.7, 2.8, 1.7], MSP: [82.3, 68.3, 2.2, 2.3],
    PHX: [75.2, 75.6, 2.2, 0.5], CLT: [79.6, 71.7, 1.5, 0.8]
  };
  const app = launch();
  const initialNationalDays = [...app.get('results').innerHTML.matchAll(/#\d+ · ([^<]+)<\/div>/g)].map(x => x[1]);
  for (const [code, values] of Object.entries(airports)) {
    app.get('airport').value = code;
    app.get('airport').handlers.change();
    assert.equal(app.get('third-stat').textContent, values[0].toFixed(1) + '%', code + ' Thanksgiving on time');
    assert.ok(app.get('airport-context-cancellation').textContent.includes(values[2].toFixed(1) + '%'));
    assert.ok(app.get('airport-history-link').href.endsWith('/' + code + '/2025-11/'));
    assert.ok(app.get('best-reason').textContent.includes('At '), 'airport informs first-choice context');
    assert.ok(app.get('results').innerHTML.includes('Selected airport on-time rate</small><b>' + values[0].toFixed(1) + '%'));
    const days = [...app.get('results').innerHTML.matchAll(/#\d+ · ([^<]+)<\/div>/g)].map(x => x[1]);
    assert.deepEqual(days, initialNationalDays, 'do not fabricate locally different TSA ranking');
  }
  app.click('christmas');
  for (const [code, values] of Object.entries(airports)) {
    app.get('airport').value = code;
    app.get('airport').handlers.change();
    assert.equal(app.get('third-stat').textContent, values[1].toFixed(1) + '%', code + ' December on time');
    assert.ok(app.get('airport-context-cancellation').textContent.includes(values[3].toFixed(1) + '%'));
    assert.ok(app.get('airport-history-link').href.endsWith('/' + code + '/2025-12/'));
  }
  app.get('airport').value = 'other';
  app.get('airport').handlers.change();
  assert.equal(app.get('third-stat').textContent, '72.0%');
  assert.ok(app.get('airport-context-advice').textContent.includes('Choose a specific listed airport'));
  assert.equal(app.get('airport-history-link').href, 'https://www.bts.gov/topics/airline-time-tables');
  app.click('drive');
  assert.equal(app.get('airport-context').hidden, true, 'do not show flight context while driving');
});

test('airport historical figures are not mislabeled as local TSA queues or daily delay probabilities', () => {
  assert.match(page, /NOT a day-specific delay forecast or airport security wait/);
  assert.match(page, /Selecting another airport changes the real 2025 monthly/);
  assert.match(page, /national TSA holiday screening patterns, not airport-level daily passenger counts/);
  assert.match(page, /BTS reporting-carrier domestic flight records/);
  assert.doesNotMatch(page, /23\.11|34\.41|19\.40|26\.45/);
});
