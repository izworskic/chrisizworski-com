'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const weather = require('../lib/launch-weather-intelligence');
const NOW = Date.parse('2026-11-01T11:00:00Z');
const TARGET = '2026-11-02T12:00:00Z';
const LAUNCH = { net: TARGET, netPrecision: 'minute' };
function grid(updateTime = new Date(NOW - 3600000).toISOString(), overrides = {}) {
  const validTime = '2026-11-01T00:00:00Z/PT72H';
  const field = (uom, value) => ({ uom, values: [{ validTime, value }] });
  return { properties: {
    updateTime,
    probabilityOfThunder: field('wmoUnit:percent', 55),
    probabilityOfPrecipitation: field('wmoUnit:percent', 65),
    windSpeed: field('wmoUnit:m_s-1', 8),
    windGust: field('wmoUnit:m_s-1', 17),
    skyCover: field('wmoUnit:percent', 75),
    ...overrides
  } };
}
const hourly = { properties: { periods: [{
  startTime: '2026-11-01T00:00:00Z', endTime: '2026-11-04T00:00:00Z',
  shortForecast: 'Scattered Thunderstorms'
}] } };

test('NWS field parsing uses valid intervals, units and strictly fresh grids', () => {
  const g = grid();
  const gust = weather.gridValue(g, 'windGust', Date.parse(TARGET), NOW);
  assert.equal(gust.value, 17);
  assert.equal(gust.uom, 'wmoUnit:m_s-1');
  assert.equal(weather.gridValue(g, 'windGust', Date.parse('2026-11-10T10:00:00Z'), NOW), null);
  assert.equal(weather.gridValue(grid('2026-10-29T00:00:00Z'), 'windGust', Date.parse(TARGET), NOW), null);
  assert.equal(weather.gridValue(grid(new Date(NOW + 2 * 3600000).toISOString()), 'windGust', Date.parse(TARGET), NOW), null);
});
test('launch-side forecast keeps the risk signals separate from range approval', () => {
  const out = weather.evaluate(grid(), hourly, LAUNCH, NOW,
    weather.SITES.florida, 'https://api.weather.gov/gridpoints/MLB/50,60');
  assert.equal(out.status, 'forecast');
  assert.equal(out.level, 'elevated');
  assert.deepEqual(out.signals.map(s => s.id), ['thunder', 'rain', 'wind']);
  assert.equal(out.readings.thunderPercent, 55);
  assert.equal(out.readings.precipitationPercent, 65);
  assert.equal(out.readings.gustMph, 38);
  assert.equal(out.timeline.length, 5);
  assert.equal(out.officialApproval, 'not-verified');
  assert.equal(out.officialProbabilityOfViolation, null);
  assert.match(out.detail, /not a launch probability/);
});
test('clear local weather fields do not turn into an official favorable launch verdict', () => {
  const validTime = '2026-11-01T00:00:00Z/PT72H';
  const g = grid(undefined, {
    probabilityOfThunder: { uom: 'wmoUnit:percent', values: [{ validTime, value: 2 }] },
    probabilityOfPrecipitation: { uom: 'wmoUnit:percent', values: [{ validTime, value: 5 }] },
    windGust: { uom: 'wmoUnit:m_s-1', values: [{ validTime, value: 4 }] }
  });
  const out = weather.evaluate(g, { properties: { periods: [] } }, LAUNCH, NOW,
    weather.SITES.florida, 'https://api.weather.gov/gridpoints/MLB/50,60');
  assert.equal(out.level, 'observed');
  assert.equal(out.signals.length, 0);
  assert.equal(out.officialApproval, 'not-verified');
  assert.doesNotMatch(out.label, /go for launch|approval|safe/i);
});
test('missing, stale, or wrong-unit data never becomes reassuring', () => {
  const empty = weather.evaluate({ properties: { updateTime: new Date(NOW - 3600000).toISOString() } },
    { properties: { periods: [] } }, LAUNCH, NOW, weather.SITES.texas);
  assert.equal(empty.level, 'unknown');
  const stale = weather.evaluate(grid('2026-10-25T12:00:00Z'), hourly, LAUNCH, NOW, weather.SITES.florida);
  assert.equal(stale.level, 'unknown');
  const data = grid(undefined, {
    probabilityOfThunder: { uom: 'wmoUnit:kelvin', values: [{ validTime: '2026-11-01T00:00:00Z/PT72H', value: 95 }] }
  });
  const samples = weather.sample(data, Date.parse(TARGET), NOW);
  assert.equal(samples.readings.thunderPercent, null);
});
test('date-only and out-of-horizon targets do not trigger upstream forecast calls', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error('should not be called'); };
  const one = await weather.launchWeatherFor({ id: 'california' }, { ...LAUNCH, netPrecision: 'day' }, fetcher, NOW);
  const two = await weather.launchWeatherFor({ id: 'california' },
    { ...LAUNCH, net: '2026-11-20T12:00:00Z' }, fetcher, NOW);
  assert.equal(one.status, 'unknown');
  assert.equal(two.status, 'unknown');
  assert.equal(calls, 0);
});
test('live NWS range-area integration never requires credentials and bounds requested domains', async () => {
  const urls = [];
  const fetcher = async (url) => {
    urls.push(url);
    if (url.includes('/points/')) return { properties: {
      forecastGridData: 'https://api.weather.gov/gridpoints/MLB/50,60',
      forecastHourly: 'https://api.weather.gov/gridpoints/MLB/50,60/forecast/hourly'
    } };
    if (url.endsWith('/hourly')) return hourly;
    return grid();
  };
  const out = await weather.launchWeatherFor({ id: 'florida' }, LAUNCH, fetcher, NOW);
  assert.equal(out.status, 'forecast');
  assert.ok(urls.length >= 2);
  assert.ok(urls.every(x => x.startsWith('https://api.weather.gov/')));
  assert.match(out.officialUrl, /patrick\.spaceforce\.mil/);
  assert.equal(out.site.approximation, 'Regional reference point, not the rocket pad');
});
test('NWS discovery errors and arbitrary grid URL injection fail closed', async () => {
  const out = await weather.launchWeatherFor({ id: 'virginia' }, LAUNCH, async url => {
    if (url.includes('/points/')) return { properties: { forecastGridData: 'https://evil.example.com/gridpoints/MLB/1,2' } };
    throw new Error('must never fetch attacker URL');
  }, NOW);
  assert.equal(out.status, 'unknown');
  assert.equal(out.officialApproval, 'not-verified');
  assert.equal(out.sourceUrl, null);
});
