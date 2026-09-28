'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyActivity, classifyForecastability, buildDecision, chooseViewpoint } = require('../lib/kilauea-decision');

function base(overrides = {}) {
  const now = new Date('2026-09-28T10:00:00Z');
  return {
    now,
    input: {
      eruption: {
        observedAt: '2026-09-28T09:00:00Z',
        text: 'Small overflows continue and strong glow and spatter are visible. Conditions remain favorable. Forecast windows can no longer be modeled due to irregular changes.'
      },
      access: { parkClosed: false, closedViewpoints: [] },
      weather: { hourly: [
        { startTime: '2026-09-28T10:00:00Z', shortForecast: 'Rain Showers and Fog', precipProbability: 75, temperature: 58, temperatureUnit: 'F' },
        { startTime: '2026-09-28T15:00:00Z', shortForecast: 'Partly Cloudy', precipProbability: 15, temperature: 62, temperatureUnit: 'F' }
      ] },
      sources: { hvo:{status:'ok',name:'USGS HVO'}, nps:{status:'ok',name:'NPS'}, weather:{status:'ok',name:'NWS'} }
    },
    ...overrides
  };
}

test('classifies overflow/spatter as elevated rather than fountaining', () => {
  assert.equal(classifyActivity('small overflows; strong glow and intermittent spatter').state, 'ELEVATED');
});

test('honors official inability to model a fountain window', () => {
  assert.equal(classifyForecastability('Forecast windows can no longer be modeled due to irregular changes').state, 'UNPREDICTABLE');
});

test('three-hour traveler is told to wait for confirmation when timing is unpredictable', () => {
  const { input, now } = base();
  const d = buildDecision(input, {travel:'three',mobility:'short',experience:'casual',plan:'now'}, now);
  assert.equal(d.state, 'WAIT FOR CONFIRMATION');
  assert.match(d.action, /Do not chase a modeled eruption time/i);
});

test('nearby traveler gets watching state rather than fake countdown', () => {
  const { input, now } = base();
  const d = buildDecision(input, {travel:'here',mobility:'short',experience:'casual',plan:'now'}, now);
  assert.equal(d.state, 'WATCHING');
  assert.match(d.mainReason, /cannot be modeled/i);
});

test('hard closure always overrides attractive eruption state', () => {
  const { input, now } = base();
  input.eruption.text = 'Lava fountains are ongoing and active.';
  input.access = { parkClosed: true, closureReason: 'Park closed due to severe weather.', closedViewpoints: [] };
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'CLOSED');
});

test('stale HVO state blocks confident live recommendation', () => {
  const { input, now } = base();
  input.eruption.observedAt = '2026-09-26T00:00:00Z';
  input.eruption.text = 'Lava fountains are ongoing.';
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'LIMITED');
});

test('mobility and photo preferences materially change viewpoint', () => {
  assert.equal(chooseViewpoint({mobility:'short',experience:'casual'}, {}).id, 'uekahuna');
  assert.equal(chooseViewpoint({mobility:'walk',experience:'photo'}, {}).id, 'keanakakoi');
});

const fs = require('node:fs');
const path = require('node:path');

test('current fountaining language is classified as active even if historical context is also present', () => {
  const t = 'Lava fountains are ongoing from the north vent. The previous episode lasted nine hours.';
  assert.equal(classifyActivity(t).state, 'FOUNTAINING');
});

test('historical fountaining mention alone does not create an active fountain state', () => {
  const t = 'The previous fountaining episode lasted nine hours. Small overflows and strong glow continue now.';
  assert.equal(classifyActivity(t).state, 'ELEVATED');
});

test('mobile page exposes the decision before data machinery and labels viewing windows honestly', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'labs', 'kilauea-live', 'index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /Is Kīlauea worth going to right now\?/);
  assert.match(html, /Best window/);
  assert.match(html, /Main reason/);
  assert.match(html, /Quick action/);
  assert.match(html, /better <em>viewing<\/em> window/);
  assert.match(html, /It is not an eruption prediction/);
  assert.doesNotMatch(html, /eruption countdown/i);
});

test('page has causal controls, decision map, change layer, webcam and provenance', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'labs', 'kilauea-live', 'index.html'), 'utf8');
  for (const value of ['travel','mobility','experience','plan']) assert.match(html, new RegExp(`data-control="${value}"`));
  assert.match(html, /id="map"/);
  assert.match(html, /Since your last check/);
  assert.match(html, /youtube-nocookie\.com\/embed\/tk0tfYDxrUA/);
  assert.match(html, /Sources & status/i);
  assert.match(html, /No cached live value is being substituted/);
});

test('live API synthesizes official current pages and preserves unpredictable timing guardrail', async () => {
  const handler = require('../api/kilauea-live');
  const originalFetch = global.fetch;
  const fake = (body, json=false) => ({ ok:true, status:200, statusText:'OK', text:async()=>String(body), json:async()=>json?body:JSON.parse(body) });
  global.fetch = async (url) => {
    url=String(url);
    if (url.includes('/volcano-updates/volcano-messages')) return fake('<main>Kilauea Message 2026-09-27 10:15:00 HST Small overflows continue from the north vent. Steam and clouds obscure the vents. Kilauea Message 2026-09-26 20:56:49 HST older</main>');
    if (url.endsWith('/volcano-updates')) return fake('<main>HAWAIIAN VOLCANO OBSERVATORY DAILY UPDATE U.S. Geological Survey Sunday, September 27, 2026, 8:50 AM HST Current Volcano Alert Level: WATCH Current Aviation Color Code: ORANGE Summary: Small overflows, strong glow and intermittent spatter continue. Forecast windows for this episode can no longer be modeled due to irregular changes. Conditions remain favorable but HVO cannot say with certainty that this leads to another fountain event.</main>');
    if (url.includes('/planyourvisit/conditions.htm')) return fake('<main>Current Conditions. The park is open. Visitors should check weather, alerts, construction notices, road conditions, trail conditions, and official National Park Service guidance before travel.</main>');
    if (url.includes('/planyourvisit/eruption-viewing.htm')) return fake('<main>Eruption viewing information.</main>');
    if (url.includes('api.weather.gov/points/')) return fake({properties:{forecastHourly:'https://api.weather.gov/gridpoints/HFO/1,1/forecast/hourly'}}, true);
    if (url.includes('/forecast/hourly')) return fake({properties:{updateTime:'2026-09-27T20:00:00Z',periods:[{number:1,startTime:'2026-09-28T20:00:00Z',endTime:'2026-09-28T21:00:00Z',temperature:61,temperatureUnit:'F',probabilityOfPrecipitation:{value:60},windSpeed:'8 mph',windDirection:'NE',shortForecast:'Rain Showers and Fog',isDaytime:true},{number:2,startTime:'2026-09-28T23:00:00Z',endTime:'2026-09-29T00:00:00Z',temperature:60,temperatureUnit:'F',probabilityOfPrecipitation:{value:10},windSpeed:'6 mph',windDirection:'NE',shortForecast:'Partly Cloudy',isDaytime:true}]}}, true);
    if (url.includes('air.doh.hawaii.gov')) return fake('<main>Hawaii air monitoring data page. Current station table rendered separately.</main>');
    throw new Error('unexpected URL '+url);
  };
  const req={method:'GET',query:{travel:'three',mobility:'short',experience:'casual',plan:'now'}};
  let payload; let statusCode;
  const res={setHeader(){},status(code){statusCode=code;return this},json(v){payload=v;return v}};
  try { await handler(req,res); } finally { global.fetch=originalFetch; }
  assert.equal(statusCode,200);
  assert.equal(payload.ok,true);
  assert.equal(payload.eruption.alertLevel,'WATCH');
  assert.equal(payload.eruption.colorCode,'ORANGE');
  assert.equal(payload.decision.forecastability.state,'UNPREDICTABLE');
  assert.equal(payload.decision.state,'WAIT FOR CONFIRMATION');
  assert.equal(payload.decision.viewpoint.id,'uekahuna');
  assert.equal(payload.sources.hvo.status,'ok');
  assert.equal(payload.access.closureUnknown,true);
  assert.equal(payload.sources.nps.status,'degraded');
  assert.match(payload.sources.hvo.note,/newer HVO short message/i);
});
