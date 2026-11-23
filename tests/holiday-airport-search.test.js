import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const airportSearch = require('../public/assets/holiday-airport-search.js');
const airports = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8')).airports;
const demo = [
  { code:'DTW', city:'Detroit, MI', flights:600 },
  { code:'DEN', city:'Denver, CO', flights:850 },
  { code:'GRR', city:'Grand Rapids, MI', flights:90 },
  { code:'JFK', city:'New York, NY', flights:550 },
  { code:'LGA', city:'New York, NY', flights:620 },
  { code:'SFO', city:'San Francisco, CA', flights:700 }
];

test('airport search understands city, code, punctuation, diacritics and an insertion typo', () => {
  assert.equal(airportSearch.normalize('  Détroit, MI  '), 'detroit mi');
  assert.equal(airportSearch.search(demo, 'DTW')[0].code, 'DTW');
  assert.equal(airportSearch.search(demo, 'Detroit')[0].code, 'DTW');
  assert.equal(airportSearch.search(demo, 'detroiy')[0].code, 'DTW');
  assert.equal(airportSearch.search(demo, 'grand rapids')[0].code, 'GRR');
  assert.equal(airportSearch.search(demo, 'san-francisco')[0].code, 'SFO');
  assert.deepEqual(airportSearch.search(demo, 'Atlantis'), []);
});

test('duplicate city names stay as distinct named airports with exact IATA resolution', () => {
  const byCity = airportSearch.search(demo, 'New York');
  assert.deepEqual(byCity.map((x) => x.code), ['LGA', 'JFK']);
  assert.equal(airportSearch.search(demo, 'JFK')[0].code, 'JFK');
  assert.equal(airportSearch.search(demo, 'LGA')[0].code, 'LGA');
  assert.equal(airportSearch.search(demo, 'new york', 1).length, 1);
});

test('blank query is bounded and ordered by recorded BTS flights, no surprise network or model', () => {
  assert.deepEqual(airportSearch.search(demo, '', 3).map((x) => x.code), ['DEN', 'SFO', 'LGA']);
  assert.ok(airportSearch.search(demo, '', 999).length <= demo.length);
  assert.equal(airportSearch.search(demo, 'x'.repeat(81)).length, 0);
  assert.equal(airportSearch.search(demo, 'dt', 1)[0].code, 'DTW');
});

test('actual BTS catalog drives exact airport result; source cannot be quietly replaced', () => {
  const codes = new Set(airports.map((a) => a.code));
  assert.ok(codes.has('DTW') && codes.has('ATL'));
  assert.equal(airportSearch.search(airports, 'ATL')[0].code, 'ATL');
  assert.equal(airportSearch.search(airports, 'DTW')[0].code, 'DTW');
  assert.equal(airportSearch.search(airports, '__not_a_city__').length, 0);
});

test('planner keeps route/year/weather and original select IDs while enhancing both airports', () => {
  const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
  const module = fs.readFileSync('public/assets/holiday-airport-search.js', 'utf8');
  assert.match(page, /holiday-travel-engine\.js/);
  assert.match(page, /holiday-airport-search\.js/);
  assert.match(page, /holiday-airport-weather-board\.js/);
  for (const id of ['home', 'away']) {
    assert.match(page, new RegExp('id="' + id + '"'));
    assert.match(page, new RegExp('id="' + id + '-search"'));
    assert.match(page, new RegExp('id="' + id + '-search-results" role="listbox"'));
    assert.match(page, new RegExp("HolidayAirportSearch.enhance\\('" + id + "'"));
  }
  assert.match(module, /role', 'option'/);
  assert.match(module, /dispatchEvent\(new Event\('change'/);
  assert.match(module, /Several airports match/);
  assert.doesNotMatch(module, /fetch\(|transformers|\\.onnx|\\.wasm/);
  assert.match(page, /id="airport-weather"/);
  assert.match(page, /id="best-days"/);
  assert.match(page, /id="trip-planner"/);
  assert.match(page, /google-adsense-account/);
  assert.match(page, /"@id":"https:\/\/chrisizworski.com\/#person"/);
});
