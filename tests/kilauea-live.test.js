'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  classifyActivity,
  classifyForecastability,
  buildDecision,
  chooseViewpoint,
  weatherScore,
  bestWeatherWindow,
  currentWeather
} = require('../lib/kilauea-decision');

function base(overrides = {}) {
  const now = new Date('2026-09-28T10:00:00Z');
  return {
    now,
    input: {
      eruption: {
        observedAt: '2026-09-28T09:00:00Z',
        text: 'Small overflows continue and strong glow and spatter are visible. Conditions remain favorable. Forecast windows can no longer be modeled due to irregular changes.'
      },
      access: { parkClosed: false, closureUnknown: false, closedViewpoints: [] },
      weather: { hourly: [
        { startTime: '2026-09-28T10:00:00Z', endTime: '2026-09-28T11:00:00Z', shortForecast: 'Rain Showers and Fog', precipProbability: 75, temperature: 58, temperatureUnit: 'F' },
        { startTime: '2026-09-28T15:00:00Z', endTime: '2026-09-28T16:00:00Z', shortForecast: 'Partly Cloudy', precipProbability: 15, temperature: 62, temperatureUnit: 'F' },
        { startTime: '2026-09-29T18:00:00Z', endTime: '2026-09-29T19:00:00Z', shortForecast: 'Mostly Clear', precipProbability: 5, temperature: 63, temperatureUnit: 'F' }
      ] },
      sources: { hvo:{status:'ok',name:'USGS HVO'}, nps:{status:'ok',name:'NPS'}, weather:{status:'ok',name:'NWS'} }
    },
    ...overrides
  };
}

test('classifies overflow/spatter as elevated rather than fountaining', () => {
  assert.equal(classifyActivity('small overflows; strong glow and intermittent spatter').state, 'ELEVATED');
});

test('negated lava-flow wording does not fabricate elevated activity', () => {
  assert.equal(classifyActivity('The eruption is paused. No active lava flows are present.').state, 'PAUSED');
});

test('current fountaining language is classified as active even if historical context is also present', () => {
  const t = 'Lava fountains are ongoing from the north vent. The previous episode lasted nine hours.';
  assert.equal(classifyActivity(t).state, 'FOUNTAINING');
});

test('historical fountaining mention alone does not create an active fountain state', () => {
  const t = 'The previous fountaining episode lasted nine hours. Small overflows and strong glow continue now.';
  assert.equal(classifyActivity(t).state, 'ELEVATED');
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
  input.access = { parkClosed: true, closureUnknown: false, closureReason: 'Park closed due to severe weather.', closedViewpoints: [] };
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'CLOSED');
});

test('unknown NPS access gates every otherwise positive state', () => {
  const { input, now } = base();
  input.eruption.text = 'Lava fountains are ongoing and active.';
  input.access.closureUnknown = true;
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'VERIFY ACCESS');
  assert.equal(d.viewpoint, null);
});

test('stale HVO state blocks confident live recommendation', () => {
  const { input, now } = base();
  input.eruption.observedAt = '2026-09-26T00:00:00Z';
  input.eruption.text = 'Lava fountains are ongoing.';
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'LIMITED');
});

test('missing HVO issuance time fails closed rather than allowing GO NOW', () => {
  const { input, now } = base();
  input.eruption.observedAt = null;
  input.eruption.text = 'Lava fountains are ongoing.';
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'LIMITED');
  assert.match(d.mainReason, /issuance time is unavailable/i);
});

test('mobility and photo preferences materially change viewpoint', () => {
  assert.equal(chooseViewpoint({mobility:'short',experience:'casual'}, {}).id, 'uekahuna');
  assert.equal(chooseViewpoint({mobility:'walk',experience:'photo'}, {}).id, 'keanakakoi');
});

test('current weather must actually contain the current time', () => {
  const rows = [{ startTime:'2026-09-28T08:00:00Z', endTime:'2026-09-28T09:00:00Z', shortForecast:'Clear', precipProbability:0 }];
  assert.equal(currentWeather(rows, new Date('2026-09-28T10:00:00Z')), null);
});

test('missing precipitation remains unknown and cannot improve weather score', () => {
  const row = { startTime:'2026-09-28T15:00:00Z', endTime:'2026-09-28T16:00:00Z', shortForecast:'Clear' };
  assert.equal(weatherScore(row), null);
  assert.equal(bestWeatherWindow([row], new Date('2026-09-28T10:00:00Z'), 'now'), null);
});

test('tomorrow planning uses tomorrow weather and never returns GO NOW from current fountaining', () => {
  const { input, now } = base();
  input.eruption.text = 'Lava fountains are ongoing and active.';
  const d = buildDecision(input, {travel:'here',mobility:'short',experience:'casual',plan:'tomorrow'}, now);
  assert.equal(d.state, 'RECHECK TOMORROW');
  assert.equal(d.wxBest.startTime, '2026-09-29T18:00:00Z');
  assert.doesNotMatch(d.action, /go now/i);
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
  assert.match(html, /"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(html, /"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
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
  assert.match(html, /Reported closed by NPS/);
  assert.match(html, /AbortController/);
  assert.match(html, /kilauea-live-prior-official-v2/);
  assert.match(html, /clearEvidence\(\)/);
});

test('live endpoint budgets staged upstream fallbacks inside the 10-second function envelope', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'kilauea-live.js'), 'utf8');
  assert.match(api, /timeoutMs = 3500/);
  assert.doesNotMatch(api, /timeoutMs = 8500/);
});

function fakeResponse(body, json=false) {
  return { ok:true, status:200, statusText:'OK', text:async()=>String(body), json:async()=>json?body:JSON.parse(body) };
}

function installOfficialFetch({dailyText,messageText}) {
  const originalFetch = global.fetch;
  const originalKey = process.env.NPS_API_KEY;
  process.env.NPS_API_KEY = 'test-key';
  global.fetch = async (url) => {
    url=String(url);
    if (url.includes('/volcano-updates/volcano-messages')) return fakeResponse(`<main>${messageText}</main>`);
    if (url.endsWith('/volcano-updates')) return fakeResponse(`<main>${dailyText}</main>`);
    if (url.includes('developer.nps.gov/api/v1/alerts')) return fakeResponse({data:[]}, true);
    if (url.includes('/planyourvisit/conditions.htm')) return fakeResponse('<main>National Park Service Current Conditions for Hawaiʻi Volcanoes National Park. The park is open. Visitors should check official alerts before travel.</main>');
    if (url.includes('/planyourvisit/eruption-viewing.htm')) return fakeResponse('<main>National Park Service eruption viewing information.</main>');
    if (url.includes('api.weather.gov/points/')) return fakeResponse({properties:{forecastHourly:'https://api.weather.gov/gridpoints/HFO/1,1/forecast/hourly'}}, true);
    if (url.includes('/forecast/hourly')) return fakeResponse({properties:{updateTime:'2026-09-28T10:00:00Z',periods:[{number:1,startTime:'2026-09-28T10:00:00Z',endTime:'2026-09-28T14:00:00Z',temperature:61,temperatureUnit:'F',probabilityOfPrecipitation:{value:60},windSpeed:'8 mph',windDirection:'NE',shortForecast:'Rain Showers and Fog',isDaytime:true},{number:2,startTime:'2026-09-28T15:00:00Z',endTime:'2026-09-28T16:00:00Z',temperature:60,temperatureUnit:'F',probabilityOfPrecipitation:{value:10},windSpeed:'6 mph',windDirection:'NE',shortForecast:'Partly Cloudy',isDaytime:true}]}}, true);
    if (url.includes('air.doh.hawaii.gov')) return fakeResponse('<main>Hawaii air monitoring data page. Current station table rendered separately.</main>');
    if (url.includes('hans-public')) return fakeResponse({notice:'fallback should not be needed',sent:'2026-09-28T09:00:00Z'}, true);
    throw new Error('unexpected URL '+url);
  };
  return () => {
    global.fetch = originalFetch;
    if (originalKey == null) delete process.env.NPS_API_KEY;
    else process.env.NPS_API_KEY = originalKey;
  };
}

test('live API synthesizes official current pages and preserves unpredictable timing guardrail', async () => {
  const handler = require('../api/kilauea-live');
  const restore = installOfficialFetch({
    messageText:'Kilauea Message 2026-09-28 00:15:00 HST Small overflows continue from the north vent. Steam and clouds obscure the vents. Kilauea Message 2026-09-27 20:56:49 HST older',
    dailyText:'HAWAIIAN VOLCANO OBSERVATORY DAILY UPDATE U.S. Geological Survey Monday, September 28, 2026, 12:05 AM HST Current Volcano Alert Level: WATCH Current Aviation Color Code: ORANGE Summary: Small overflows, strong glow and intermittent spatter continue. Forecast windows for this episode can no longer be modeled due to irregular changes. Conditions remain favorable but HVO cannot say with certainty that this leads to another fountain event.'
  });
  const req={method:'GET',query:{travel:'three',mobility:'short',experience:'casual',plan:'now'}};
  let payload; let statusCode;
  const res={setHeader(){},status(code){statusCode=code;return this},json(v){payload=v;return v}};
  try { await handler(req,res); } finally { restore(); }
  assert.equal(statusCode,200);
  assert.equal(payload.ok,true);
  assert.equal(payload.eruption.alertLevel,'WATCH');
  assert.equal(payload.eruption.colorCode,'ORANGE');
  assert.equal(payload.decision.forecastability.state,'UNPREDICTABLE');
  assert.equal(payload.decision.state,'WAIT FOR CONFIRMATION');
  assert.equal(payload.decision.viewpoint.id,'uekahuna');
  assert.equal(payload.sources.hvo.status,'ok');
  assert.equal(payload.access.closureUnknown,false);
  assert.equal(payload.sources.nps.status,'ok');
  assert.match(payload.sources.hvo.note,/short message controls current activity/i);
});

test('newer HVO pause message overrides contradictory older daily fountaining', async () => {
  const handler = require('../api/kilauea-live');
  const restore = installOfficialFetch({
    messageText:'Kilauea Message 2026-09-28 00:15:00 HST The eruption is paused. No active lava flows are present. Kilauea Message 2026-09-27 20:56:49 HST older',
    dailyText:'HAWAIIAN VOLCANO OBSERVATORY DAILY UPDATE U.S. Geological Survey Monday, September 28, 2026, 12:05 AM HST Current Volcano Alert Level: WATCH Current Aviation Color Code: ORANGE Summary: Lava fountains are ongoing and active at the north vent.'
  });
  const req={method:'GET',query:{travel:'here',mobility:'short',experience:'casual',plan:'now'}};
  let payload;
  const res={setHeader(){},status(){return this},json(v){payload=v;return v}};
  try { await handler(req,res); } finally { restore(); }
  assert.equal(payload.eruption.activity.state,'PAUSED');
  assert.equal(payload.decision.state,'WAIT');
  assert.match(payload.sources.hvo.note,/short message controls current activity/i);
});
