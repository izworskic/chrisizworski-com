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
        { startTime: '2026-09-28T11:00:00Z', endTime: '2026-09-28T12:00:00Z', shortForecast: 'Mostly Cloudy', precipProbability: 30 },
        { startTime: '2026-09-28T13:00:00Z', endTime: '2026-09-28T14:00:00Z', shortForecast: 'Mostly Cloudy', precipProbability: 30 },
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

test('a past episode beginning and current negation cannot become live fountaining', () => {
  assert.equal(classifyActivity('The previous fountaining episode began on August 25 and ended that evening. No fountaining is occurring now.').state, 'PAUSED');
  assert.notEqual(classifyActivity('Since the end of fountaining episode 54, inflation patterns have changed. Possible Outcomes: Eruption returns to fountaining. Lava flows could continue.').state, 'FOUNTAINING');
  assert.notEqual(classifyActivity('Inflation continues. Possible Outcomes: New lava flows and overflows could occur.').state, 'ELEVATED');
  assert.equal(classifyActivity('STATUS REPORT Summary: Imagery shows a shallow magma intrusion. Emplacement of the Dike Intrusion: Previous overflows were visible. Interpretation: Fountaining began in an earlier episode.').state, 'UNREST');
});

test('all listed viewpoints closed overrides current fountaining', () => {
  const { input, now } = base();
  input.eruption.text = 'Lava fountains are ongoing.';
  input.access.closedViewpoints = ['uekahuna','kilauea-overlook','keanakakoi'];
  const d = buildDecision(input, {travel:'here'}, now);
  assert.equal(d.state, 'NO LISTED VIEWPOINT');
  assert.equal(d.viewpoint, null);
});

test('missing weather and air do not permit a confident live travel recommendation', () => {
  const { input, now } = base();
  input.eruption.text = 'Lava fountains are ongoing.';
  input.weather.hourly = [];
  input.sources.weather.status = 'offline';
  assert.equal(buildDecision(input, {travel:'one'}, now).state, 'VERIFY WEATHER');
  input.weather.hourly = [{startTime:'2026-09-28T09:00:00Z',endTime:'2026-09-28T12:00:00Z',shortForecast:'Clear',precipProbability:0}];
  input.sources.weather.status = 'ok';
  input.sources.air = {status:'offline'};
  assert.equal(buildDecision(input, {travel:'one'}, now).state, 'VERIFY AIR');
  input.sources.air.status = 'ok';
  input.air = {advisoryDetected:true};
  assert.equal(buildDecision(input, {travel:'one'}, now).state, 'CHECK AIR');
});

test('arrival weather governs travel and the chosen window cannot end before arrival', () => {
  const { input, now } = base();
  input.eruption.text = 'Lava fountains are ongoing.';
  input.weather.hourly = [
    {startTime:'2026-09-28T10:00:00Z',endTime:'2026-09-28T11:00:00Z',shortForecast:'Clear',precipProbability:0},
    {startTime:'2026-09-28T11:00:00Z',endTime:'2026-09-28T12:00:00Z',shortForecast:'Rain Showers and Fog',precipProbability:90}
  ];
  const d = buildDecision(input, {travel:'one'}, now);
  assert.equal(d.state, 'MIXED');
  assert.equal(d.wxBest.startTime, '2026-09-28T11:00:00Z');
  input.eruption.observedAt = '2026-09-28T12:00:00Z';
  assert.equal(buildDecision(input, {travel:'one'}, now).state, 'LIMITED');
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

test('clear weather outranks partial cloud cover without double-counting adjectives', () => {
  const score = shortForecast => weatherScore({shortForecast,precipProbability:0});
  assert.ok(score('Sunny') > score('Mostly Sunny'));
  assert.ok(score('Mostly Sunny') > score('Partly Cloudy'));
  assert.ok(score('Partly Cloudy') > score('Mostly Cloudy'));
  const d = new Date('2026-09-28T11:20:00Z');
  const window = bestWeatherWindow([{startTime:'2026-09-28T11:00:00Z',endTime:'2026-09-28T12:00:00Z',shortForecast:'Clear',precipProbability:0}],new Date('2026-09-28T10:20:00Z'),'now',d);
  assert.equal(window.startTime,d.toISOString());
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
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'synced-national-tools', 'kilauea-live', 'index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/kilauea-live\/">/);
  assert.doesNotMatch(html, /noindex/i);
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
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'synced-national-tools', 'kilauea-live', 'index.html'), 'utf8');
  for (const value of ['travel','mobility','experience','plan']) assert.match(html, new RegExp(`data-control="${value}"`));
  assert.match(html, /id="map"/);
  assert.match(html, /Since your last check/);
  assert.match(html, /youtube-nocookie\.com\/embed\/gXKuUyKt8mc/);
  assert.match(html, /The official voices behind this answer/i);
  assert.match(html, /No cached live value is being substituted/);
  assert.match(html, /Reported closed by NPS/);
  assert.match(html, /AbortController/);
  assert.match(html, /kilauea-live-prior-official-v2/);
  assert.match(html, /clearEvidence\(\)/);
});

test('Kilauea copy follows interpretive-ranger voice without impersonating NPS', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'synced-national-tools', 'kilauea-live', 'index.html'), 'utf8');
  const decision = fs.readFileSync(path.join(__dirname, '..', 'lib', 'kilauea-decision.js'), 'utf8');
  const combined = `${html}\n${decision}`;
  assert.match(html, /USGS Hawaiian Volcano Observatory \(HVO\)/);
  assert.match(html, /What the summit is telling you/);
  assert.match(html, /Use the camera the way a ranger would use a window/);
  assert.match(html, /The official voices behind this answer/);
  assert.match(html, /Independent interpretive tool; not an NPS or USGS product/);
  assert.match(decision, /Tomorrow’s weather can be forecast; tomorrow’s eruption cannot/);
  assert.match(decision, /The eruption is active; the weather is hiding the story/);
  assert.match(decision, /look across Kaluapele before narrowing in on the vent/i);
  for (const phrase of ['breathtaking','hidden gem','must-see','adventure awaits','nature’s raw power','immerse yourself']) {
    assert.doesNotMatch(combined, new RegExp(phrase, 'i'));
  }
  assert.doesNotMatch(combined, /\u2014/);
});

test('Kilauea is discoverable as a National Tool and the old lab URL redirects permanently', () => {
  const vercel = fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'public', 'sitemap-breakout-live.xml'), 'utf8');
  const live = fs.readFileSync(path.join(__dirname, '..', 'public', 'synced-national-tools', 'live-decisions', 'index.html'), 'utf8');
  const hub = fs.readFileSync(path.join(__dirname, '..', 'public', 'synced-national-tools', 'index.html'), 'utf8');
  assert.match(vercel, /\/labs\/kilauea-live/);
  assert.match(vercel, /\/national-tools\/kilauea-live/);
  assert.match(sitemap, /https:\/\/chrisizworski\.com\/national-tools\/kilauea-live\//);
  assert.match(live, /href="\/national-tools\/kilauea-live\/"/);
  assert.match(hub, /data-tool-id="kilauea-live"/);
});

test('live endpoint budgets staged upstream fallbacks inside the 10-second function envelope', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'kilauea-live.js'), 'utf8');
  assert.match(api, /timeoutMs = 3500/);
  assert.doesNotMatch(api, /timeoutMs = 8500/);
});

function fakeResponse(body, json=false) {
  return { ok:true, status:200, statusText:'OK', text:async()=>String(body), json:async()=>json?body:JSON.parse(body) };
}

function hawaiiNowStamp() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Pacific/Honolulu',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(Date.now() - 10 * 60 * 1000)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

// HVO fixtures must be relative to the real clock: the decision layer rejects
// eruption reports older than HVO_STALE_HOURS, so hard-coded dates go stale on their own.
function hvoStamps(minutesAgo) {
  const at = new Date(Date.now() - minutesAgo * 60 * 1000);
  const fmt = (opts) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Pacific/Honolulu',...opts}).formatToParts(at).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const n = fmt({year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const l = fmt({weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
  return {
    message: `${n.year}-${n.month}-${n.day} ${n.hour}:${n.minute}:${n.second}`,
    daily: `${l.weekday}, ${l.month} ${l.day}, ${l.year}, ${l.hour}:${l.minute} ${l.dayPeriod}`
  };
}

function dohFixture() {
  const stamp = hawaiiNowStamp();
  const station=(name,value,indexVal,indexName)=>({name,Active:1,display:true,DateVal:stamp,latitude:'19.5',longitude:'-155.1',monitors:[{name:'SO2',Pollutantname:'SO2',unit:'ppm',value:String(value),stationName:name,indexVal,indexName,Active:1}]});
  return `<html><script>var Data=${JSON.stringify([station('Hilo',0.001,0,'Good'),station('Kona',0.002,1,'Good'),station('Pahala',0.015,20,'Good')])};</script></html>`;
}

function installOfficialFetch({dailyText,messageText}) {
  const originalFetch = global.fetch;
  const originalKey = process.env.NPS_API_KEY;
  delete process.env.NPS_API_KEY;
  global.fetch = async (url) => {
    url=String(url);
    if (url.includes('/volcano-updates/volcano-messages')) return fakeResponse(`<main>${messageText}</main>`);
    if (url.endsWith('/volcano-updates')) return fakeResponse(`<main>${dailyText}</main>`);
    if (url.includes('/havo/park-alerts-havo.json')) return fakeResponse([{site_code:'havo',is_active:1,category:'Danger',title:'Kīlauea eruption',description:'Volcanic eruptions can be hazardous. Stay out of closed areas and monitor air quality.',url:'https://www.nps.gov/havo/planyourvisit/lava2.htm'}], true);
    if (url.includes('developer.nps.gov/api/v1/alerts')) throw new Error('developer API fallback should not be needed when NPS park alert feed is healthy');
    if (url.includes('/planyourvisit/conditions.htm')) return fakeResponse('<main>National Park Service Current Conditions for Hawaiʻi Volcanoes National Park. Visitors should check official alerts before travel.</main>');
    if (url.includes('/planyourvisit/eruption-viewing.htm')) return fakeResponse('<main>National Park Service eruption viewing information.</main>');
    if (url.includes('api.weather.gov/points/')) return fakeResponse({properties:{forecastHourly:'https://api.weather.gov/gridpoints/HFO/1,1/forecast/hourly'}}, true);
    if (url.includes('/forecast/hourly')) return fakeResponse({properties:{updateTime:new Date().toISOString(),periods:[{number:1,startTime:new Date(Date.now()-5*60*1000).toISOString(),endTime:new Date(Date.now()+55*60*1000).toISOString(),temperature:61,temperatureUnit:'F',probabilityOfPrecipitation:{value:60},windSpeed:'8 mph',windDirection:'NE',shortForecast:'Rain Showers and Fog',isDaytime:true},{number:2,startTime:new Date(Date.now()+60*60*1000).toISOString(),endTime:new Date(Date.now()+2*60*60*1000).toISOString(),temperature:60,temperatureUnit:'F',probabilityOfPrecipitation:{value:10},windSpeed:'6 mph',windDirection:'NE',shortForecast:'Partly Cloudy',isDaytime:true},{number:3,startTime:new Date(Date.now()+175*60*1000).toISOString(),endTime:new Date(Date.now()+4*60*60*1000).toISOString(),shortForecast:'Mostly Cloudy',probabilityOfPrecipitation:{value:30}}]}}, true);
    if (url.includes('air.doh.hawaii.gov/HawaiiSO2/')) return fakeResponse(dohFixture());
    if (url.includes('hans-public')) return fakeResponse({notice:'fallback should not be needed',sent:new Date().toISOString()}, true);
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
  const msg = hvoStamps(30), daily = hvoStamps(40), older = hvoStamps(240);
  const restore = installOfficialFetch({
    messageText:`Kilauea Message ${msg.message} HST Small overflows continue from the north vent. Steam and clouds obscure the vents. Kilauea Message ${older.message} HST older`,
    dailyText:`HAWAIIAN VOLCANO OBSERVATORY DAILY UPDATE U.S. Geological Survey ${daily.daily} HST Current Volcano Alert Level: WATCH Current Aviation Color Code: ORANGE Summary: Small overflows, strong glow and intermittent spatter continue. Forecast windows for this episode can no longer be modeled due to irregular changes. Conditions remain favorable but HVO cannot say with certainty that this leads to another fountain event.`
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
  assert.equal(payload.sources.air.status,'ok');
  assert.equal(payload.air.numericVerified,true);
  assert.equal(payload.air.readings.length,3);
  assert.equal(payload.sourceHealth,'ok');
  assert.match(payload.sources.nps.note,/park-alert JSON checked directly/i);
  assert.match(payload.sources.air.note,/15-minute Hawaiʻi Island SO₂ station table/i);
  assert.match(payload.sources.hvo.note,/short message controls current activity/i);
});

test('newer HVO pause message overrides contradictory older daily fountaining', async () => {
  const handler = require('../api/kilauea-live');
  const msg = hvoStamps(30), daily = hvoStamps(40), older = hvoStamps(240);
  const restore = installOfficialFetch({
    messageText:`Kilauea Message ${msg.message} HST The eruption is paused. No active lava flows are present. Kilauea Message ${older.message} HST older`,
    dailyText:`HAWAIIAN VOLCANO OBSERVATORY DAILY UPDATE U.S. Geological Survey ${daily.daily} HST Current Volcano Alert Level: WATCH Current Aviation Color Code: ORANGE Summary: Lava fountains are ongoing and active at the north vent.`
  });
  const req={method:'GET',query:{travel:'here',mobility:'short',experience:'casual',plan:'now'}};
  let payload;
  const res={setHeader(){},status(){return this},json(v){payload=v;return v}};
  try { await handler(req,res); } finally { restore(); }
  assert.equal(payload.eruption.activity.state,'PAUSED');
  assert.equal(payload.decision.state,'WAIT');
  assert.match(payload.sources.hvo.note,/short message controls current activity/i);
});

test('official status reports remain usable when the short-message page fails', async () => {
  const handler = require('../api/kilauea-live');
  const daily = hvoStamps(20);
  const restore = installOfficialFetch({
    messageText:'',
    dailyText:`HAWAIIAN VOLCANO OBSERVATORY STATUS REPORT U.S. Geological Survey ${daily.daily} HST Current Volcano Alert Level: WATCH Current Aviation Color Code: ORANGE Summary: Inflation continues at the summit. Possible Outcomes: Lava fountains are ongoing in a hypothetical scenario. It is not possible to forecast an exact outcome.`
  });
  const original = global.fetch;
  global.fetch = async url => {
    if (String(url).includes('/volcano-updates/volcano-messages')) throw new Error('temporary message outage');
    if (String(url).includes('hans-public')) throw new Error('fallback should not be used');
    return original(url);
  };
  let payload;
  const res = {setHeader(){},status(){return this},json(v){payload=v;return v}};
  try { await handler({method:'GET',query:{travel:'here'}},res); } finally { restore(); }
  assert.equal(payload.sources.hvo.status, 'ok');
  assert.equal(payload.sources.hvo.observedAt, payload.eruption.dailyObservedAt);
  assert.equal(payload.eruption.activity.state, 'UNREST');
  assert.equal(payload.eruption.forecastability.state, 'UNPREDICTABLE');
  assert.match(payload.sources.hvo.note, /status report/);
});
