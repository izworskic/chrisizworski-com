const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const doc = require('../data/rockhounding/michigan-hunt-sites.json');
const {assessSite, assessAll, parseLatestObs, onshore, fetchFactor, matchAlerts} = require('../lib/rockhounding/hunt-conditions.cjs');
const handler = require('../api/michigan-rockhounding.js');

const NOW = Date.UTC(2026, 9, 16, 18) / 1000;
const site = id => doc.sites.find(s => s.id === id);
function hourly(profile, {temp = 45, rain = () => 0} = {}) {
  const h = {time: [], wind_speed_10m: [], wind_direction_10m: [], wind_gusts_10m: [], precipitation: [], temperature_2m: []};
  for (let i = -72; i < 72; i++) {
    const [s, d] = profile(i);
    h.time.push(NOW + i * 3600); h.wind_speed_10m.push(s); h.wind_direction_10m.push(d);
    h.wind_gusts_10m.push(s * 1.3); h.precipitation.push(rain(i)); h.temperature_2m.push(temp);
  }
  return h;
}
const agate = site('agate-beach-grand-marais');
const blowThenCalm = i => i < -40 ? [6, 200] : i < -10 ? [30, agate.shore.facesDeg] : [8, 200];

test('site data: every beach has a computed shore direction, NWS zones, a rule and an official source', () => {
  assert.equal(doc.sites.length, 15);
  const ids = new Set();
  for (const s of doc.sites) {
    assert.ok(!ids.has(s.id)); ids.add(s.id);
    assert.ok(doc.rules[s.rule], s.id + ' rule');
    assert.match(s.source, /^https:\/\//);
    assert.ok(s.nws.landZones.length >= 1, s.id + ' land zone');
    assert.ok(s.stones.length >= 1);
    if (s.inland) continue;
    assert.ok(Number.isFinite(s.shore.facesDeg) && s.shore.facesDeg >= 0 && s.shore.facesDeg < 360, s.id);
    assert.ok(s.nws.marineZones.length >= 1, s.id + ' marine zone');
    assert.ok(Math.abs(s.shore.lat - s.pin[0]) < 0.05 && Math.abs(s.shore.lon - s.pin[1]) < 0.05, s.id + ' shore point near pin');
  }
  // National lakeshores never read as places you can collect.
  for (const id of ['miners-beach', 'glen-haven']) assert.equal(site(id).rule, 'nps');
  assert.match(doc.rules.nps.label, /No collecting/);
  assert.match(doc.rules.state.detail, /25 pounds per person per year/);
});

test('geometry: only wind from the lake toward the beach counts, scaled by fetch', () => {
  assert.equal(onshore(30, 350, 350, 233), 30);
  assert.equal(onshore(30, 170, 350, 233), 0);
  assert.ok(Math.abs(onshore(30, 50, 350, 233) - 15) < 0.01);
  assert.ok(fetchFactor(17) < fetchFactor(233));
  assert.equal(fetchFactor(500), 1);
  // A point with 250 degrees of open water takes a wind 58 degrees off its axis nearly head-on.
  assert.ok(onshore(28, 0, 58, 211, 250) > onshore(28, 0, 58, 211, 180) * 1.5);
});

test('a strong onshore blow that has eased reads as freshly worked', () => {
  const r = assessSite(agate, {hourly: hourly(blowThenCalm), alerts: {features: []}, buoys: {}, nowS: NOW});
  assert.equal(r.verdict.code, 'PRIME');
  assert.equal(r.storm.peakWindMph, 30);
  assert.equal(r.storm.peakFrom, 'N');
  assert.ok(r.storm.easedForH >= 9);
});

test('the same blow from offshore leaves the beach quiet', () => {
  const r = assessSite(agate, {hourly: hourly(i => i < -10 && i > -40 ? [30, 170] : [8, 200]), alerts: {features: []}, buoys: {}, nowS: NOW});
  assert.equal(r.verdict.code, 'QUIET');
  assert.equal(r.storm.peakWindMph, null);
});

test('onshore wind right now means stay off, even after a long blow', () => {
  const r = assessSite(agate, {hourly: hourly(i => i < -30 ? [8, 200] : [28, agate.shore.facesDeg]), alerts: {features: []}, buoys: {}, nowS: NOW});
  assert.equal(r.verdict.code, 'STORM');
});

test('NWS beach hazards for the shore zone stops a hunt; offshore gale with offshore wind is only a note', () => {
  const shore = {features: [{properties: {event: 'Beach Hazards Statement', affectedZones: ['https://api.weather.gov/zones/forecast/' + agate.nws.landZones[0]]}}]};
  assert.equal(assessSite(agate, {hourly: hourly(blowThenCalm), alerts: shore, buoys: {}, nowS: NOW}).verdict.code, 'STORM');
  const gale = {features: [{properties: {event: 'Gale Warning', affectedZones: ['https://api.weather.gov/zones/forecast/' + agate.nws.marineZones[0]]}}]};
  const r = assessSite(agate, {hourly: hourly(blowThenCalm), alerts: gale, buoys: {}, nowS: NOW});
  assert.equal(r.verdict.code, 'PRIME');
  assert.ok(r.notes.some(n => n.code === 'MARINE'));
  const elsewhere = {features: [{properties: {event: 'Beach Hazards Statement', affectedZones: ['https://api.weather.gov/zones/forecast/MIZ099']}}]};
  assert.equal(matchAlerts(elsewhere.features, agate).length, 0);
});

test('rough open-lake waves headed at the beach mean stay off; waves headed elsewhere do not', () => {
  const sid = agate.waveStations[0].id;
  const rough = mwd => ({[sid]: {t: NOW - 1800, wvhtM: 3.2, dpdS: 8, mwdDeg: mwd}});
  assert.equal(assessSite(agate, {hourly: hourly(blowThenCalm), alerts: null, buoys: rough(345), nowS: NOW}).verdict.code, 'STORM');
  assert.equal(assessSite(agate, {hourly: hourly(blowThenCalm), alerts: null, buoys: rough(160), nowS: NOW}).verdict.code, 'PRIME');
  const stale = {[sid]: {t: NOW - 5 * 3600, wvhtM: 3.2, mwdDeg: 345}};
  assert.equal(assessSite(agate, {hourly: hourly(blowThenCalm), alerts: null, buoys: stale, nowS: NOW}).buoy, null);
});

test('moderate onshore wind right now reads as building, not quiet', () => {
  const r = assessSite(agate, {hourly: hourly(i => i < -3 ? [6, 200] : [18, agate.shore.facesDeg]), alerts: null, buoys: {}, nowS: NOW});
  assert.equal(r.verdict.code, 'BUILDING');
});

test('a forecast blow produces the next after-storm window', () => {
  const r = assessSite(agate, {hourly: hourly(i => i > 4 && i < 26 ? [32, agate.shore.facesDeg] : [7, 200]), alerts: null, buoys: {}, nowS: NOW});
  assert.equal(r.verdict.code, 'QUIET');
  assert.ok(r.nextWindow && r.nextWindow.t > NOW + 20 * 3600);
});

test('missing wind is unavailable, never a middling score; the quarry ignores waves', () => {
  assert.equal(assessSite(agate, {hourly: null, alerts: null, buoys: {}, nowS: NOW}).verdict.code, 'UNAVAILABLE');
  const old = hourly(blowThenCalm); old.time = old.time.map(t => t - 10 * 3600 * 24);
  assert.equal(assessSite(agate, {hourly: old, alerts: null, buoys: {}, nowS: NOW}).verdict.code, 'UNAVAILABLE');
  const q = assessSite(site('rockport-state-recreation-area'), {hourly: hourly(() => [30, 0]), alerts: null, buoys: {}, nowS: NOW});
  assert.equal(q.verdict.code, 'ANYTIME');
});

test('notes: wet stones after rain, shelf ice in a cold winter', () => {
  const wet = assessSite(agate, {hourly: hourly(blowThenCalm, {rain: i => i === -1 ? 0.05 : 0}), alerts: null, buoys: {}, nowS: NOW});
  assert.ok(wet.notes.some(n => n.code === 'WET'));
  const jan = Date.UTC(2027, 0, 10, 18) / 1000;
  const h = hourly(blowThenCalm, {temp: 15}); h.time = h.time.map(t => t - NOW + jan);
  assert.ok(assessSite(agate, {hourly: h, alerts: null, buoys: {}, nowS: jan}).notes.some(n => n.code === 'ICE'));
});

test('NDBC latest observations parse wave height, period and direction', () => {
  const txt = '#STN LAT LON YYYY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES\n#text\n45211 46.973 -86.568 2026 10 16 17 56 MM MM MM 3.5 8 6.4 348 MM MM MM 12.0 MM MM MM\n45002 45.344 -86.411 2026 10 16 17 40 340 13.0 15.0 MM MM MM MM MM MM MM MM MM MM MM';
  const b = parseLatestObs(txt);
  assert.equal(b['45211'].wvhtM, 3.5);
  assert.equal(b['45211'].mwdDeg, 348);
  assert.equal(b['45002'].wvhtM, null);
});

test('API: three keyless upstream calls, noindex header, ranked output, graceful when wind is down', async () => {
  const calls = [];
  const fetchFn = async url => {
    calls.push(String(url));
    if (url.includes('open-meteo')) return {ok: true, json: async () => doc.sites.map(() => ({hourly: hourly(blowThenCalm), daily: {sunrise: [NOW + 3600]}}))};
    if (url.includes('ndbc')) return {ok: true, text: async () => '#h\n'};
    return {ok: true, json: async () => ({features: []})};
  };
  const r = await handler._test.report({fetchFn, now: NOW * 1000});
  assert.equal(calls.length, 3);
  assert.ok(calls[0].includes('past_days=3') && calls[0].split('latitude=')[1].split('&')[0].split('%2C').length === 15);
  assert.equal(r.sites.length, 15);
  assert.equal(r.ranked.length, 15);
  assert.equal(r.sites.find(s => s.id === r.ranked[0]).verdict.code, 'PRIME');
  const down = await handler._test.report({fetchFn: async url => { if (url.includes('open-meteo')) throw new Error('x'); return fetchFn(url); }, now: NOW * 1000});
  assert.equal(down.sources.wind.status, 'unavailable');
  assert.ok(down.sites.filter(s => !doc.sites.find(d => d.id === s.id).inland).every(s => s.verdict.code === 'UNAVAILABLE'));

  const headers = {}; let status;
  const res = {setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, status(c) { status = c; return this; }, json() {}, end() {}};
  await handler({method: 'POST'}, res);
  assert.equal(status, 405);
  assert.equal(headers['x-robots-tag'], 'noindex, nofollow');
});

test('page: every beach is in the static HTML with its rule, plus FAQ schema, canonical and no em dashes', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/michigan-rockhounding/index.html'), 'utf8');
  for (const s of doc.sites) assert.ok(html.includes(`id="${s.id}" data-site="${s.id}"`), s.id);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski.com\/michigan-rockhounding\/">/);
  assert.ok(html.includes('"FAQPage"'));
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => JSON.parse(ld));
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.ok(title.length <= 60 && title.includes('Chris Izworski'));
  for (const f of ['public/michigan-rockhounding/index.html', 'public/assets/michigan-rockhounding.js', 'public/assets/michigan-rockhounding.css', 'lib/rockhounding/hunt-conditions.cjs', 'data/rockhounding/michigan-hunt-sites.json']) {
    assert.ok(!fs.readFileSync(path.join(__dirname, '..', f), 'utf8').includes('—'), 'no em dash in ' + f);
  }
});
