import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { AIRPORTS } from '../lib/holiday-travel/busiest-airports.mjs';
import { airportWeather, collectBoard, datesIn, thanksgivingDate, windowState, windowsForYear } from '../lib/holiday-travel/airport-weather.mjs';
import handler from '../api/holiday-airport-weather.js';

const DAY = 86400000;
const iso = (value) => new Date(value).toISOString().slice(0, 10);
const add = (date, offset) => iso(Date.parse(date + 'T12:00:00Z') + offset * DAY);
const nowYear = new Date(Date.now()).getUTCFullYear();
const source = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8'));

test('top 30 airports and committed BTS counts match build-time selection', () => {
  const expected = source.airports
    .filter((a) => Number.isFinite(a.flights) && Number.isFinite(a.lat) && Number.isFinite(a.lon))
    .sort((a, b) => b.flights - a.flights || a.code.localeCompare(b.code))
    .slice(0, 30)
    .map(({ code, city, flights, lat, lon }) => ({ code, city, flights, lat, lon }));
  assert.equal(AIRPORTS.length, 30);
  assert.deepEqual(AIRPORTS, expected);
  const result = spawnSync(process.execPath, ['scripts/holiday-travel/build-airport-weather-list.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('Thanksgiving Friday-before through Tuesday-after math stays correct across years', () => {
  for (const year of [nowYear - 1, nowYear, nowYear + 1]) {
    const [th] = windowsForYear(year);
    const day = thanksgivingDate(year);
    assert.equal(new Date(day + 'T12:00:00Z').getUTCDay(), 4);
    assert.equal(th.start, add(day, -6));
    assert.equal(th.end, add(day, 5));
    assert.equal(datesIn(th).length, 12);
    assert.equal(windowState(new Date(th.start + 'T12:00:00Z')).active?.holiday, 'thanksgiving');
    assert.equal(windowState(new Date(th.end + 'T12:00:00Z')).active?.holiday, 'thanksgiving');
    assert.notEqual(windowState(new Date(add(th.end, 1) + 'T12:00:00Z')).active?.holiday, 'thanksgiving');
  }
});

test('Christmas December 18 through January 2 crosses the year boundary', () => {
  for (const year of [nowYear - 1, nowYear, nowYear + 1]) {
    const xm = windowsForYear(year)[1];
    assert.equal(xm.start, year + '-12-18');
    assert.equal(xm.end, year + 1 + '-01-02');
    assert.equal(datesIn(xm).length, 16);
    assert.equal(windowState(new Date(xm.start + 'T12:00:00Z')).active?.holiday, 'christmas');
    assert.equal(windowState(new Date(xm.end + 'T12:00:00Z')).active?.holiday, 'christmas');
    assert.equal(windowState(new Date((year + 1) + '-01-03T12:00:00Z')).active, null);
  }
});

function fixture(date, phrase = 'Snow showers') {
  // The issue time is deliberately relative to the test invocation.
  const issued = new Date(Date.now() - 15 * 60000).toISOString();
  return {
    alerts: { features: [{ properties: {
      event: 'Winter Storm Warning', headline: 'Winter Storm Warning',
      onset: date + 'T00:00:00-05:00', ends: add(date, 1) + 'T00:00:00-05:00'
    } }] },
    points: { properties: {
      timeZone: 'America/New_York',
      forecast: 'https://api.weather.gov/gridpoints/BOX/1,2/forecast'
    } },
    forecast: { properties: { updated: issued, periods: [
      { name: 'Today', startTime: date + 'T06:00:00-05:00',
        shortForecast: phrase, detailedForecast: 'Conditions could change.' }
    ] } },
    issued
  };
}

function ok(value) { return new Response(JSON.stringify(value), { status: 200 }); }

test('reuses existing NWS hazard/forecast parsing and flags warnings or target weather words', async () => {
  const xm = windowsForYear(nowYear)[1];
  const date = add(xm.start, 2);
  const f = fixture(date);
  const fetcher = async (url) => {
    if (url.includes('/alerts/')) return ok(f.alerts);
    if (url.includes('/points/')) return ok(f.points);
    return ok(f.forecast);
  };
  const result = await airportWeather(AIRPORTS[0], datesIn(xm), fetcher);
  assert.equal(result.issuedAt, f.issued);
  const found = result.days.find((d) => d.date === date);
  assert.equal(found.status, 'flagged');
  assert.deepEqual(found.warnings, ['Winter Storm Warning']);
  assert.deepEqual(found.forecast, ['Snow showers']);
  assert.equal(result.days.find((d) => d.date === add(xm.start, 5)).status, 'unknown');

  const noWarnings = { features: [] };
  const fog = await airportWeather(AIRPORTS[1], [date], async (url) => {
    if (url.includes('/alerts/')) return ok(noWarnings);
    if (url.includes('/points/')) return ok(f.points);
    return ok(fixture(date, 'Areas of fog').forecast);
  });
  assert.equal(fog.days[0].status, 'clear', 'fog alone is not one of the four board hazard topics');
});

test('each airport failure is null-able and a partial NWS outage does not fail collection', async () => {
  const th = windowsForYear(nowYear)[0];
  const date = th.start;
  const f = fixture(date, 'Mostly sunny');
  const badPoint = AIRPORTS[0].lat + ',' + AIRPORTS[0].lon;
  const fetcher = async (url) => {
    if (url.includes(badPoint)) throw new Error('NWS offline for one airport');
    if (url.includes('/alerts/')) return ok({ features: [] });
    if (url.includes('/points/')) return ok(f.points);
    return ok(f.forecast);
  };
  const board = await collectBoard(new Date(date + 'T12:00:00Z'), fetcher);
  assert.equal(board.active, true);
  assert.equal(board.airports.length, 30);
  assert.equal(board.airports[0].errors.length, 2);
  assert.equal(board.airports[0].days[0].status, 'unknown');
  assert.equal(board.airports[1].errors.length, 0);
  assert.equal(board.health.withErrors, 1);
});

test('outside the windows returns a static cached payload without calling NWS', async () => {
  let called = 0;
  const board = await collectBoard(new Date(nowYear + '-07-10T12:00:00Z'), () => { called++; throw new Error('never'); });
  assert.equal(called, 0);
  assert.equal(board.active, false);
  assert.deepEqual(board.airports, []);
  assert.equal(board.nextOpening?.holiday, 'thanksgiving');
});

test('edge API sets noindex and 30-minute CDN cache contract', async () => {
  const response = await handler(new Request('https://example.org/api/holiday-airport-weather', { method: 'POST' }));
  assert.equal(response.status, 405);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  const sourceText = fs.readFileSync('api/holiday-airport-weather.js', 'utf8');
  assert.match(sourceText, /s-maxage=1800/);
  assert.match(sourceText, /stale-while-revalidate/);
});

test('weather board preserves best-days figures, planner links and no em dash', () => {
  const page = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
  assert.match(page, /id="best-days"/);
  assert.match(page, /id="airport-weather"/);
  assert.match(page, /id="trip-planner"/);
  assert.match(page, /holiday-airport-weather-board\.js/);
  const files = ['public/holiday-travel/index.html', 'public/assets/holiday-airport-weather-board.js',
    'api/holiday-airport-weather.js', 'lib/holiday-travel/airport-weather.mjs',
    'lib/holiday-travel/busiest-airports.mjs', 'scripts/holiday-travel/build-airport-weather-list.mjs'];
  for (const path of files) assert.doesNotMatch(fs.readFileSync(path, 'utf8'), /—/, path);
});
