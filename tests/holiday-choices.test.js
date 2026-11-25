import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { norm, rankChoices } = require('../public/assets/holiday-travel-choices.js');
const html = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const code = fs.readFileSync('public/assets/holiday-travel-choices.js', 'utf8');
const airports = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8')).airports;
const opts = airports.map(a => ({ value: a.code, label: a.city + ' (' + a.code + ')' }));

test('10 original select controls remain the authority and type-to-find is progressive', () => {
  for (const id of ['travel-year','home','away','routing','layover','dep-day','dep-time','due-day','due-time','region']) {
    assert.match(html, new RegExp('<select id="' + id + '"'));
    assert.match(code, new RegExp("'" + id + "'"));
  }
  assert.match(html, /src="\/assets\/holiday-travel-choices\.js"/);
  assert.match(html, /id="best-days"/);
  assert.match(html, /id="airport-weather"/);
  assert.match(html, /id="trip-planner"/);
  assert.doesNotMatch(code, /fetch\(|transformers|huggingface\.co|innerHTML/);
});

test('airport IATA codes win over broad city text, without a server request', () => {
  assert.equal(rankChoices(opts, 'DTW')[0].value, 'DTW');
  assert.equal(rankChoices(opts, 'detroit')[0].value, 'DTW');
  assert.equal(rankChoices(opts, 'ATL')[0].value, 'ATL');
  assert.equal(rankChoices(opts, 'San Diego')[0].value, 'SAN');
  assert.equal(rankChoices(opts, 'not a real airport').length, 0);
});

test('word ordering, spacing and Unicode accents are normalized', () => {
  assert.equal(norm('  SÃO-José   '), 'sao jose');
  assert.equal(rankChoices(opts, 'York New').some(o => o.label.includes('New York')), true);
  const result = rankChoices(opts, '  Fort    Worth  ');
  assert.equal(result[0].value, 'DFW');
});

test('respects maximum suggestions; never autoselects unsupported values', () => {
  const result = rankChoices(opts, '', 9);
  assert.equal(result.length, 9);
  assert.equal(rankChoices(opts, 'nonexistent code', 9).length, 0);
  assert.deepEqual(rankChoices(opts, 'detroit', 0), []);
  assert.ok(code.includes("select.dispatchEvent(new Event('change'"));
  assert.ok(code.includes("entry.addEventListener('keydown'"));
  assert.ok(code.includes("entry.addEventListener('blur'"));
});
