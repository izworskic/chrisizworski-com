const test = require('node:test');
const assert = require('node:assert/strict');
const weather = require('../lib/sunshine-skyway-weather');

test('NWS tabular parser turns official hourly rows into Skyway wind periods', () => {
  const html = `
    <table>
      <tr><td>Hour (EDT)</td><td>13</td><td>14</td><td>15</td><td>16</td></tr>
      <tr><td>Temperature (°F)</td><td>84</td><td>85</td><td>85</td><td>84</td></tr>
      <tr><td>Surface Wind (mph)</td><td>8</td><td>10</td><td>12</td><td>9</td></tr>
      <tr><td>Wind Dir</td><td>SE</td><td>SSE</td><td>S</td><td>SW</td></tr>
      <tr><td>Gust</td><td></td><td>15</td><td>20</td><td></td></tr>
    </table>`;
  const periods = weather.parseNwsTabularForecast(html);
  assert.equal(periods.length, 4);
  assert.equal(periods[0].name, '13:00 EDT');
  assert.equal(periods[0].temperature, 84);
  assert.equal(periods[2].windDirection, 'S');
  assert.equal(periods[2].windSpeed, '12 mph, gusts 20 mph');
  const context = weather.buildWindContext({ periods, alerts: [] });
  assert.equal(context.maxWindMph, 20);
  assert.equal(context.level, 'ROUTINE_CONTEXT');
});

test('NWS Tampa Bay marine-zone parser provides a second official fallback and converts knots to mph', () => {
  const html = `
    <div>NWS Forecast for: Tampa Bay waters (GMZ830)</div>
    <p><b>Today:</b> Southeast winds 5 to 10 knots, becoming southwest this afternoon. Bay and inland waters light chop. Scattered thunderstorms.</p>
    <p><b>Tonight:</b> Northeast winds 10 to 15 knots with gusts up to 20 knots. Bay and inland waters a moderate chop.</p>
    <p><b>Tuesday:</b> East winds around 5 knots. Bay and inland waters smooth.</p>
    <div>Zone Forecast: Tampa Bay waters (GMZ830)</div>`;
  const periods = weather.parseNwsMarineZoneForecast(html);
  assert.equal(periods.length, 3);
  assert.equal(periods[0].name, 'Today');
  assert.match(periods[0].windSpeed, /6-12 mph/);
  assert.equal(periods[1].name, 'Tonight');
  assert.match(periods[1].windSpeed, /12-17 mph, gusts 23 mph/);
  const context = weather.buildWindContext({ periods, alerts: [] });
  assert.equal(context.maxWindMph, 23);
  assert.equal(context.level, 'ROUTINE_CONTEXT');
});

test('40 mph weather context remains context and cannot become operational closure', () => {
  const periods = [{ name: '14:00 EDT', windSpeed: '42 mph', windDirection: 'E', shortForecast: 'NWS hourly tabular forecast' }];
  const wind = weather.buildWindContext({ periods, alerts: [] });
  assert.equal(wind.level, 'HIGH_WIND_CLOSURE_RISK_CONTEXT');
  const operational = weather.resolveOperationalState({
    alertsText: 'FL511 Alerts',
    trafficText: 'Traffic Events',
    sourceHealth: { alerts: { state: 'ok' }, traffic: { state: 'ok' } },
  });
  assert.equal(operational.state, 'NO_CLOSURE_SIGNAL_FOUND');
});

test('Sunshine Skyway API is wired through the resilient weather adapter', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'sunshine-skyway.js'), 'utf8');
  assert.match(api, /sunshine-skyway-weather/);
});
