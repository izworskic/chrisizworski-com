const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const api = require('../api/flight-tracker.js')._test;
const html = fs.readFileSync(path.join(root,'public','flight-tracker','index.html'),'utf8');
const client = fs.readFileSync(path.join(root,'public','assets','flight-tracker.js'),'utf8');

test('passenger flight numbers normalize only to direct unambiguous operating callsigns', () => {
  const delta = api.normalizeFlightInput('dl 1234');
  assert.equal(delta.ok, true);
  assert.equal(delta.display, 'DL1234');
  assert.deepEqual(delta.callsigns, ['DAL1234']);

  const american = api.normalizeFlightInput('AA86');
  assert.equal(american.callsigns[0], 'AAL86');


  const raw = api.normalizeFlightInput('UAL2380');
  assert.equal(raw.ok, true);
  assert.deepEqual(raw.callsigns, ['UAL2380']);
});

test('unknown airline and malformed flight numbers fail closed', () => {
  assert.equal(api.normalizeFlightInput('ZZ123').ok, false);
  assert.equal(api.normalizeFlightInput('1234').ok, false);
  assert.equal(api.normalizeFlightInput('').ok, false);
});

test('aircraft sanitizer requires an actual reported position', () => {
  assert.equal(api.sanitizeAircraft({flight:'DAL1',alt_baro:33000},'DAL1'), null);
  const plane = api.sanitizeAircraft({
    flight:'DAL1 ',
    hex:'a12345',
    lat:42.1,
    lon:-84.2,
    alt_baro:33000,
    gs:452.4,
    track:181.2,
    seen_pos:3.6,
    r:'N123DN',
    t:'A321'
  },'DAL1');
  assert.equal(plane.callsign,'DAL1');
  assert.equal(plane.lat,42.1);
  assert.equal(plane.lon,-84.2);
  assert.equal(plane.altitudeFeet,33000);
  assert.equal(plane.positionAgeSeconds,3.6);
});


test('route plausibility rejects grossly wrong airport pairs without hiding normal corridor progress', () => {
  const jfk = {lat:40.639801,lon:-73.7789};
  const lhr = {lat:51.4706,lon:-0.461941};
  const connecticut = {lat:41.57,lon:-72.64};
  const losAngeles = {lat:34.05,lon:-118.24};
  assert.equal(api.routeLooksPlausible(connecticut,jfk,lhr),true);
  assert.equal(api.routeLooksPlausible(losAngeles,jfk,lhr),false);
});

test('resolver never guesses when multiple live candidates remain', () => {
  const one = api.chooseUnique([{callsign:'DAL123',positionAgeSeconds:2},null]);
  assert.equal(one.status,'unique');
  assert.equal(one.aircraft.callsign,'DAL123');

  const ambiguous = api.chooseUnique([
    {callsign:'DAL123',positionAgeSeconds:3},
    {callsign:'EDV123',positionAgeSeconds:4}
  ]);
  assert.equal(ambiguous.status,'ambiguous');
  assert.equal(ambiguous.aircraft,null);
});

test('page is flight number to plane map without dashboard creep', () => {
  assert.match(html, /<h1 id="page-title">Where's My Plane\?<\/h1>/);
  assert.match(html, /id="flight-number"/);
  assert.match(html, /id="flight-map"/);
  assert.match(html, /Actual reports only/);
  assert.match(html, /ADSB\.lol/);
  assert.doesNotMatch(html, /delay prediction|weather score|airport dashboard|recommendation score/i);
});


test('browser loader uses the supported MapLibre ESM bundle instead of the missing classic bundle', () => {
  assert.doesNotMatch(html, /maplibre-gl@6\.3\.0\/dist\/maplibre-gl\.js/);
  assert.match(html, /flight-tracker\.js\?v=20261006b/);
  assert.match(client, /import\('https:\/\/cdn\.jsdelivr\.net\/npm\/maplibre-gl@6\.3\.0\/dist\/maplibre-gl\.mjs'\)/);
  assert.match(client, /The flight map could not load/);
});

test('client plots only API positions and refreshes without simulated motion', () => {
  assert.match(client, /planeMarker\.setLngLat\(\[ac\.lon,ac\.lat\]\)/);
  assert.match(client, /setInterval\(\(\) => \{/);
  assert.match(client, /10000/);
  assert.doesNotMatch(client, /requestAnimationFrame/);
  assert.doesNotMatch(client, /interpolate.*aircraft|estimated position/i);
});

test('flight API uses ADSB.lol callsign and route sources with API noindex', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(source, /api\.adsb\.lol/);
  assert.match(source, /\/v2\/callsign\//);
  assert.match(source, /vrs-standing-data\.adsb\.lol\/routes/);
  assert.match(source, /X-Robots-Tag/);
  assert.match(source, /s-maxage=/);
  assert.match(source, /ODbL 1\.0/);
  assert.match(source, /CC0 1\.0/);
});

test('flight tracker SEO contract remains concise and canonical', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  assert.ok(title.length <= 60, 'title exceeds 60 characters');
  assert.ok(description.length <= 158, 'description exceeds 158 characters');
  assert.match(html, /https:\/\/chrisizworski\.com\/flight-tracker\//);
  assert.match(html, /"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(html, /"dateModified":"2026-10-06"/);
});
