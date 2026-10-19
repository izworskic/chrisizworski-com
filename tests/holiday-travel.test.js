import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const script = page.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];

function launch() {
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
  vm.runInNewContext(script, { document, Date, Number, String, Math }, { timeout: 2000 });
  return { get: id => document.getElementById(id), click: id => document.getElementById(id).handlers.click() };
}

test('source, authorship, canonical and honest uncertainty are explicit', () => {
  assert.ok(script, 'interactive script must exist');
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski.com\/holiday-travel\/"/);
  assert.match(page, /https:\/\/chrisizworski.com\/#person/);
  assert.match(page, /Built by <a href="\/chris-izworski\/">Chris Izworski/);
  for (const source of ['tsa.gov', 'newsroom.aaa.com', 'transtats.bts.gov', 'eia.gov']) assert.ok(page.includes(source), source + ' source link missing');
  assert.match(page, /not airport wait times/);
  assert.match(page, /2026 estimate/);
  assert.doesNotMatch(page, /booking widget|price comparison|buy flight|purchase flights/i);
});

test('Thanksgiving renders full ranking and airport-specific 2025 monthly history', () => {
  const app = launch();
  assert.match(app.get('holiday-stat').textContent, /Thanksgiving/);
  assert.equal(app.get('third-stat').textContent, '15.96%');
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 11);
  assert.match(app.get('results').innerHTML, /3\.13M screened/);
  assert.match(app.get('results').innerHTML, /planning estimate/);
  app.get('airport').value = 'ORD';
  app.get('airport').handlers.change();
  assert.equal(app.get('third-stat').textContent, '23.11%');
  app.get('airport').value = 'SEA';
  app.get('airport').handlers.change();
  assert.equal(app.get('third-stat').textContent, '19.40%');
  assert.match(app.get('third-note').textContent, /U\.S\./);
});

test('Christmas, driving, fuel arithmetic, invalid miles and toggles recalculate without reload', () => {
  const app = launch();
  app.click('christmas');
  assert.match(app.get('holiday-stat').textContent, /Christmas/);
  assert.equal(app.get('third-stat').textContent, '27.65%');
  assert.equal((app.get('results').innerHTML.match(/<article class="day /g) || []).length, 13);
  assert.match(app.get('results').innerHTML, /estimate/i);
  app.click('drive');
  assert.match(app.get('rank-heading').textContent, /Driving/);
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
